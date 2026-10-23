import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';

/**
 * Server-side Supabase client using the secret key. It bypasses RLS, so it must
 * only ever be used inside this API after authorisation checks, and the key must
 * never be sent to a browser.
 */
export function createServiceClient(env: Pick<Env, 'SUPABASE_URL' | 'supabaseSecretKey'>): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-client-info': 'eden-api' } },
  });
}
