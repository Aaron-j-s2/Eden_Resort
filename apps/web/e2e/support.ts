import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function rootEnv(): Record<string, string> {
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

const env = { ...rootEnv(), ...process.env } as Record<string, string | undefined>;

export const E2E_ADMIN = { email: 'e2e-admin@eden.test', password: 'e2e-' + 'Local-Only-Password-123' };

export function serviceClient() {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY are required for e2e setup');
  const host = new URL(url).hostname;
  if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error(`Refusing to run e2e setup against ${host}`);
  return createClient(url, key, { auth: { persistSession: false } });
}
