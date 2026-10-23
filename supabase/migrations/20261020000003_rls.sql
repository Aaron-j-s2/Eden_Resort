-- Eden Falls Resort — Row Level Security
--
-- All application writes go through the Express API using the server-only
-- secret key (which bypasses RLS). RLS is the second line of defence: anyone
-- holding the public (publishable/anon) key can read only published content,
-- and no guest, booking, enquiry or payment data at all.
--
-- Staff accounts (profiles.role admin|staff) may read operational data directly
-- with their own session, which keeps the door open for Supabase-native admin
-- tooling without granting the public anything.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'staff'))
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.room_types enable row level security;
alter table public.room_images enable row level security;
alter table public.guests enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.booking_notes enable row level security;
alter table public.payments enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_notes enable row level security;
alter table public.site_settings enable row level security;
alter table public.gallery_images enable row level security;
alter table public.admin_audit_log enable row level security;

-- Profiles: a signed-in user can see their own profile; admins see all.
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Public content -------------------------------------------------------------
create policy room_types_public_read on public.room_types
  for select to anon, authenticated
  using (is_active or (select public.is_staff()));

create policy room_images_public_read on public.room_images
  for select to anon, authenticated
  using (exists (select 1 from public.room_types rt where rt.id = room_type_id and (rt.is_active or (select public.is_staff()))));

create policy gallery_public_read on public.gallery_images
  for select to anon, authenticated
  using (is_published or (select public.is_staff()));

create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (is_public or (select public.is_staff()));

-- Content management (admins only) --------------------------------------------
create policy room_types_admin_write on public.room_types
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy room_images_admin_write on public.room_images
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy gallery_admin_write on public.gallery_images
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy site_settings_admin_write on public.site_settings
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Private operational data: staff read only, no public access whatsoever ------
create policy guests_staff_read on public.guests
  for select to authenticated using ((select public.is_staff()));
create policy bookings_staff_read on public.bookings
  for select to authenticated using ((select public.is_staff()));
create policy booking_items_staff_read on public.booking_items
  for select to authenticated using ((select public.is_staff()));
create policy booking_history_staff_read on public.booking_status_history
  for select to authenticated using ((select public.is_staff()));
create policy booking_notes_staff_read on public.booking_notes
  for select to authenticated using ((select public.is_staff()));
create policy payments_staff_read on public.payments
  for select to authenticated using ((select public.is_staff()));
create policy enquiries_staff_read on public.enquiries
  for select to authenticated using ((select public.is_staff()));
create policy enquiry_notes_staff_read on public.enquiry_notes
  for select to authenticated using ((select public.is_staff()));
create policy audit_admin_read on public.admin_audit_log
  for select to authenticated using ((select public.is_admin()));

-- Belt and braces: the anon role gets no table privileges on private tables.
revoke all on public.guests, public.bookings, public.booking_items, public.booking_status_history,
  public.booking_notes, public.payments, public.enquiries, public.enquiry_notes, public.admin_audit_log,
  public.profiles
  from anon;
revoke all on public.booking_overview from anon;
