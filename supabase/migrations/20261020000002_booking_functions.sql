-- Eden Falls Resort — booking, availability and inventory logic.
--
-- Concurrency model
-- -----------------
-- Every operation that allocates or reduces inventory for a room type first
-- takes a row lock on that room_types row (SELECT ... FOR UPDATE, or an UPDATE).
-- Allocations for the same room type are therefore serialised, and the nightly
-- usage check that follows sees every committed booking. Two concurrent requests
-- for the last room cannot both succeed.
--
-- Inventory policy
-- ----------------
-- confirmed and checked_in bookings always consume inventory.
-- pending bookings consume inventory when booking_policy.pendingHoldsInventory
-- is true (the default). cancelled, rejected and checked_out never do.
--
-- Errors are raised with SQLSTATE P0001 and a machine-readable message code
-- (e.g. NOT_AVAILABLE) that the API maps to HTTP responses.

-- --------------------------------------------------------------------------
-- Policy helpers
-- --------------------------------------------------------------------------
create or replace function public.pending_holds_inventory()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (setting_value ->> 'pendingHoldsInventory')::boolean
       from public.site_settings where setting_key = 'booking_policy'),
    true)
$$;

create or replace function public.booking_tax_rate()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (setting_value ->> 'taxRatePercent')::numeric
       from public.site_settings where setting_key = 'booking_policy'),
    0)
$$;

create or replace function public.status_consumes_inventory(p_status public.booking_status, p_pending_holds boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('confirmed', 'checked_in') or (p_status = 'pending' and p_pending_holds)
$$;

-- Mirrors calculateQuote() in packages/shared/src/money.ts.
create or replace function public.calculate_quote(p_nightly_rate numeric, p_nights integer, p_rooms integer, p_tax_rate numeric)
returns table (subtotal numeric, taxes numeric, total numeric)
language sql
immutable
set search_path = ''
as $$
  select s, t, s + t
  from (select round(p_nightly_rate * p_nights * p_rooms, 2) as s) a,
       lateral (select round(a.s * p_tax_rate / 100, 2) as t) b
$$;

-- Rooms of one type in use on each night of [p_from, p_to).
create or replace function public.room_nightly_usage(
  p_room_type_id uuid,
  p_from date,
  p_to date,
  p_exclude_booking_id uuid default null
)
returns table (night date, rooms_used integer)
language sql
stable
security definer
set search_path = ''
as $$
  with policy as (select public.pending_holds_inventory() as holds)
  select g::date as night,
         coalesce((
           select sum(bi.quantity)
             from public.booking_items bi
             join public.bookings b on b.id = bi.booking_id
            where bi.room_type_id = p_room_type_id
              and b.check_in <= g::date
              and b.check_out > g::date
              and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
              and public.status_consumes_inventory(b.booking_status, (select holds from policy))
         ), 0)::integer as rooms_used
    from generate_series(p_from::timestamp, (p_to - 1)::timestamp, interval '1 day') as g
$$;

-- Available rooms per active room type for a stay. A room type is available for
-- the stay only to the extent it is free on *every* night.
create or replace function public.room_availability(p_check_in date, p_check_out date)
returns table (room_type_id uuid, inventory_count integer, max_rooms_used integer, available_rooms integer)
language sql
stable
security definer
set search_path = ''
as $$
  select rt.id,
         rt.inventory_count,
         coalesce(max(u.rooms_used), 0)::integer,
         greatest(rt.inventory_count - coalesce(max(u.rooms_used), 0), 0)::integer
    from public.room_types rt
    cross join lateral public.room_nightly_usage(rt.id, p_check_in, p_check_out) u
   where rt.is_active
   group by rt.id, rt.inventory_count
$$;

-- Non-sequential public reference: EF- + 8 chars from a 32-symbol alphabet
-- (no 0/O/1/I). 32 divides 256, so byte % 32 is unbiased.
create or replace function public.generate_booking_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  ref text := 'EF-';
begin
  for i in 0..7 loop
    ref := ref || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return ref;
end;
$$;

create or replace function public.write_audit(p_actor uuid, p_action text, p_entity_type text, p_entity_id text, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor, p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb))
$$;

