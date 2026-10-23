import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { api, bookingPayload, cleanup, createTestRoom, createUser, db, env, futureDate, postBooking } from './helpers.js';

let adminToken = '';
let staffToken = '';
let noProfileToken = '';

beforeAll(async () => {
  const [admin, staff, noProfile] = await Promise.all([createUser('admin'), createUser('staff'), createUser(null)]);
  adminToken = admin.token;
  staffToken = staff.token;
  noProfileToken = noProfile.token;
});
afterAll(cleanup);

const as = (token: string) => ({ Authorization: `Bearer ${token}` });

async function bookingId(reference: string) {
  const { data } = await db.from('bookings').select('id').eq('public_reference', reference).single();
  return data!.id as string;
}

describe('admin authorisation', () => {
  it('rejects requests without a valid session', async () => {
    for (const path of ['/api/admin/dashboard', '/api/admin/bookings', '/api/admin/enquiries', '/api/admin/settings']) {
      expect((await api().get(path)).status, path).toBe(401);
      expect((await api().get(path).set('Authorization', 'Bearer not-a-real-token')).status, path).toBe(401);
    }
  });

  it('rejects signed-in users without a staff profile', async () => {
    const res = await api().get('/api/admin/bookings').set(as(noProfileToken));
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('guest');
  });

  it('limits staff to operations, admins to configuration', async () => {
    expect((await api().get('/api/admin/bookings').set(as(staffToken))).status).toBe(200);
    expect((await api().get('/api/admin/settings').set(as(staffToken))).status).toBe(403);
    const room = await createTestRoom();
    const patch = await api()
      .patch(`/api/admin/room-types/${room.id}`)
      .set(as(staffToken))
      .send({ name: 'x', slug: room.slug, basePrice: '1', maxAdults: 1, maxChildren: 0, maxOccupancy: 1, inventoryCount: 1 });
    expect(patch.status).toBe(403);
    expect((await api().get('/api/admin/settings').set(as(adminToken))).status).toBe(200);
  });

  it('enforces ADMIN_EMAIL_ALLOWLIST when configured', async () => {
    const locked = createApp({ env: { ...env, ADMIN_EMAIL_ALLOWLIST: ['owner@edenfalls.example'] } }).app;
    expect((await request(locked).get('/api/admin/dashboard').set(as(adminToken))).status).toBe(403);
  });
});

