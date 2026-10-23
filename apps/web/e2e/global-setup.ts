import { E2E_ADMIN, serviceClient } from './support';

/** Create an isolated, local-only admin account for the test run. */
export default async function globalSetup() {
  const db = serviceClient();
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === E2E_ADMIN.email);
  if (existing) await db.auth.admin.deleteUser(existing.id);
  const { data, error } = await db.auth.admin.createUser({ email: E2E_ADMIN.email, password: E2E_ADMIN.password, email_confirm: true });
  if (error) throw error;
  const { error: pErr } = await db.from('profiles').insert({ id: data.user.id, role: 'admin', display_name: 'E2E Admin' });
  if (pErr) throw pErr;
}