-- --------------------------------------------------------------------------
-- create_booking: atomic, idempotent reservation request.
-- --------------------------------------------------------------------------
create or replace function public.create_booking(
  p_idempotency_key uuid,
  p_fingerprint text,
  p_access_token_hash text,
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_rooms integer,
  p_full_name text,
  p_phone text,
  p_email text,
  p_special_requests text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.room_types%rowtype;
  v_existing public.bookings%rowtype;
  v_nights integer;
  v_conflict record;
  v_quote record;
  v_guest_id uuid;
  v_booking_id uuid;
  v_reference text;
  v_attempt integer := 0;
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'INVALID_DATES' using errcode = 'P0001', detail = 'Check-out must be after check-in';
  end if;
  if p_check_in < public.today_ist() then
    raise exception 'PAST_DATE' using errcode = 'P0001', detail = 'Check-in cannot be in the past (IST)';
  end if;
  v_nights := p_check_out - p_check_in;
  if v_nights > 30 then
    raise exception 'STAY_TOO_LONG' using errcode = 'P0001';
  end if;
  if p_rooms < 1 or p_adults < 1 or p_children < 0 or p_rooms > p_adults then
    raise exception 'INVALID_PARTY' using errcode = 'P0001', detail = 'Each room needs at least one adult';
  end if;

  -- Serialise every allocation for this room type.
  select * into v_room from public.room_types where id = p_room_type_id for update;
  if not found or not v_room.is_active then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Idempotent replay: same key + same payload returns the original booking.
  select * into v_existing from public.bookings where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint <> p_fingerprint then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return jsonb_build_object('booking_id', v_existing.id, 'replayed', true);
  end if;

  if p_adults > v_room.max_adults * p_rooms
     or p_children > v_room.max_children * p_rooms
     or p_adults + p_children > v_room.max_occupancy * p_rooms then
    raise exception 'OCCUPANCY_EXCEEDED' using errcode = 'P0001',
      detail = format('Up to %s adults, %s children, %s guests per room', v_room.max_adults, v_room.max_children, v_room.max_occupancy);
  end if;

  select u.night, u.rooms_used into v_conflict
    from public.room_nightly_usage(p_room_type_id, p_check_in, p_check_out) u
   where u.rooms_used + p_rooms > v_room.inventory_count
   order by u.night
   limit 1;
  if found then
    raise exception 'NOT_AVAILABLE' using errcode = 'P0001', detail = v_conflict.night::text;
  end if;

  select * into v_quote from public.calculate_quote(v_room.base_price, v_nights, p_rooms, public.booking_tax_rate());

  insert into public.guests (full_name, phone, email)
  values (p_full_name, p_phone, nullif(p_email, ''))
  on conflict (phone) do update set updated_at = now()
  returning id into v_guest_id;

  loop
    v_reference := public.generate_booking_reference();
    begin
      insert into public.bookings (
        public_reference, access_token_hash, idempotency_key, request_fingerprint,
        guest_id, contact_name, contact_email,
        check_in, check_out, adults, children, number_of_rooms,
        subtotal, taxes, total_amount, special_requests
      ) values (
        v_reference, p_access_token_hash, p_idempotency_key, p_fingerprint,
        v_guest_id, p_full_name, nullif(p_email, ''),
        p_check_in, p_check_out, p_adults, p_children, p_rooms,
        v_quote.subtotal, v_quote.taxes, v_quote.total, nullif(p_special_requests, '')
      )
      returning id into v_booking_id;
      exit;
    exception when unique_violation then
      -- A concurrent retry with the same idempotency key committed first.
      select * into v_existing from public.bookings where idempotency_key = p_idempotency_key;
      if found then
        if v_existing.request_fingerprint <> p_fingerprint then
          raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
        end if;
        return jsonb_build_object('booking_id', v_existing.id, 'replayed', true);
      end if;
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;

  insert into public.booking_items (booking_id, room_type_id, quantity, nightly_rate, number_of_nights, line_total)
  values (v_booking_id, p_room_type_id, p_rooms, v_room.base_price, v_nights, v_quote.subtotal);

  insert into public.booking_status_history (booking_id, previous_status, new_status, note)
  values (v_booking_id, null, 'pending', 'Reservation request submitted on the website');

  return jsonb_build_object('booking_id', v_booking_id, 'replayed', false);
end;
$$;

-- --------------------------------------------------------------------------
-- update_booking_status: validated transition + inventory re-check + audit.
-- --------------------------------------------------------------------------
create or replace function public.booking_transition_allowed(p_from public.booking_status, p_to public.booking_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'pending' then p_to in ('confirmed', 'rejected', 'cancelled')
    when 'confirmed' then p_to in ('checked_in', 'cancelled')
    when 'checked_in' then p_to = 'checked_out'
    else false
  end
$$;

create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_actor uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_holds boolean := public.pending_holds_inventory();
  v_item record;
  v_inventory integer;
  v_conflict record;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not public.booking_transition_allowed(v_booking.booking_status, p_new_status) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001',
      detail = format('%s → %s is not permitted', v_booking.booking_status, p_new_status);
  end if;

  if p_new_status = 'checked_in' and public.today_ist() < v_booking.check_in then
    raise exception 'TOO_EARLY_TO_CHECK_IN' using errcode = 'P0001', detail = v_booking.check_in::text;
  end if;

  -- Moving into an inventory-consuming state: re-verify every night, under lock.
  if public.status_consumes_inventory(p_new_status, v_holds)
     and not public.status_consumes_inventory(v_booking.booking_status, v_holds) then
    for v_item in
      select bi.room_type_id, sum(bi.quantity)::integer as qty
        from public.booking_items bi
       where bi.booking_id = p_booking_id
       group by bi.room_type_id
       order by bi.room_type_id  -- consistent lock order avoids deadlocks
    loop
      select inventory_count into v_inventory from public.room_types where id = v_item.room_type_id for update;
      select u.night, u.rooms_used into v_conflict
        from public.room_nightly_usage(v_item.room_type_id, v_booking.check_in, v_booking.check_out, p_booking_id) u
       where u.rooms_used + v_item.qty > v_inventory
       order by u.night
       limit 1;
      if found then
        raise exception 'NOT_AVAILABLE' using errcode = 'P0001', detail = v_conflict.night::text;
      end if;
    end loop;
  end if;

  update public.bookings set booking_status = p_new_status where id = p_booking_id;

  insert into public.booking_status_history (booking_id, previous_status, new_status, changed_by, note)
  values (p_booking_id, v_booking.booking_status, p_new_status, p_actor, nullif(trim(p_note), ''));

  perform public.write_audit(p_actor, 'booking.status_changed', 'booking', p_booking_id::text,
    jsonb_build_object('from', v_booking.booking_status, 'to', p_new_status, 'reference', v_booking.public_reference));

  return jsonb_build_object('id', p_booking_id, 'previous_status', v_booking.booking_status, 'new_status', p_new_status);
end;
$$;

-- --------------------------------------------------------------------------
-- Inventory guard: reducing inventory_count (or any path that changes it) can
-- never leave a future night over-allocated. Runs inside the UPDATE, which
-- already holds the row lock that create_booking also takes.
-- --------------------------------------------------------------------------
create or replace function public.guard_room_inventory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_holds boolean := public.pending_holds_inventory();
  v_conflict record;
begin
  if new.inventory_count < old.inventory_count then
    select n.night::date as night, sum(bi.quantity)::integer as used
      into v_conflict
      from public.booking_items bi
      join public.bookings b on b.id = bi.booking_id
      cross join lateral generate_series(
        greatest(b.check_in, public.today_ist())::timestamp,
        (b.check_out - 1)::timestamp,
        interval '1 day') as n(night)
     where bi.room_type_id = new.id
       and b.check_out > public.today_ist()
       and public.status_consumes_inventory(b.booking_status, v_holds)
     group by n.night
    having sum(bi.quantity) > new.inventory_count
     order by sum(bi.quantity) desc, n.night
     limit 1;
    if found then
      raise exception 'INVENTORY_CONFLICT' using errcode = 'P0001',
        detail = format('%s room(s) already reserved on %s', v_conflict.used, v_conflict.night);
    end if;
  end if;
  return new;
end;
$$;

create trigger room_types_inventory_guard
  before update of inventory_count on public.room_types
  for each row execute function public.guard_room_inventory();

-- --------------------------------------------------------------------------
-- Payments (ready for a future provider such as Razorpay). Call only from a
-- server-side handler after verifying the provider's webhook signature.
-- --------------------------------------------------------------------------
create or replace function public.record_verified_payment(
  p_booking_id uuid,
  p_provider text,
  p_provider_reference text,
  p_amount numeric,
  p_raw_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric;
  v_paid numeric;
begin
  select total_amount into v_total from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.payments (booking_id, provider, provider_reference, amount, payment_status, verified_at, raw_event)
  values (p_booking_id, p_provider, p_provider_reference, p_amount, 'paid', now(), p_raw_event)
  on conflict (provider, provider_reference) do nothing;

  select coalesce(sum(amount), 0) into v_paid
    from public.payments where booking_id = p_booking_id and payment_status = 'paid';

  update public.bookings
     set payment_status = case when v_paid >= v_total then 'paid'::public.payment_status else 'pending'::public.payment_status end
   where id = p_booking_id;

  return jsonb_build_object('booking_id', p_booking_id, 'paid', v_paid, 'total', v_total);
end;
$$;

-- --------------------------------------------------------------------------
-- Admin reporting
-- --------------------------------------------------------------------------
create view public.booking_overview
with (security_invoker = true)
as
select b.id,
       b.public_reference,
       b.guest_id,
       b.contact_name as guest_name,
       g.phone as guest_phone,
       b.contact_email as guest_email,
       coalesce((
         select string_agg(rt.name || case when bi.quantity > 1 then ' × ' || bi.quantity else '' end, ', ' order by rt.name)
           from public.booking_items bi
           join public.room_types rt on rt.id = bi.room_type_id
          where bi.booking_id = b.id), '') as room_names,
       b.check_in,
       b.check_out,
       (b.check_out - b.check_in) as nights,
       b.adults,
       b.children,
       b.number_of_rooms,
       b.total_amount,
       b.payment_status,
       b.booking_status,
       b.created_at
  from public.bookings b
  join public.guests g on g.id = b.guest_id;

create or replace function public.admin_dashboard_metrics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with t as (select public.today_ist() as today, public.pending_holds_inventory() as holds)
  select jsonb_build_object(
    'today', (select today from t),
    'total_bookings', (select count(*) from public.bookings),
    'pending_requests', (select count(*) from public.bookings where booking_status = 'pending'),
    'confirmed_upcoming', (select count(*) from public.bookings, t
                            where booking_status = 'confirmed' and check_in >= t.today),
    'check_ins_today', (select count(*) from public.bookings, t
                         where check_in = t.today and booking_status in ('confirmed', 'checked_in')),
    'check_outs_today', (select count(*) from public.bookings, t
                          where check_out = t.today and booking_status in ('checked_in', 'checked_out')),
    'in_house_tonight', (select count(*) from public.bookings, t
                          where booking_status = 'checked_in' and check_in <= t.today and check_out > t.today),
    'rooms_occupied_tonight', (select coalesce(sum(bi.quantity), 0)
                                 from public.booking_items bi
                                 join public.bookings b on b.id = bi.booking_id, t
                                where b.check_in <= t.today and b.check_out > t.today
                                  and b.booking_status in ('confirmed', 'checked_in')),
    'total_inventory', (select coalesce(sum(inventory_count), 0) from public.room_types where is_active),
    'open_enquiries', (select count(*) from public.enquiries where status <> 'resolved'),
    'verified_payments', (select count(*) from public.payments where payment_status = 'paid' and verified_at is not null),
    'revenue_collected', (select coalesce(sum(amount), 0) from public.payments
                           where payment_status = 'paid' and verified_at is not null)
  )
$$;

create or replace function public.admin_calendar(p_from date, p_to date)
returns table (
  night date,
  room_type_id uuid,
  inventory integer,
  confirmed_rooms integer,
  pending_rooms integer,
  check_ins integer,
  check_outs integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select g::date,
         rt.id,
         rt.inventory_count,
         coalesce(sum(bi.quantity) filter (
           where b.booking_status in ('confirmed', 'checked_in', 'checked_out')
             and b.check_in <= g::date and b.check_out > g::date), 0)::integer,
         coalesce(sum(bi.quantity) filter (
           where b.booking_status = 'pending'
             and b.check_in <= g::date and b.check_out > g::date), 0)::integer,
         count(distinct b.id) filter (
           where b.check_in = g::date and b.booking_status in ('pending', 'confirmed', 'checked_in', 'checked_out'))::integer,
         count(distinct b.id) filter (
           where b.check_out = g::date and b.booking_status in ('confirmed', 'checked_in', 'checked_out'))::integer
    from generate_series(p_from::timestamp, (p_to - 1)::timestamp, interval '1 day') g
    cross join public.room_types rt
    left join public.booking_items bi on bi.room_type_id = rt.id
    left join public.bookings b on b.id = bi.booking_id
         and b.check_in <= g::date and b.check_out >= g::date
   group by g, rt.id, rt.inventory_count, rt.display_order
   order by g, rt.display_order
$$;

-- --------------------------------------------------------------------------
-- Execution rights. Supabase grants EXECUTE on new public functions to anon
-- and authenticated by default; business functions must only be reachable
-- through the API (service role).
-- --------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.pending_holds_inventory()',
    'public.booking_tax_rate()',
    'public.room_nightly_usage(uuid, date, date, uuid)',
    'public.room_availability(date, date)',
    'public.generate_booking_reference()',
    'public.write_audit(uuid, text, text, text, jsonb)',
    'public.create_booking(uuid, text, text, uuid, date, date, integer, integer, integer, text, text, text, text)',
    'public.update_booking_status(uuid, public.booking_status, uuid, text)',
    'public.record_verified_payment(uuid, text, text, numeric, jsonb)',
    'public.admin_dashboard_metrics()',
    'public.admin_calendar(date, date)',
    'public.guard_room_inventory()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;
