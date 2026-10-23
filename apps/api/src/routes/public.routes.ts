import { Router } from 'express';
import { availabilityQuerySchema, bookingLookupSchema, bookingRequestSchema, enquirySchema } from '@eden/shared';
import type { AppContext } from '../context.js';
import { AppError } from '../lib/errors.js';
import { body, query, send } from '../lib/http.js';
import type { createRateLimiters } from '../middleware/rate-limit.js';
import { checkAvailability } from '../modules/availability/availability.service.js';
import { createBooking, lookupBooking } from '../modules/bookings/bookings.service.js';
import { createEnquiry } from '../modules/enquiries/enquiries.service.js';
import { listPublishedGallery } from '../modules/gallery/gallery.service.js';
import { getActiveRoomBySlug, listActiveRooms } from '../modules/rooms/rooms.service.js';
import { getPublicSettings } from '../modules/settings/settings.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function publicRoutes(ctx: AppContext, limiters: ReturnType<typeof createRateLimiters>) {
  const r = Router();

  r.get('/health', async (_req, res) => {
    const { error } = await ctx.db.from('room_types').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) throw new AppError(503, 'UNAVAILABLE', 'Database unavailable');
    send(res, { status: 'ok', time: new Date().toISOString() });
  });

  r.get('/rooms', limiters.publicRead, async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    send(res, await listActiveRooms(ctx));
  });

  r.get('/rooms/:slug', limiters.publicRead, async (req, res) => {
    const slug = String(req.params.slug);
    if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw new AppError(404, 'NOT_FOUND', 'Room not found');
    res.set('Cache-Control', 'public, max-age=60');
    send(res, await getActiveRoomBySlug(ctx, slug));
  });

  r.get('/availability', limiters.publicRead, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    send(res, await checkAvailability(ctx, query(req, availabilityQuerySchema)));
  });

  r.post('/bookings', limiters.submissions, async (req, res) => {
    const key = req.get('Idempotency-Key');
    if (!key || !UUID.test(key)) {
      throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header (UUID) is required');
    }
    const input = body(req, bookingRequestSchema);
    const result = await createBooking(ctx, input, key.toLowerCase());
    res.set('Cache-Control', 'no-store');
    send(res, result, result.replayed ? 200 : 201);
  });

  r.get('/bookings/lookup', limiters.lookups, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const parsed = bookingLookupSchema.safeParse(req.query);
    // Malformed lookups get the same generic answer as wrong ones.
    if (!parsed.success) throw new AppError(404, 'BOOKING_NOT_FOUND', "We couldn't find a booking with those details.");
    send(res, await lookupBooking(ctx, parsed.data));
  });

  r.post('/enquiries', limiters.submissions, async (req, res) => {
    const input = body(req, enquirySchema);
    if (input.website) {
      // Honeypot filled: pretend success, store nothing.
      send(res, { received: true }, 201);
      return;
    }
    await createEnquiry(ctx, input);
    send(res, { received: true }, 201);
  });

  r.get('/site-settings', limiters.publicRead, async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    send(res, await getPublicSettings(ctx));
  });

  r.get('/gallery', limiters.publicRead, async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    send(res, await listPublishedGallery(ctx));
  });

  return r;
}
