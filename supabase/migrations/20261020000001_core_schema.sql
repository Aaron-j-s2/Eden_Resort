-- Eden Falls Resort — core schema
-- Tables, enums, constraints and indexes. Business logic lives in
-- 20261020000002_booking_functions.sql; access control in 20261020000003_rls.sql.

set check_function_bodies = off;

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'staff');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'rejected');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'refunded', 'failed');
create type public.enquiry_status as enum ('new', 'in_progress', 'resolved');

-- --------------------------------------------------------------------------
-- Helpers
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Today's date in India Standard Time. All stay dates are interpreted in IST.
create or replace function public.today_ist()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- --------------------------------------------------------------------------
-- Staff profiles (linked to Supabase Auth). No public sign-up: rows are
-- created by the admin bootstrap script (see docs/admin-guide.md).
-- --------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'staff',
  display_name text check (char_length(display_name) <= 120),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Room types & images
-- --------------------------------------------------------------------------
create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '',
  description text not null default '',
  base_price numeric(10, 2) not null check (base_price > 0),
  max_adults integer not null check (max_adults >= 1),
  max_children integer not null default 0 check (max_children >= 0),
  max_occupancy integer not null check (max_occupancy >= 1),
  inventory_count integer not null default 0 check (inventory_count >= 0),
  bed_type text,
  amenities text[] not null default '{}',
  booking_rules text not null default '',
  is_active boolean not null default false,
  -- Development placeholder data that must be replaced before production.
  is_sample boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_types_occupancy_ck check (max_occupancy >= max_adults and max_occupancy <= max_adults + max_children)
);
create trigger room_types_updated_at before update on public.room_types
  for each row execute function public.set_updated_at();
create index room_types_active_order_idx on public.room_types (is_active, display_order);

create table public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references public.room_types (id) on delete cascade,
  image_path text not null,
  alt_text text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index room_images_room_idx on public.room_images (room_type_id, display_order);

-- --------------------------------------------------------------------------
-- Guests & bookings
-- --------------------------------------------------------------------------
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  -- Normalised E.164-style (+919597445838). One guest record per phone number.
  phone text not null unique check (phone ~ '^\+\d{10,15}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger guests_updated_at before update on public.guests
  for each row execute function public.set_updated_at();
create index guests_name_trgm_idx on public.guests using gin (full_name extensions.gin_trgm_ops);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  -- Public, non-sequential reference, e.g. EF-7KQ2M9XA.
  public_reference text not null unique check (public_reference ~ '^EF-[A-HJ-NP-Z2-9]{8}$'),
  -- SHA-256 of the guest's confirmation token. The token itself is never stored.
  access_token_hash text not null check (char_length(access_token_hash) = 64),
  -- Client-generated key that makes retries of the same submission safe.
  idempotency_key uuid not null unique,
  request_fingerprint text not null,
  guest_id uuid not null references public.guests (id) on delete restrict,
  -- Contact snapshot as submitted with this booking. The guests row is keyed by
  -- phone and is never overwritten by anonymous submissions.
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  check_in date not null,
  check_out date not null,
  adults integer not null check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  number_of_rooms integer not null check (number_of_rooms >= 1),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  taxes numeric(12, 2) not null default 0 check (taxes >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  currency char(3) not null default 'INR',
  booking_status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  special_requests text check (char_length(special_requests) <= 1000),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates_ck check (check_out > check_in),
  constraint bookings_rooms_ck check (number_of_rooms <= adults),
  constraint bookings_total_ck check (total_amount = subtotal + taxes)
);
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create index bookings_dates_idx on public.bookings (check_in, check_out);
create index bookings_check_out_idx on public.bookings (check_out);
create index bookings_status_idx on public.bookings (booking_status, check_in);
create index bookings_guest_idx on public.bookings (guest_id);
create index bookings_created_idx on public.bookings (created_at desc);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  room_type_id uuid not null references public.room_types (id) on delete restrict,
  quantity integer not null check (quantity >= 1),
  nightly_rate numeric(10, 2) not null check (nightly_rate > 0),
  number_of_nights integer not null check (number_of_nights >= 1),
  line_total numeric(12, 2) not null check (line_total >= 0),
  constraint booking_items_line_ck check (line_total = nightly_rate * quantity * number_of_nights)
);
create index booking_items_booking_idx on public.booking_items (booking_id);
create index booking_items_room_idx on public.booking_items (room_type_id);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  previous_status public.booking_status,
  new_status public.booking_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index booking_status_history_booking_idx on public.booking_status_history (booking_id, created_at);

create table public.booking_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index booking_notes_booking_idx on public.booking_notes (booking_id, created_at);

-- Payments are only marked paid after server-side verification (provider webhook).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  provider text not null,
  provider_reference text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  payment_status public.payment_status not null default 'pending',
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  constraint payments_provider_ref_uq unique (provider, provider_reference),
  constraint payments_paid_verified_ck check (payment_status <> 'paid' or verified_at is not null)
);
create index payments_booking_idx on public.payments (booking_id);

-- --------------------------------------------------------------------------
-- Enquiries
-- --------------------------------------------------------------------------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (phone ~ '^\+\d{10,15}$'),
  email text,
  enquiry_type text not null check (enquiry_type in ('stay', 'day_visit', 'event', 'group', 'general')),
  message text not null check (char_length(message) between 10 and 2000),
  consent_at timestamptz not null,
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();
create index enquiries_status_idx on public.enquiries (status, created_at desc);

create table public.enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  kind text not null default 'note' check (kind in ('note', 'follow_up')),
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at);

-- --------------------------------------------------------------------------
-- Content
-- --------------------------------------------------------------------------
create table public.site_settings (
  setting_key text primary key check (setting_key ~ '^[a-z_]+$'),
  setting_value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_path text not null unique,
  category text not null,
  alt_text text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  display_order integer not null default 0,
  is_published boolean not null default true,
  -- e.g. "contains identifiable people — confirm consent before publishing"
  admin_note text,
  created_at timestamptz not null default now()
);
create index gallery_images_pub_idx on public.gallery_images (is_published, category, display_order);

-- --------------------------------------------------------------------------
-- Admin audit log
-- --------------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_audit_log_entity_idx on public.admin_audit_log (entity_type, entity_id, created_at desc);
