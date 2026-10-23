# Deployment

Three pieces: a **Supabase project** (database + auth), the **API** (Node.js), and the **website** (static files). A single Linux server with Nginx works well; managed hosts work too.

## 1. Supabase project

1. Create a project at supabase.com (choose the Mumbai region for India).
2. Link and push the schema from your machine:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push            # applies supabase/migrations
   ```
3. Load production settings and gallery rows — **not** the sample rooms. In the SQL editor, run the `site_settings` insert from `supabase/seed.sql` and the whole of `supabase/seed.gallery.sql`. Then create real room types in Admin → Rooms.
4. **Authentication → Providers → Email**: keep email sign-in enabled. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
5. **Authentication → URL configuration**: set Site URL to your website URL.
6. **Project Settings → API Keys**: copy the *publishable* key (for the web) and create a *secret* key (for the API only).
7. Create the first admin from a trusted machine with the production env loaded:
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_… \
     npm run admin:create -- --email owner@yourdomain --name "Owner"
   ```

## 2. API server

```bash
npm ci
npm run build                     # builds packages/shared and apps/api/dist
```

Production `.env` (repo root, readable only by the service user — `chmod 600 .env`):

```
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://www.example.com,https://example.com
PUBLIC_SITE_URL=https://www.example.com
TRUST_PROXY=1
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_…
BOOKING_LOOKUP_SECRET=<32+ random chars>
ADMIN_EMAIL_ALLOWLIST=owner@yourdomain
```

Run under systemd (`/etc/systemd/system/eden-api.service`):

```ini
[Unit]
Description=Eden Falls API
After=network.target

[Service]
User=eden
WorkingDirectory=/srv/eden-falls-resort/apps/api
ExecStart=/usr/bin/node --env-file=../../.env dist/server.js
Restart=on-failure
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now eden-api
curl http://127.0.0.1:4000/api/health
```

## 3. Website

Build with the production public variables (only `VITE_*` values reach the browser):

```bash
VITE_API_BASE_URL=/api \
VITE_SUPABASE_URL=https://<ref>.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
VITE_SITE_URL=https://www.example.com \
SITEMAP_API_URL=http://127.0.0.1:4000/api \
npm run build -w @eden/web
```

Serve `apps/web/dist` with SPA fallback. Nginx example (API on the same domain, so no CORS needed in the browser):

```nginx
server {
  listen 443 ssl http2;
  server_name www.example.com;
  # ssl_certificate … (e.g. certbot --nginx)

  root /srv/eden-falls-resort/apps/web/dist;
  index index.html;

  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header X-Frame-Options DENY always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;
  }

  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location /images/ { expires 30d; add_header Cache-Control "public"; }
  location / { try_files $uri /index.html; }
}
server { listen 80; server_name www.example.com example.com; return 301 https://www.example.com$request_uri; }
```

Static hosts (Netlify, Vercel, Cloudflare Pages) also work: publish `apps/web/dist`, add a SPA rewrite to `/index.html`, and set `VITE_API_BASE_URL` to the API's full HTTPS URL (and include the site's origin in the API's `FRONTEND_URL`).

## 4. HTTPS and origins

- Serve everything over HTTPS (Let's Encrypt via `certbot --nginx`).
- `FRONTEND_URL` must list every origin that calls the API from a browser; others get no CORS headers.
- Set `TRUST_PROXY` to the number of proxies so rate limits use real client IPs.

## 5. Database backups

- Supabase Pro includes daily backups; enable Point-in-Time Recovery for booking data.
- Independently, take a nightly logical dump to storage you control:
  ```bash
  pg_dump "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
    --schema=public --format=custom --file="eden-$(date +%F).dump"
  ```
  Keep at least 30 days, encrypt at rest, and test a restore every quarter (`pg_restore --dbname=<staging-url> eden-YYYY-MM-DD.dump`).

## 6. After deploying

- `curl https://www.example.com/api/health`
- Make a test booking for a far-future date, confirm it in `/admin`, then cancel it.
- Check `https://www.example.com/sitemap.xml` and `robots.txt`.
- Submit the sitemap in Google Search Console.

## Optional integrations

- **Email alerts**: set `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL` (a verified sender), then enable alerts and a staff email in Admin → Settings → Notifications.
- **Online payments (e.g. Razorpay)**: not implemented. The schema has a `payments` table and `record_verified_payment()`; a future webhook handler must verify the provider signature server-side before calling it. Bookings stay "Pay at resort" until then.
- **WhatsApp alerts**: require a WhatsApp Business API provider; the setting exists but no integration is connected.
