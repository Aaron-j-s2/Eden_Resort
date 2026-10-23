# Eden Falls Resort — website & booking platform

Website, reservation-request system and staff dashboard for **Eden Falls Resort**, Koodal, near Nandhimangalam, Thirparappu, Kanyakumari District, Tamil Nadu 629161.

- **Public site** — editorial, photography-led pages built from the resort's own photographs: Home, Stay (rooms), Room details, Experiences, Gallery, About, Contact, Privacy.
- **Booking** — guests pick dates, see real availability and a server-calculated quote, and send a *pay-later reservation request*. Inventory is allocated atomically in PostgreSQL, so concurrent requests cannot overbook.
- **Admin** (`/admin`) — dashboard, bookings (search, filter, sort, CSV export, status changes, notes, history), guests, availability calendar, enquiries, rooms, gallery and site settings. Supabase Auth with server-side role checks.

```
apps/web        React 19 + TypeScript + Vite 8 + Tailwind 4 (public site and /admin)
apps/api        Express 5 + TypeScript REST API (the only thing that touches the database)
packages/shared Zod schemas, IST date helpers, money/quote maths, shared types
supabase/       SQL migrations, seed data, local Supabase config
scripts/        Photo optimisation pipeline (+ the photo catalogue)
docs/           Setup, database, API, deployment and admin guides
```

## Quick start (local)

Requirements: Node 22+ (tested on 24), npm 10+, Docker (for the local Supabase stack).

```bash
npm install
npm run db:start                     # local Supabase: Postgres, Auth, REST (Docker)
npm run db:status                    # copy the keys it prints into .env
cp .env.example .env                 # then fill in the values (see docs/setup.md)
npm run db:reset                     # apply migrations + seed
npm run admin:create -- --email you@example.com --name "Your Name"
npm run dev                          # API on :4000, website on http://localhost:5173
```

Open http://localhost:5173, make a booking, then sign in at http://localhost:5173/admin.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (tsx watch) + web (Vite) together |
| `npm run build` | Build shared → API (`apps/api/dist`) → web (`apps/web/dist`, incl. sitemap) |
| `npm run lint` | ESLint across the monorepo |
| `npm run typecheck` | TypeScript in every workspace |
| `npm test` | Unit tests (shared + web) and API integration tests |
| `npm run test:unit` / `npm run test:api` | Run either half alone |
| `npm run test:e2e` | Playwright journey + mobile responsiveness (starts dev servers if needed) |
| `npm run images` | Regenerate optimised photos from `../resort photos` |
| `npm run db:start` / `db:stop` / `db:reset` / `db:status` | Local Supabase stack |
| `npm run admin:create -- --email … --name …` | Create or promote a staff account |

API integration and e2e tests create and delete their own data, and **refuse to run against a non-local Supabase URL**.

## Documentation

- [docs/setup.md](docs/setup.md) — environment variables, first run, tests
- [docs/database-schema.md](docs/database-schema.md) — tables, constraints, booking concurrency, RLS
- [docs/api.md](docs/api.md) — every route, envelope and error code
- [docs/deployment.md](docs/deployment.md) — Supabase project, API and web hosting, HTTPS, backups
- [docs/admin-guide.md](docs/admin-guide.md) — first admin account, daily operations, what to confirm before launch
- [docs/photos.md](docs/photos.md) — photo inventory, categorisation and enhancement notes

## Before going live

Several details could not be verified from public sources and are **placeholders** — most importantly the two *sample* room types and their prices. See the checklist in [docs/admin-guide.md](docs/admin-guide.md#before-launch-checklist).
