# REST API

Base path: `/api`. JSON in and out (body limit 64 KB).

## Envelope

```jsonc
// success
{ "ok": true, "data": { … } }
// failure
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Please check the highlighted fields.", "details": [{ "path": "guest.phone", "message": "Enter a valid phone number" }], "requestId": "…" } }
```

Every response carries `X-Request-Id` (an incoming `X-Request-Id` of 8–64 word characters is reused). Errors never include stack traces, SQL or secrets.

## Public endpoints

| Method & path | Rate limit | Description |
| --- | --- | --- |
| `GET /health` | — | Liveness + database reachability (`503` if down) |
| `GET /rooms` | 300/min | Active room types with images |
| `GET /rooms/:slug` | 300/min | One active room type (`404` otherwise) |
| `GET /availability?checkIn&checkOut&adults&children&rooms` | 300/min | Per-room availability for the whole stay, with a quote (`unavailableReason`: `sold_out` \| `occupancy`) |
| `POST /bookings` | 10 / 15 min | Create a reservation request. Header `Idempotency-Key: <uuid>` required. Body: `{ checkIn, checkOut, adults, children, rooms, roomTypeId, guest: { fullName, phone, email, specialRequests? } }`. Any price/status fields sent are ignored. `201` new, `200` idempotent replay. Returns the public summary and an `accessToken` for the confirmation link. |
| `GET /bookings/lookup?reference&token` or `?reference&phone` | 10 / 15 min | Guest self-service. All failures return the same `404 BOOKING_NOT_FOUND` to prevent enumeration. Response contains no contact details. |
| `POST /enquiries` | 10 / 15 min | `{ name, phone, email?, enquiryType, message, consent: true }`. Honeypot field `website` must be empty. |
| `GET /site-settings` | 300/min | Public settings only (never `notifications`) |
| `GET /gallery` | 300/min | Published gallery images |

## Admin endpoints (`/api/admin`)

All require `Authorization: Bearer <Supabase access token>`. The API verifies the token with Supabase Auth, then requires a `profiles` row (and the email in `ADMIN_EMAIL_ALLOWLIST` when set). **S** = staff or admin, **A** = admin only.

| Method & path | Role | Description |
| --- | --- | --- |
| `GET /me` | S | Current staff user |
| `GET /dashboard` | S | Live metrics, pending requests, upcoming arrivals. `revenueCollected` is `null` unless verified payments exist. |
| `GET /bookings?q&status&dateField&from&to&sort&order&page&pageSize` | S | Search (reference, name, phone), filter, sort, paginate (max 100/page) |
| `GET /reports/bookings.csv?…same filters` | S | CSV export (max 5,000 rows; formula-injection safe; audited) |
| `GET /bookings/:id` | S | Full booking: guest contact, items, notes, status history, payments |
| `PATCH /bookings/:id/status` | S | `{ status, note? }` — validated transition, inventory re-check, history + audit |
| `POST /bookings/:id/notes` | S | `{ note }` |
| `GET /guests/:id` | S | Guest contact + booking history |
| `GET /availability?from&to` | S | Calendar matrix (≤ 62 days) + bookings in range |
| `GET /enquiries?q&status&type&page&pageSize` | S | List |
| `GET /enquiries/:id` | S | Detail with notes |
| `PATCH /enquiries/:id` | S | `{ status: new \| in_progress \| resolved }` |
| `POST /enquiries/:id/notes` | S | `{ note, kind: note \| follow_up }` (moves `new` → `in_progress`) |
| `GET /room-types`, `GET /room-types/:id` | S | All room types incl. inventory |
| `POST /room-types` | A | Create |
| `PATCH /room-types/:id` | A | Full update; inventory reductions guarded |
| `DELETE /room-types/:id` | A | Only when the room has no booking history (`409 ROOM_HAS_BOOKINGS`) |
| `POST /room-types/:id/images` | A | `{ imagePath, altText, displayOrder }` |
| `DELETE /room-types/:id/images/:imageId` | A | |
| `GET /settings` | A | All settings |
| `PATCH /settings` | A | `{ key, value }` — `value` validated against that key's schema |
| `GET /gallery` | A | All gallery images |
| `PATCH /gallery/:id` | A | `{ isPublished?, category?, altText?, displayOrder? }` |

## Error codes

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `INVALID_JSON`, `IDEMPOTENCY_KEY_REQUIRED` | Malformed body / missing key |
| 401 | `UNAUTHORIZED` | Missing or invalid session |
| 403 | `FORBIDDEN` | Signed in but not staff, not admin, or not on the allowlist |
| 404 | `NOT_FOUND`, `ROOM_NOT_FOUND`, `BOOKING_NOT_FOUND` | |
| 409 | `NOT_AVAILABLE` | A night in the stay is fully allocated (`details.detail` = first full night) |
| 409 | `IDEMPOTENCY_CONFLICT` | Key reused with a different payload |
| 409 | `INVALID_TRANSITION`, `TOO_EARLY_TO_CHECK_IN` | Status change not permitted |
| 409 | `INVENTORY_CONFLICT`, `ROOM_HAS_BOOKINGS`, `SLUG_TAKEN`, `CONFLICT`, `IN_USE` | Data integrity |
| 413 | `PAYLOAD_TOO_LARGE` | |
| 422 | `VALIDATION_ERROR` (+ `details`), `PAST_DATE`, `INVALID_DATES`, `STAY_TOO_LONG`, `INVALID_PARTY`, `OCCUPANCY_EXCEEDED`, `CONSTRAINT` | |
| 429 | `RATE_LIMITED` | |
| 500 | `INTERNAL_ERROR`, `DATABASE_ERROR` | Generic message only; details are in the server log under the request id |
| 503 | `UNAVAILABLE` | Health check: database unreachable |
