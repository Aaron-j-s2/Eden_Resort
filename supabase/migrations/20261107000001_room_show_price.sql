-- Per-room switch for showing the nightly rate and quoted totals on the public
-- website. When false the API omits every amount for that room (room pages,
-- availability results, booking confirmation and lookup); staff still see
-- prices in the admin and in alert emails. Pricing itself is unchanged.
alter table public.room_types
  add column show_price boolean not null default true;

comment on column public.room_types.show_price is
  'Show the nightly rate and quoted totals on the public website (staff always see them).';
