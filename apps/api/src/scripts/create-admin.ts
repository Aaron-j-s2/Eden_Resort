/**
 * Create (or promote) a staff account. There is deliberately no public sign-up.
 *
 *   npm run admin:create -- --email owner@example.com --name "Owner" [--role admin|staff]
 *
 * The password is read from the ADMIN_PASSWORD environment variable or prompted
 * for interactively (never passed on the command line, so it stays out of shell
 * history). Requires SUPABASE_URL and SUPABASE_SECRET_KEY.
 */
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string', default: 'admin' },
  },
});

const email = values.email?.trim().toLowerCase();
const role = values.role === 'staff' ? 'staff' : 'admin';
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--role admin|staff]');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).');
  process.exit(1);
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question('Password for this account (min 12 characters): ');
  rl.close();
}
if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Find an existing user with this email, or create one.
let userId: string | undefined;
for (let page = 1; !userId; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
  if (data.users.length < 200) break;
}

if (userId) {
  const { error } = await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (error) throw error;
  console.log(`Updated password for existing user ${email}.`);
} else {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Created user ${email}.`);
}

const { error: profileError } = await db
  .from('profiles')
  .upsert({ id: userId, role, display_name: values.name?.trim() || email.split('@')[0] });
if (profileError) throw profileError;

console.log(`✓ ${email} now has the "${role}" role. Sign in at /admin/login.`);
