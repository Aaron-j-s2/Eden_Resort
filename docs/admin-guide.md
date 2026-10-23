# Admin guide

The staff area is at **/admin**. There is no public sign-up; accounts are created by an administrator (see [setup.md](setup.md#6-first-staff-account)).

| Role | Can |
| --- | --- |
| **staff** | Dashboard, bookings (view, confirm, reject, cancel, check in/out, notes, CSV), guests, calendar, enquiries |
| **admin** | Everything staff can, plus rooms, gallery and settings |

## Daily work

**Overview** — live counts: new requests, arrivals and departures today, rooms occupied tonight, open enquiries. Revenue only appears once a payment provider records verified payments.

**Bookings** — search by reference, guest name or phone; filter by status and by check-in, check-out or received date; sort columns; export the filtered list to CSV. Open a booking to:

- call, WhatsApp or email the guest;
- **Confirm** (rooms are re-checked for every night), **Reject**, **Cancel** — each asks for confirmation and can carry a note for the history;
- **Check in** (from the arrival date) and **Check out**;
- add internal notes (never shown to guests).

Every status change is recorded with who did it and when.

**Calendar** — month or week grid of rooms reserved per night versus inventory, with pending requests (`+Np`), arrivals (▸) and departures (◂).

**Enquiries** — contact-form messages. Set *New / In progress / Resolved*, and record follow-ups ("called back, sent prices").

## How a reservation request works

1. The guest picks dates and a room; the website shows only what the database says is free.
2. They submit a request — **no payment is taken**. They get a reference such as `EF-7KQ2M9XA` and a private confirmation link.
3. It appears in *Overview → Requests awaiting confirmation*. By default a pending request **holds** the room so two guests cannot request the last one (Settings → Booking policies → "Pending requests hold rooms").
4. Call the guest, then **Confirm** or **Reject**. The guest's confirmation page updates automatically.

Guests can check their status any time at **/booking/find** with their reference and phone number.

## Rooms

- Prices apply to new requests only; existing bookings keep their quoted rate.
- "Rooms of this type" is the number of physical rooms. You cannot reduce it below what is already reserved on any future night — the system will tell you the date.
- Rooms with booking history cannot be deleted; untick **Published** instead.
- Photographs are chosen from the resort's own photo library. To add new photos, place originals in the photo folder, add them to `scripts/image-catalog.json` and run `npm run images`.

## Settings

Contact details, address, booking policies, homepage text, experiences, nearby attractions, FAQ, sustainability practices, gallery categories, social links and notifications. Blank policy fields show "Confirmed on booking" on the website. Experiences appear only when ticked **Confirmed**. Unverified distances show as approximate. Secrets and API keys are never entered here.

## Before-launch checklist

These items could not be verified from public sources (Goibibo and MakeMyTrip timed out; Justdial blocked automated access; only a public Instagram hashtag page loaded). Please confirm or replace them:

- [ ] **Room types** — replace both *sample listings* (names, descriptions, prices, occupancy, number of rooms, bed types, amenities), or unpublish them.
- [ ] **Check-in / check-out times, cancellation, children and ID policies** (Settings → Booking policies).
- [ ] **Tax** — set the applicable GST rate (currently 0%).
- [ ] **Facilities** — the swimming pool, dining, campfire and events/gatherings are shown as confirmed based on the information you provided. Untick any that are not offered. There are **no photographs of the pool or dining**; those sections show a "photograph to come" panel until photos are added.
- [ ] **Distance to Thirparappu Falls** — shown as "≈ 6 km, approximate". Tick "verified" once checked. Add distances for Mathur Aqueduct and Pechiparai Reservoir if wanted.
- [ ] **Public email address and official social media links** (none are published yet).
- [ ] **Sustainability practices** — the section is hidden until you add practices the resort actually follows.
- [ ] **Photos with people** — five photos showing identifiable people are unpublished in Gallery. Publish only with the people's consent.
- [ ] **Privacy notice** — review `/privacy` with your advisor.
- [ ] **Notifications** — decide whether staff should get email alerts (needs an email provider key on the server).
