import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import {
  api,
  bookingPayload,
  cleanup,
  createTestRoom,
  createUser,
  db,
  env,
  futureDate,
  postBooking,
  publishableKey,
  setBookingPolicy,
} from './helpers.js';

afterAll(cleanup);

describe('POST /api/bookings — validation', () => {
  it('creates a pending booking with a server-computed quote, ignoring client-sent totals', async () => {
    const room = await createTestRoom({ base_price: '3250.50' });
    const res = await postBooking({
      ...bookingPayload(room.id, { checkIn: futureDate(30), checkOut: futureDate(33) }),
      totalAmount: '1.00',
      subtotal: '1.00',
      paymentStatus: 'paid',
    });
    expect(res.status).toBe(201);
    const { booking, accessToken, replayed } = res.body.data;
    expect(replayed).toBe(false);
    expect(booking.reference).toMatch(/^EF-[A-HJ-NP-Z2-9]{8}$/);
    expect(booking.status).toBe('pending');
    expect(booking.paymentStatus).toBe('unpaid');
    expect(booking.nights).toBe(3);
    expect(booking.subtotal).toBe('9751.50');
    expect(booking.total).toBe('9751.50');
    expect(accessToken).toEqual(expect.any(String));

    const { data } = await db.from('bookings').select('total_amount, payment_status, access_token_hash').eq('public_reference', booking.reference).single();
    expect(Number(data!.total_amount)).toBe(9751.5);
    expect(data!.payment_status).toBe('unpaid');
    expect(data!.access_token_hash).not.toContain(accessToken);
  });

  it('applies the configured tax rate in the database quote', async () => {
    const restore = await setBookingPolicy({ taxRatePercent: 12 });
    try {
      const room = await createTestRoom({ base_price: '3999.99' });
      const res = await postBooking(bookingPayload(room.id, { checkIn: futureDate(30), checkOut: futureDate(33), rooms: 2, adults: 2 }));
      expect(res.status).toBe(201);
      expect(res.body.data.booking).toMatchObject({ subtotal: '23999.94', taxes: '2879.99', total: '26879.93' });

      const avail = await api().get('/api/availability').query({ checkIn: futureDate(30), checkOut: futureDate(33), adults: 2, rooms: 2 });
      const quote = avail.body.data.results.find((r: { room: { id: string } }) => r.room.id === room.id);
      // Inventory is 2 and both are now held by the pending booking.
      expect(quote.unavailableReason).toBe('sold_out');
    } finally {
      await restore();
    }
  });

  it('rejects check-out on or before check-in', async () => {
    const room = await createTestRoom();
    const res = await postBooking(bookingPayload(room.id, { checkIn: futureDate(10), checkOut: futureDate(10) }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects past dates', async () => {
    const room = await createTestRoom();
    const res = await postBooking(bookingPayload(room.id, { checkIn: futureDate(-2), checkOut: futureDate(1) }));
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body.error.details)).toContain('past');
  });

  it('rejects parties larger than the room allows', async () => {
    const room = await createTestRoom({ max_adults: 2, max_children: 1, max_occupancy: 3 });
    const res = await postBooking(bookingPayload(room.id, { adults: 3, children: 0 }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OCCUPANCY_EXCEEDED');
  });

  it('requires guest details', async () => {
    const room = await createTestRoom();
    const res = await postBooking(bookingPayload(room.id, { guest: { fullName: '', phone: '123', email: 'nope' } }));
    expect(res.status).toBe(422);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['guest.fullName', 'guest.phone', 'guest.email']));
  });

  it('requires an Idempotency-Key header', async () => {
    const room = await createTestRoom();
    const res = await api().post('/api/bookings').send(bookingPayload(room.id));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('rejects inactive rooms', async () => {
    const room = await createTestRoom({ is_active: false });
    const res = await postBooking(bookingPayload(room.id));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
  });
});

describe('inventory', () => {
  it('prevents overbooking when inventory is exhausted for any night', async () => {
    const room = await createTestRoom({ inventory_count: 2 });
    expect((await postBooking(bookingPayload(room.id, { checkIn: futureDate(50), checkOut: futureDate(53) }))).status).toBe(201);
    expect((await postBooking(bookingPayload(room.id, { checkIn: futureDate(52), checkOut: futureDate(54) }))).status).toBe(201);
    // Night 52 is now full; a stay touching it must fail even though night 53 is free.
    const res = await postBooking(bookingPayload(room.id, { checkIn: futureDate(51), checkOut: futureDate(53) }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_AVAILABLE');
    // A stay that starts on the check-out day of the first booking is fine.
    expect((await postBooking(bookingPayload(room.id, { checkIn: futureDate(53), checkOut: futureDate(55) }))).status).toBe(201);
  });

  it('checks every requested room on every night', async () => {
    const room = await createTestRoom({ inventory_count: 3 });
    expect((await postBooking(bookingPayload(room.id, { rooms: 2, adults: 2 }))).status).toBe(201);
    const res = await postBooking(bookingPayload(room.id, { rooms: 2, adults: 2 }));
    expect(res.status).toBe(409);
  });

  it('releases inventory when a booking is cancelled', async () => {
    const { token } = await createUser('admin');
    const room = await createTestRoom({ inventory_count: 1 });
    const first = await postBooking(bookingPayload(room.id));
    expect(first.status).toBe(201);
    expect((await postBooking(bookingPayload(room.id))).status).toBe(409);

    const { data } = await db.from('bookings').select('id').eq('public_reference', first.body.data.booking.reference).single();
    const cancel = await api()
      .patch(`/api/admin/bookings/${data!.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled', note: 'Guest changed plans' });
    expect(cancel.status).toBe(200);

    expect((await postBooking(bookingPayload(room.id))).status).toBe(201);
  });

  it('confirmed bookings consume inventory even when pending requests do not', async () => {
    const restore = await setBookingPolicy({ pendingHoldsInventory: false });
    try {
      const { token } = await createUser('admin');
      const room = await createTestRoom({ inventory_count: 1 });
      const a = await postBooking(bookingPayload(room.id));
      const b = await postBooking(bookingPayload(room.id));
      // With this policy, two pending requests can coexist for the last room.
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);

      const ids = await Promise.all(
        [a, b].map(async (r) => (await db.from('bookings').select('id').eq('public_reference', r.body.data.booking.reference).single()).data!.id as string),
      );
      const confirmA = await api().patch(`/api/admin/bookings/${ids[0]}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'confirmed' });
      expect(confirmA.status).toBe(200);
      const confirmB = await api().patch(`/api/admin/bookings/${ids[1]}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'confirmed' });
      expect(confirmB.status).toBe(409);
      expect(confirmB.body.error.code).toBe('NOT_AVAILABLE');
      // New requests are refused once the room is confirmed.
      expect((await postBooking(bookingPayload(room.id))).status).toBe(409);
    } finally {
      await restore();
    }
  });

  it('is safe under concurrent booking attempts for the last rooms', async () => {
    const room = await createTestRoom({ inventory_count: 3 });
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () => postBooking(bookingPayload(room.id, { checkIn: futureDate(70), checkOut: futureDate(72) }))),
    );
    const statuses = attempts.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(3);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);

    const { data } = await db.rpc('room_nightly_usage', { p_room_type_id: room.id, p_from: futureDate(70), p_to: futureDate(72) });
    for (const night of data as { rooms_used: number }[]) expect(night.rooms_used).toBe(3);
  });
});

describe('idempotency', () => {
  it('returns the original booking for a retried submission', async () => {
    const room = await createTestRoom({ inventory_count: 5 });
    const payload = bookingPayload(room.id);
    const key = randomUUID();
    const first = await postBooking(payload, key);
    const second = await postBooking(payload, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.replayed).toBe(true);
    expect(second.body.data.booking.reference).toBe(first.body.data.booking.reference);
    expect(second.body.data.accessToken).toBe(first.body.data.accessToken);

    const { count } = await db.from('bookings').select('id', { count: 'exact', head: true }).eq('idempotency_key', key);
    expect(count).toBe(1);
  });

  it('collapses concurrent duplicates into one booking', async () => {
    const room = await createTestRoom({ inventory_count: 5 });
    const payload = bookingPayload(room.id);
    const key = randomUUID();
    const results = await Promise.all([postBooking(payload, key), postBooking(payload, key), postBooking(payload, key)]);
    const refs = new Set(results.map((r) => r.body.data.booking.reference));
    expect(refs.size).toBe(1);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
  });

  it('rejects reuse of a key with a different payload', async () => {
    const room = await createTestRoom({ inventory_count: 5 });
    const key = randomUUID();
    expect((await postBooking(bookingPayload(room.id), key)).status).toBe(201);
    const res = await postBooking(bookingPayload(room.id, { adults: 1 }), key);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
});

describe('guest lookup and privacy', () => {
  it('lets the guest reopen the booking with token or phone, and nothing else', async () => {
    const room = await createTestRoom();
    const payload = bookingPayload(room.id);
    const created = await postBooking(payload);
    const { reference } = created.body.data.booking;

    const byToken = await api().get('/api/bookings/lookup').query({ reference, token: created.body.data.accessToken });
    expect(byToken.status).toBe(200);
    expect(byToken.body.data.reference).toBe(reference);

    const byPhone = await api().get('/api/bookings/lookup').query({ reference, phone: payload.guest.phone });
    expect(byPhone.status).toBe(200);

    const wrongToken = await api().get('/api/bookings/lookup').query({ reference, token: 'x'.repeat(43) });
    const wrongPhone = await api().get('/api/bookings/lookup').query({ reference, phone: '+919000000000' });
    const unknownRef = await api().get('/api/bookings/lookup').query({ reference: 'EF-AAAAAAAA', phone: payload.guest.phone });
    const malformed = await api().get('/api/bookings/lookup').query({ reference: 'nope' });
    for (const r of [wrongToken, wrongPhone, unknownRef, malformed]) {
      expect(r.status).toBe(404);
      expect(r.body.error.message).toBe("We couldn't find a booking with those details.");
    }
  });

  it('never returns guest contact details from public endpoints', async () => {
    const room = await createTestRoom();
    const payload = bookingPayload(room.id);
    const created = await postBooking(payload);
    const lookup = await api().get('/api/bookings/lookup').query({ reference: created.body.data.booking.reference, token: created.body.data.accessToken });
    for (const body of [JSON.stringify(created.body), JSON.stringify(lookup.body)]) {
      expect(body).not.toContain(payload.guest.phone);
      expect(body).not.toContain(payload.guest.email);
      expect(body).not.toContain('Integration Test Guest');
      expect(body).not.toContain('guest_id');
    }
  });

  it('blocks the public Supabase key from reading private tables', async () => {
    const anon = createClient(env.SUPABASE_URL, publishableKey, { auth: { persistSession: false } });
    for (const table of ['bookings', 'guests', 'enquiries', 'booking_overview', 'payments', 'profiles']) {
      const { data, error } = await anon.from(table).select('*').limit(1);
      expect(error, table).not.toBeNull();
      expect(data, table).toBeNull();
    }
    const rpc = await anon.rpc('create_booking', {});
    expect(rpc.error).not.toBeNull();
    // Public content is still readable.
    const rooms = await anon.from('room_types').select('id').eq('is_active', true);
    expect(rooms.error).toBeNull();
  });

  it('rate-limits booking lookups', async () => {
    const { createApp } = await import('../src/app.js');
    const { default: request } = await import('supertest');
    const limited = createApp({ env, rateLimits: { lookups: 3 } }).app;
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await request(limited).get('/api/bookings/lookup').query({ reference: 'EF-AAAAAAAA', phone: '9000000000' })).status);
    }
    expect(statuses).toEqual([404, 404, 404, 429, 429]);
  });
});
