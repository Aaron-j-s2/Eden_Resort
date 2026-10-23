import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type AdminBookingDetail,
  type AdminBookingListQuery,
  type AdminBookingRow,
  type BookingStatus,
  type Paginated,
} from '@eden/shared';
import type { AppContext } from '../../context.js';
import { fromDbError, notFound } from '../../lib/errors.js';
import { sanitizeSearch } from '../../lib/http.js';
import { money, toAdminBookingRow, type BookingOverviewRow } from '../../lib/mappers.js';
import { displayNames } from '../auth/staff-names.js';

const SORT_COLUMNS: Record<AdminBookingListQuery['sort'], string> = {
  created_at: 'created_at',
  check_in: 'check_in',
  check_out: 'check_out',
  total_amount: 'total_amount',
  guest_name: 'guest_name',
};

function filteredQuery(ctx: AppContext, q: Omit<AdminBookingListQuery, 'page' | 'pageSize'>, count: boolean) {
  let query = ctx.db.from('booking_overview').select('*', count ? { count: 'exact' } : undefined);
  const search = sanitizeSearch(q.q);
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `public_reference.ilike.${term},guest_name.ilike.${term},guest_phone.ilike.${term.replace(/\s+/g, '')}`,
    );
  }
  if (q.status) query = query.eq('booking_status', q.status);
  if (q.from) query = query.gte(q.dateField, q.from);
  if (q.to) query = q.dateField === 'created_at' ? query.lt(q.dateField, `${q.to}T23:59:59.999+05:30`) : query.lte(q.dateField, q.to);
  return query
    .order(SORT_COLUMNS[q.sort], { ascending: q.order === 'asc' })
    .order('created_at', { ascending: false });
}

export async function listBookings(ctx: AppContext, q: AdminBookingListQuery): Promise<Paginated<AdminBookingRow>> {
  const fromIdx = (q.page - 1) * q.pageSize;
  const { data, error, count } = await filteredQuery(ctx, q, true).range(fromIdx, fromIdx + q.pageSize - 1);
  if (error) throw fromDbError(error);
  return {
    items: (data as BookingOverviewRow[]).map(toAdminBookingRow),
    page: q.page,
    pageSize: q.pageSize,
    total: count ?? 0,
  };
}

const CSV_LIMIT = 5000;

function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function exportBookingsCsv(ctx: AppContext, q: AdminBookingListQuery, actorId: string): Promise<string> {
  const { data, error } = await filteredQuery(ctx, q, false).limit(CSV_LIMIT);
  if (error) throw fromDbError(error);
  const rows = (data as BookingOverviewRow[]).map(toAdminBookingRow);
  const header = [
    'Reference', 'Guest name', 'Phone', 'Email', 'Room', 'Check-in', 'Check-out', 'Nights',
    'Adults', 'Children', 'Rooms', 'Total (INR)', 'Payment status', 'Booking status', 'Created at',
  ];
  const lines = rows.map((r) =>
    [
      r.reference, r.guestName, r.guestPhone, r.guestEmail, r.roomNames, r.checkIn, r.checkOut, r.nights,
      r.adults, r.children, r.rooms, r.totalAmount, PAYMENT_STATUS_LABELS[r.paymentStatus],
      BOOKING_STATUS_LABELS[r.status], r.createdAt,
    ]
      .map(csvCell)
      .join(','),
  );
  await ctx.db.rpc('write_audit', {
    p_actor: actorId,
    p_action: 'bookings.exported',
    p_entity_type: 'booking',
    p_entity_id: null,
    p_details: { rows: rows.length, filters: { ...q, page: undefined, pageSize: undefined } },
  });
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}\r\n`;
}

interface DetailRow {
  special_requests: string | null;
  subtotal: string | number;
  taxes: string | number;
  currency: string;
  source: string;
  booking_items: {
    room_type_id: string;
    quantity: number;
    nightly_rate: string | number;
    number_of_nights: number;
    line_total: string | number;
    room_types: { name: string } | null;
  }[];
  booking_status_history: {
    id: string;
    previous_status: BookingStatus | null;
    new_status: BookingStatus;
    changed_by: string | null;
    note: string | null;
    created_at: string;
  }[];
  booking_notes: { id: string; note: string; author_id: string | null; created_at: string }[];
  payments: {
    id: string;
    provider: string;
    amount: string | number;
    payment_status: AdminBookingDetail['paymentStatus'];
    verified_at: string | null;
    created_at: string;
  }[];
}

export async function getBookingDetail(ctx: AppContext, id: string): Promise<AdminBookingDetail> {
  const [overview, detail] = await Promise.all([
    ctx.db.from('booking_overview').select('*').eq('id', id).maybeSingle(),
    ctx.db
      .from('bookings')
      .select(`
        special_requests, subtotal, taxes, currency, source,
        booking_items ( room_type_id, quantity, nightly_rate, number_of_nights, line_total, room_types ( name ) ),
        booking_status_history ( id, previous_status, new_status, changed_by, note, created_at ),
        booking_notes ( id, note, author_id, created_at ),
        payments ( id, provider, amount, payment_status, verified_at, created_at )
      `)
      .eq('id', id)
      .maybeSingle(),
  ]);
  if (overview.error) throw fromDbError(overview.error);
  if (detail.error) throw fromDbError(detail.error);
  if (!overview.data || !detail.data) throw notFound('Booking');

  const d = detail.data as unknown as DetailRow;
  const names = await displayNames(ctx, [
    ...d.booking_status_history.map((h) => h.changed_by),
    ...d.booking_notes.map((n) => n.author_id),
  ]);

  return {
    ...toAdminBookingRow(overview.data as BookingOverviewRow),
    specialRequests: d.special_requests,
    subtotal: money(d.subtotal),
    taxes: money(d.taxes),
    currency: d.currency,
    source: d.source,
    items: d.booking_items.map((i) => ({
      roomTypeId: i.room_type_id,
      roomName: i.room_types?.name ?? 'Room',
      quantity: i.quantity,
      nightlyRate: money(i.nightly_rate),
      nights: i.number_of_nights,
      lineTotal: money(i.line_total),
    })),
    history: d.booking_status_history
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((h) => ({
        id: h.id,
        previousStatus: h.previous_status,
        newStatus: h.new_status,
        changedByName: h.changed_by ? (names.get(h.changed_by) ?? 'Staff') : null,
        note: h.note,
        createdAt: h.created_at,
      })),
    notes: d.booking_notes
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((n) => ({
        id: n.id,
        note: n.note,
        authorName: n.author_id ? (names.get(n.author_id) ?? 'Staff') : null,
        createdAt: n.created_at,
      })),
    payments: d.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      amount: money(p.amount),
      status: p.payment_status,
      verifiedAt: p.verified_at,
      createdAt: p.created_at,
    })),
  };
}

export async function changeBookingStatus(
  ctx: AppContext,
  id: string,
  status: BookingStatus,
  actorId: string,
  note?: string,
) {
  const { error } = await ctx.db.rpc('update_booking_status', {
    p_booking_id: id,
    p_new_status: status,
    p_actor: actorId,
    p_note: note ?? null,
  });
  if (error) throw fromDbError(error);
  return getBookingDetail(ctx, id);
}

export async function addBookingNote(ctx: AppContext, id: string, note: string, actorId: string) {
  const { error } = await ctx.db.from('booking_notes').insert({ booking_id: id, note, author_id: actorId });
  if (error) {
    if (error.code === '23503') throw notFound('Booking');
    throw fromDbError(error);
  }
  return getBookingDetail(ctx, id);
}
