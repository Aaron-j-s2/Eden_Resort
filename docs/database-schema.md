# Database

PostgreSQL 17 on Supabase. Migrations live in `supabase/migrations/` and run in filename order.

| Migration | Contents |
| --- | --- |
| `20261020000001_core_schema.sql` | Enums, tables, constraints, indexes, `updated_at` triggers |
| `20261020000002_booking_functions.sql` | Availability, atomic booking creation, status transitions, inventory guard, payments, admin reporting |
| `20261020000003_rls.sql` | Row Level Security policies and grants |

## Tables

| Table | Purpose | Notes |
| --- | --- | --- |
| `profiles` | Staff accounts, linked 1:1 to `auth.users` | `role` = `admin` \| `staff`. Created only by `admin:create`. |
| `room_types` | Room categories | `base_price numeric(10,2) > 0`; `inventory_count ≥ 0`; occupancy check `max_adults ≤ max_occupancy ≤ max_adults + max_children`; `is_sample` marks placeholder data. |
| `room_images` | Photos per room type | Cascade-deleted with the room type. |
| `guests` | One row per phone number (normalised `+91…`) | Never overwritten by anonymous submissions — see `bookings.contact_*`. |
| `bookings` | Reservation requests | `public_reference` (`EF-XXXXXXXX`, unique, random), `access_token_hash` (SHA-256 only), `idempotency_key` (unique), `check_in/check_out DATE` with `check_out > check_in`, money as `numeric(12,2)` with `total = subtotal + taxes`, `booking_status`, `payment_status`, contact snapshot. |
| `booking_items` | Room lines per booking | Rate snapshot; `line_total = nightly_rate × quantity × nights` enforced. `ON DELETE RESTRICT` to room types. |
| `booking_status_history` | Audit trail of every status change | Who, when, from → to, note. |
| `booking_notes` | Internal staff notes | Never shown to guests. |
| `payments` | Verified payments (future provider) | `unique(provider, provider_reference)`; a `paid` row must have `verified_at`. |
| `enquiries` | Contact-form submissions | `consent_at` records privacy consent. |
| `enquiry_notes` | Notes and follow-up actions on enquiries | `kind` = `note` \| `follow_up`. |
| `site_settings` | Editable public content and policies (JSONB) | Validated by Zod schemas in `packages/shared/src/settings.ts`. `is_public` controls the public API. |
| `gallery_images` | Gallery photos | `is_published`; `admin_note` flags photos showing identifiable people. |
| `admin_audit_log` | Administrative actions | Status changes, room/setting/gallery edits, CSV exports. |

View: `booking_overview` (`security_invoker`) — bookings joined with guest phone and room names, used by admin lists, search and CSV.

## Booking status model

```
pending ──► confirmed ──► checked_in ──► checked_out
   │            │
   ├──► rejected└──► cancelled
   └──► cancelled
```

Enforced by `booking_transition_allowed()` inside `update_booking_status()`; also mirrored in `packages/shared/src/status.ts` so the admin UI only offers valid actions. Additional rule: `checked_in` is refused before the arrival date (IST).

## Inventory policy

| Status | Consumes rooms? |
| --- | --- |
| `confirmed`, `checked_in` | Always |
| `pending` | When `booking_policy.pendingHoldsInventory` is `true` (default; configurable in Admin → Settings) |
| `cancelled`, `rejected`, `checked_out` | Never |

## Concurrency and overbooking protection

All dates are `DATE` values interpreted in India Standard Time (`today_ist()`); a stay occupies nights `[check_in, check_out)`.

1. **`create_booking(...)`** (called by `POST /api/bookings`) runs as one transaction:
   - validates dates (not in the past in IST, ≤ 30 nights) and party size;
   - `SELECT … FOR UPDATE` on the `room_types` row — **every allocation for that room type is serialised**;
   - returns the existing booking if the idempotency key was already used with the same payload (conflict if the payload differs);
   - checks occupancy against the room limits × rooms;
   - computes usage for **every night** and rejects with `NOT_AVAILABLE` if any night would exceed `inventory_count`;
   - calculates the quote from the database price and tax setting (`calculate_quote`), upserts the guest, inserts the booking, items and initial history row.
2. **`update_booking_status(...)`** locks the booking row and, when moving into a consuming state (e.g. `pending → confirmed` while pending requests don't hold rooms), locks the room types in a fixed order and re-checks every night.
3. **`room_types_inventory_guard`** trigger rejects any reduction of `inventory_count` that would leave a future night over-allocated (`INVENTORY_CONFLICT`). It runs inside the same row lock bookings take.

The API test suite fires 12 simultaneous requests at 3 remaining rooms and asserts exactly 3 succeed.

## Row Level Security

RLS is enabled on every table. The API uses the server-only secret key (bypasses RLS) and does its own authorisation; RLS protects against direct use of the public key:

- `anon`/`authenticated` can read **only** active room types and their images, published gallery images and public settings.
- Guests, bookings, enquiries, payments, notes, profiles and the audit log have **no** public access (privileges are also revoked from `anon`).
- Staff (`is_staff()`) may read operational data with their own session; only admins (`is_admin()`) may write content tables.
- Business functions (`create_booking`, `update_booking_status`, …) are executable only by `service_role`.

## Backups

See [deployment.md](deployment.md#database-backups).
