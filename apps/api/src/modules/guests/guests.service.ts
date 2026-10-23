import type { GuestDetail } from '@eden/shared';
import type { AppContext } from '../../context.js';
import { fromDbError, notFound } from '../../lib/errors.js';
import { toAdminBookingRow, type BookingOverviewRow } from '../../lib/mappers.js';

export async function getGuest(ctx: AppContext, id: string): Promise<GuestDetail> {
  const [guest, bookings] = await Promise.all([
    ctx.db.from('guests').select('id, full_name, phone, email, created_at').eq('id', id).maybeSingle(),
    ctx.db.from('booking_overview').select('*').eq('guest_id', id).order('check_in', { ascending: false }).limit(100),
  ]);
  if (guest.error) throw fromDbError(guest.error);
  if (bookings.error) throw fromDbError(bookings.error);
  if (!guest.data) throw notFound('Guest');
  const g = guest.data as { id: string; full_name: string; phone: string; email: string | null; created_at: string };
  return {
    id: g.id,
    fullName: g.full_name,
    phone: g.phone,
    email: g.email,
    createdAt: g.created_at,
    bookings: (bookings.data as BookingOverviewRow[]).map(toAdminBookingRow),
  };
}
