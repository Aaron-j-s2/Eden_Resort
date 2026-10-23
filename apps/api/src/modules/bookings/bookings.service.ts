import {
  formatINR,
  nightsBetween,
  type BookingLookup,
  type BookingRequest,
  type CreateBookingResponse,
  type PublicBookingSummary,
} from '@eden/shared';
import type { AppContext } from '../../context.js';
import { AppError, fromDbError } from '../../lib/errors.js';
import { money } from '../../lib/mappers.js';
import { deriveAccessToken, hashToken, requestFingerprint, tokenMatches } from './booking-tokens.js';

interface PublicBookingRow {
  id: string;
  public_reference: string;
  access_token_hash: string;
  contact_name: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  number_of_rooms: number;
  subtotal: string | number;
  taxes: string | number;
  total_amount: string | number;
  currency: string;
  booking_status: PublicBookingSummary['status'];
  payment_status: PublicBookingSummary['paymentStatus'];
  created_at: string;
  guests: { phone: string } | null;
  booking_items: { quantity: number; room_types: { name: string } | null }[];
}

const PUBLIC_BOOKING_SELECT = `
  id, public_reference, access_token_hash, contact_name, check_in, check_out, adults, children,
  number_of_rooms, subtotal, taxes, total_amount, currency, booking_status, payment_status, created_at,
  guests ( phone ),
  booking_items ( quantity, room_types ( name ) )
`;

/** Only what a guest needs to see. No phone, email or internal identifiers. */
function toPublicSummary(row: PublicBookingRow): PublicBookingSummary {
  return {
    reference: row.public_reference,
    status: row.booking_status,
    paymentStatus: row.payment_status,
    guestFirstName: row.contact_name.trim().split(/\s+/)[0] ?? '',
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: nightsBetween(row.check_in, row.check_out),
    adults: row.adults,
    children: row.children,
    rooms: row.number_of_rooms,
    roomName: row.booking_items.map((i) => i.room_types?.name ?? 'Room').join(', '),
    subtotal: money(row.subtotal),
    taxes: money(row.taxes),
    total: money(row.total_amount),
    currency: row.currency,
    createdAt: row.created_at,
  };
}

async function loadPublicBooking(ctx: AppContext, column: 'id' | 'public_reference', value: string) {
  const { data, error } = await ctx.db.from('bookings').select(PUBLIC_BOOKING_SELECT).eq(column, value).maybeSingle();
  if (error) throw fromDbError(error);
  return data as PublicBookingRow | null;
}

export async function createBooking(
  ctx: AppContext,
  input: BookingRequest,
  idempotencyKey: string,
): Promise<CreateBookingResponse> {
  const accessToken = deriveAccessToken(ctx.env.BOOKING_LOOKUP_SECRET, idempotencyKey);
  const { guest } = input;

  // Prices, totals and availability are computed inside create_booking — nothing
  // monetary is accepted from the client.
  const { data, error } = await ctx.db.rpc('create_booking', {
    p_idempotency_key: idempotencyKey,
    p_fingerprint: requestFingerprint(input),
    p_access_token_hash: hashToken(accessToken),
    p_room_type_id: input.roomTypeId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_adults: input.adults,
    p_children: input.children,
    p_rooms: input.rooms,
    p_full_name: guest.fullName,
    p_phone: guest.phone,
    p_email: guest.email,
    p_special_requests: guest.specialRequests ?? null,
  });
  if (error) throw fromDbError(error, 'We could not save your request. Please try again or call us.');

  const result = data as { booking_id: string; replayed: boolean };
  const row = await loadPublicBooking(ctx, 'id', result.booking_id);
  if (!row) throw new AppError(500, 'INTERNAL_ERROR', 'Booking was created but could not be loaded.');
  const booking = toPublicSummary(row);

  if (!result.replayed) {
    ctx.logger.info({ reference: booking.reference }, 'Booking request created');
    ctx.notifier.notifyStaff('booking', {
      subject: `New reservation request ${booking.reference}`,
      text:
        `${booking.roomName} · ${booking.checkIn} → ${booking.checkOut} (${booking.nights} nights)\n` +
        `${booking.adults} adults, ${booking.children} children, ${booking.rooms} room(s)\n` +
        `Quoted total ${formatINR(booking.total)}\n\nOpen the admin dashboard to review guest details.`,
    });
  }

  return { booking, accessToken, replayed: result.replayed };
}

/**
 * Guest self-service lookup. Requires the booking reference plus either the
 * confirmation token or the phone number used to book. Every failure returns
 * the same generic 404 so references cannot be enumerated.
 */
export async function lookupBooking(ctx: AppContext, lookup: BookingLookup): Promise<PublicBookingSummary> {
  const generic = new AppError(404, 'BOOKING_NOT_FOUND', "We couldn't find a booking with those details.");
  const row = await loadPublicBooking(ctx, 'public_reference', lookup.reference);
  if (!row) throw generic;

  const matches =
    'token' in lookup ? tokenMatches(lookup.token, row.access_token_hash) : row.guests?.phone === lookup.phone;
  if (!matches) throw generic;
  return toPublicSummary(row);
}
