import { E2E_ADMIN, serviceClient } from './support';

/** Remove the temporary admin and every booking/enquiry created by e2e guests. */
export default async function globalTeardown() {
  const db = serviceClient();
  const { data: guests } = await db.from('guests').select('id').like('full_name', 'E2E %');
  const ids = (guests ?? []).map((g: { id: string }) => g.id);
  if (ids.length) {
    await db.from('bookings').delete().in('guest_id', ids);
    await db.from('guests').delete().in('id', ids);
  }
  await db.from('enquiries').delete().like('name', 'E2E %');
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const user = list?.users.find((u) => u.email === E2E_ADMIN.email);
  if (user) await db.auth.admin.deleteUser(user.id);
}
