import { calculateQuote, nightsBetween, type AvailabilityQuery, type AvailabilityResponse, type AvailabilityResult } from '@eden/shared';
import type { AppContext } from '../../context.js';
import { fromDbError } from '../../lib/errors.js';
import { listActiveRooms } from '../rooms/rooms.service.js';
import { getSetting } from '../settings/settings.service.js';

/**
 * Availability is always computed in the database (room_availability), never
 * trusted from the browser. Prices come from room_types.base_price.
 */
export async function checkAvailability(ctx: AppContext, q: AvailabilityQuery): Promise<AvailabilityResponse> {
  const [rooms, availability, policy] = await Promise.all([
    listActiveRooms(ctx),
    ctx.db.rpc('room_availability', { p_check_in: q.checkIn, p_check_out: q.checkOut }),
    getSetting(ctx, 'booking_policy'),
  ]);
  if (availability.error) throw fromDbError(availability.error);

  const freeByRoom = new Map(
    (availability.data as { room_type_id: string; available_rooms: number }[]).map((r) => [r.room_type_id, r.available_rooms]),
  );
  const nights = nightsBetween(q.checkIn, q.checkOut);
  const taxRatePercent = policy?.taxRatePercent ?? 0;

  const results: AvailabilityResult[] = rooms.map((room) => {
    const availableRooms = freeByRoom.get(room.id) ?? 0;
    const fitsParty =
      q.adults <= room.maxAdults * q.rooms &&
      q.children <= room.maxChildren * q.rooms &&
      q.adults + q.children <= room.maxOccupancy * q.rooms;
    const unavailableReason = !fitsParty ? 'occupancy' : availableRooms < q.rooms ? 'sold_out' : null;
    return {
      room,
      availableRooms,
      fitsParty,
      unavailableReason,
      quote: unavailableReason
        ? null
        : calculateQuote({ nightlyRate: room.basePrice, nights, rooms: q.rooms, taxRatePercent }),
    };
  });

  // Bookable rooms first, then by configured order.
  results.sort((a, b) => Number(a.unavailableReason !== null) - Number(b.unavailableReason !== null));

  return { checkIn: q.checkIn, checkOut: q.checkOut, nights, adults: q.adults, children: q.children, rooms: q.rooms, results };
}
