import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';
import { addDays, todayInIST } from '@eden/shared';
import { createApp } from '../src/app.js';
import { loadEnv, type Env } from '../src/config/env.js';

/** Load the repo-root .env (tests run with cwd = apps/api). */
function readDotEnv(): Record<string, string> {
  try {
    const raw = readFileSync(path.resolve(import.meta.dirname, '../../../.env'), 'utf8');
    return Object.fromEntries(
      raw
        .split('\n')
        .filter((l) => /^[A-Z0-9_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const fileEnv = readDotEnv();
export const env: Env = loadEnv({ ...fileEnv, ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'silent' });

// Safety: integration tests write and delete rows. Never point them at a hosted project.
const host = new URL(env.SUPABASE_URL).hostname;
if (!['127.0.0.1', 'localhost'].includes(host) && process.env.ALLOW_REMOTE_TEST_DB !== '1') {
  throw new Error(`Refusing to run destructive tests against ${host}. Use the local Supabase stack.`);
}

export const { app } = createApp({ env, rateLimits: { publicRead: 10_000, submissions: 10_000, lookups: 10_000 } });
export const api = () => request(app);

/** Service client for fixtures and assertions. */
export const db: SupabaseClient = createClient(env.SUPABASE_URL, env.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const publishableKey = fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export const futureDate = (days: number) => addDays(todayInIST(), days);

export const uniquePhone = () => `+91${String(Math.floor(6_000_000_000 + Math.random() * 3_999_999_999))}`;

export interface TestRoom {
  id: string;
  slug: string;
}

const createdRooms: string[] = [];
const createdUsers: string[] = [];

export async function createTestRoom(overrides: Record<string, unknown> = {}): Promise<TestRoom> {
  const slug = `test-room-${randomUUID().slice(0, 8)}`;
  const { data, error } = await db
    .from('room_types')
    .insert({
      name: `Test Room ${slug}`,
      slug,
      base_price: '3000.00',
      max_adults: 2,
      max_children: 1,
      max_occupancy: 3,
      inventory_count: 2,
      is_active: true,
      ...overrides,
    })
    .select('id, slug')
    .single();
  if (error) throw error;
  createdRooms.push(data.id);
  return data as TestRoom;
}

export function bookingPayload(roomTypeId: string, overrides: Record<string, unknown> = {}) {
  return {
    checkIn: futureDate(40),
    checkOut: futureDate(42),
    adults: 2,
    children: 0,
    rooms: 1,
    roomTypeId,
    guest: { fullName: 'Integration Test Guest', phone: uniquePhone(), email: 'guest@example.com' },
    ...overrides,
  };
}

export function postBooking(payload: unknown, key: string = randomUUID()) {
  return api().post('/api/bookings').set('Idempotency-Key', key).send(payload as object);
}

export async function createUser(role: 'admin' | 'staff' | null): Promise<{ token: string; id: string }> {
  const email = `test-${randomUUID().slice(0, 8)}@eden.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  if (role) {
    const { error: pErr } = await db.from('profiles').insert({ id: data.user.id, role, display_name: `Test ${role}` });
    if (pErr) throw pErr;
  }
  const anon = createClient(env.SUPABASE_URL, publishableKey, { auth: { persistSession: false } });
  const { data: session, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  if (sErr) throw sErr;
  return { token: session.session.access_token, id: data.user.id };
}

export async function setBookingPolicy(patch: Record<string, unknown>) {
  const { data } = await db.from('site_settings').select('setting_value').eq('setting_key', 'booking_policy').single();
  const previous = data!.setting_value as Record<string, unknown>;
  await db.from('site_settings').update({ setting_value: { ...previous, ...patch } }).eq('setting_key', 'booking_policy');
  return () => db.from('site_settings').update({ setting_value: previous }).eq('setting_key', 'booking_policy');
}

/** Remove everything the tests created, leaving seed data untouched. */
export async function cleanup() {
  if (createdRooms.length) {
    const { data: items } = await db.from('booking_items').select('booking_id').in('room_type_id', createdRooms);
    const bookingIds = [...new Set((items ?? []).map((i: { booking_id: string }) => i.booking_id))];
    if (bookingIds.length) {
      const { data: bookings } = await db.from('bookings').select('guest_id').in('id', bookingIds);
      await db.from('bookings').delete().in('id', bookingIds);
      const guestIds = [...new Set((bookings ?? []).map((b: { guest_id: string }) => b.guest_id))];
      if (guestIds.length) await db.from('guests').delete().in('id', guestIds);
    }
    await db.from('room_types').delete().in('id', createdRooms);
    createdRooms.length = 0;
  }
  for (const id of createdUsers.splice(0)) await db.auth.admin.deleteUser(id);
  await db.from('enquiries').delete().like('message', '%[integration-test]%');
}