describe('booking management', () => {
  it('shows new bookings with guest contact details to staff', async () => {
    const room = await createTestRoom();
    const payload = bookingPayload(room.id, { guest: { fullName: 'Meera Krishnan', phone: '9123456780', email: 'meera@example.com', specialRequests: 'Ground floor please' } });
    const created = await postBooking(payload);
    const { reference } = created.body.data.booking;

    const list = await api().get('/api/admin/bookings').query({ q: reference }).set(as(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.items[0]).toMatchObject({
      reference,
      guestName: 'Meera Krishnan',
      guestPhone: '+919123456780',
      guestEmail: 'meera@example.com',
      status: 'pending',
    });

    const byPhone = await api().get('/api/admin/bookings').query({ q: '9123456780' }).set(as(adminToken));
    expect(byPhone.body.data.items.map((b: { reference: string }) => b.reference)).toContain(reference);

    const detail = await api().get(`/api/admin/bookings/${await bookingId(reference)}`).set(as(adminToken));
    expect(detail.body.data.specialRequests).toBe('Ground floor please');
    expect(detail.body.data.history).toHaveLength(1);

    const guest = await api().get(`/api/admin/guests/${detail.body.data.guestId}`).set(as(adminToken));
    expect(guest.body.data.bookings.map((b: { reference: string }) => b.reference)).toContain(reference);
  });

  it('allows only documented status transitions and records history', async () => {
    const room = await createTestRoom();
    const created = await postBooking(bookingPayload(room.id));
    const id = await bookingId(created.body.data.booking.reference);
    const patch = (status: string, note?: string) =>
      api().patch(`/api/admin/bookings/${id}/status`).set(as(staffToken)).send({ status, note });

    const invalid = await patch('checked_out');
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_TRANSITION');

    const confirmed = await patch('confirmed', 'Called guest');
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('confirmed');

    // Arrival is in the future, so check-in is refused.
    const early = await patch('checked_in');
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('TOO_EARLY_TO_CHECK_IN');

    expect((await patch('cancelled')).status).toBe(200);
    expect((await patch('confirmed')).status).toBe(409);

    const detail = await api().get(`/api/admin/bookings/${id}`).set(as(staffToken));
    expect(detail.body.data.history.map((h: { newStatus: string }) => h.newStatus)).toEqual(['pending', 'confirmed', 'cancelled']);
    expect(detail.body.data.history[1]).toMatchObject({ note: 'Called guest', changedByName: 'Test staff' });

    // Public lookup reflects the change.
    const lookup = await api().get('/api/bookings/lookup').query({ reference: created.body.data.booking.reference, token: created.body.data.accessToken });
    expect(lookup.body.data.status).toBe('cancelled');
  });

  it('checks a guest in and out on the arrival date', async () => {
    const room = await createTestRoom();
    const created = await postBooking(bookingPayload(room.id, { checkIn: futureDate(0), checkOut: futureDate(1) }));
    expect(created.status).toBe(201);
    const id = await bookingId(created.body.data.booking.reference);
    for (const status of ['confirmed', 'checked_in', 'checked_out']) {
      const res = await api().patch(`/api/admin/bookings/${id}/status`).set(as(adminToken)).send({ status });
      expect(res.status, status).toBe(200);
    }
  });

  it('adds staff notes', async () => {
    const room = await createTestRoom();
    const created = await postBooking(bookingPayload(room.id));
    const id = await bookingId(created.body.data.booking.reference);
    const res = await api().post(`/api/admin/bookings/${id}/notes`).set(as(staffToken)).send({ note: 'Prefers a late arrival' });
    expect(res.status).toBe(201);
    expect(res.body.data.notes[0]).toMatchObject({ note: 'Prefers a late arrival', authorName: 'Test staff' });
    expect((await api().post(`/api/admin/bookings/${id}/notes`).set(as(staffToken)).send({ note: '' })).status).toBe(422);
  });

  it('exports filtered bookings as CSV with formula injection neutralised', async () => {
    const room = await createTestRoom();
    const created = await postBooking(bookingPayload(room.id, { guest: { fullName: '=HYPERLINK("x")', phone: '9988776655', email: 'csv@example.com' } }));
    const res = await api().get('/api/admin/reports/bookings.csv').query({ q: created.body.data.booking.reference }).set(as(adminToken));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain(created.body.data.booking.reference);
    expect(res.text).toContain(`"'=HYPERLINK(""x"")"`);
    expect(res.text.split('\r\n').filter(Boolean)).toHaveLength(2);
  });

  it('paginates and validates list queries', async () => {
    const res = await api().get('/api/admin/bookings').query({ page: 1, pageSize: 2 }).set(as(adminToken));
    expect(res.body.data.items.length).toBeLessThanOrEqual(2);
    expect((await api().get('/api/admin/bookings').query({ status: 'bogus' }).set(as(adminToken))).status).toBe(422);
    expect((await api().get('/api/admin/bookings/not-a-uuid').set(as(adminToken))).status).toBe(404);
  });

  it('reports real dashboard metrics and calendar data', async () => {
    const res = await api().get('/api/admin/dashboard').set(as(staffToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalBookings: expect.any(Number), pendingRequests: expect.any(Number) });
    expect(res.body.data.revenueCollected).toBeNull();

    const cal = await api().get('/api/admin/availability').query({ from: futureDate(0), to: futureDate(7) }).set(as(staffToken));
    expect(cal.status).toBe(200);
    expect(cal.body.data.days.length).toBe(7 * cal.body.data.roomTypes.length);
  });
});

describe('room inventory management', () => {
  const roomBody = (slug: string, inventoryCount: number) => ({
    name: 'Test Room',
    slug,
    shortDescription: '',
    description: '',
    basePrice: '3000',
    maxAdults: 2,
    maxChildren: 1,
    maxOccupancy: 3,
    inventoryCount,
    bedType: null,
    amenities: [],
    bookingRules: '',
    isActive: true,
    displayOrder: 0,
  });

  it('refuses to reduce inventory below rooms already reserved', async () => {
    const room = await createTestRoom({ inventory_count: 3 });
    expect((await postBooking(bookingPayload(room.id, { rooms: 2, adults: 2 }))).status).toBe(201);

    const tooLow = await api().patch(`/api/admin/room-types/${room.id}`).set(as(adminToken)).send(roomBody(room.slug, 1));
    expect(tooLow.status).toBe(409);
    expect(tooLow.body.error.code).toBe('INVENTORY_CONFLICT');

    const ok = await api().patch(`/api/admin/room-types/${room.id}`).set(as(adminToken)).send(roomBody(room.slug, 2));
    expect(ok.status).toBe(200);
    expect(ok.body.data.inventoryCount).toBe(2);
  });

  it('validates room input and protects rooms with booking history from deletion', async () => {
    const room = await createTestRoom();
    const bad = await api().patch(`/api/admin/room-types/${room.id}`).set(as(adminToken)).send({ ...roomBody(room.slug, 1), basePrice: '-5' });
    expect(bad.status).toBe(422);

    await postBooking(bookingPayload(room.id));
    const del = await api().delete(`/api/admin/room-types/${room.id}`).set(as(adminToken));
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('ROOM_HAS_BOOKINGS');

    const empty = await createTestRoom();
    expect((await api().delete(`/api/admin/room-types/${empty.id}`).set(as(adminToken))).status).toBe(204);
  });
});

describe('enquiries', () => {
  it('stores public enquiries and lets staff manage them', async () => {
    const submit = await api().post('/api/enquiries').send({
      name: 'Arun Das',
      phone: '9445566778',
      email: '',
      enquiryType: 'event',
      message: 'Family get-together for 20 people in December [integration-test]',
      consent: true,
    });
    expect(submit.status).toBe(201);
    expect(JSON.stringify(submit.body)).not.toContain('9445566778');

    const list = await api().get('/api/admin/enquiries').query({ q: 'Arun Das' }).set(as(staffToken));
    expect(list.body.data.items[0]).toMatchObject({ name: 'Arun Das', phone: '+919445566778', status: 'new' });
    const id = list.body.data.items[0].id;

    const note = await api().post(`/api/admin/enquiries/${id}/notes`).set(as(staffToken)).send({ note: 'Called back, sending details', kind: 'follow_up' });
    expect(note.body.data.status).toBe('in_progress');
    const resolved = await api().patch(`/api/admin/enquiries/${id}`).set(as(staffToken)).send({ status: 'resolved' });
    expect(resolved.body.data.status).toBe('resolved');
  });

  it('requires consent and silently drops honeypot submissions', async () => {
    const base = { name: 'Bot', phone: '9445566779', enquiryType: 'general', message: 'Hello there friend [integration-test]' };
    expect((await api().post('/api/enquiries').send({ ...base, consent: false })).status).toBe(422);
    const honeypot = await api().post('/api/enquiries').send({ ...base, consent: true, website: 'http://spam' });
    // Zod rejects a non-empty honeypot (max length 0), which is equally fine: nothing is stored.
    expect([201, 422]).toContain(honeypot.status);
    const { count } = await db.from('enquiries').select('id', { count: 'exact', head: true }).eq('phone', '+919445566779');
    expect(count).toBe(0);
  });
});

describe('settings', () => {
  it('validates settings updates against their schema', async () => {
    const bad = await api().patch('/api/admin/settings').set(as(adminToken)).send({ key: 'social', value: { instagram: 'not a url' } });
    expect(bad.status).toBe(422);
    const unknown = await api().patch('/api/admin/settings').set(as(adminToken)).send({ key: 'secrets', value: {} });
    expect(unknown.status).toBe(422);
  });

  it('does not expose admin-only settings publicly', async () => {
    const res = await api().get('/api/site-settings');
    expect(res.body.data.contact.phone).toBe('+91 95974 45838');
    expect(res.body.data.notifications).toBeUndefined();
  });
});

describe('error handling', () => {
  it('returns safe errors when the database is unreachable', async () => {
    const broken = createApp({ env: { ...env, SUPABASE_URL: 'http://127.0.0.1:1' } }).app;
    const health = await request(broken).get('/api/health');
    expect(health.status).toBe(503);
    const rooms = await request(broken).get('/api/rooms');
    expect(rooms.status).toBe(500);
    expect(rooms.body.error.code).toBe('DATABASE_ERROR');
    expect(JSON.stringify(rooms.body)).not.toMatch(/stack|ECONNREFUSED|postgres|sb_secret/i);
    expect(rooms.body.error.requestId).toEqual(expect.any(String));
  });

  it('rejects malformed JSON and unknown routes', async () => {
    const bad = await api().post('/api/enquiries').set('Content-Type', 'application/json').send('{"broken');
    expect(bad.status).toBe(400);
    expect((await api().get('/api/nope')).status).toBe(404);
  });
});
