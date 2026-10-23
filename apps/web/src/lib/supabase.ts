import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client — used ONLY for staff authentication. It holds the
 * publishable key, which is safe to expose; all data access goes through the API.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
    if (!url || !key) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured');
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'eden-admin-auth' },
    });
  }
  return client;
}
