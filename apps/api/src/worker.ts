/**
 * Cloudflare Worker entry: serves the Express API at /api/* on the same domain
 * as the website. Static files are served by Workers Assets; `run_worker_first`
 * in wrangler.jsonc routes only /api/* here.
 *
 * Configuration comes from wrangler.jsonc `vars` plus secrets set in the
 * Cloudflare dashboard (SUPABASE_SECRET_KEY, BOOKING_LOOKUP_SECRET, SMTP_PASS),
 * exposed on process.env by the nodejs_compat flag.
 */
import { httpServerHandler } from 'cloudflare:node';
import { waitUntil } from 'cloudflare:workers';
import { pino } from 'pino';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';

const PORT = 8787;

/**
 * Built on the first request: Workers forbid random numbers and I/O at global
 * scope, which the SMTP transport and Supabase client use when created.
 */
let started = false;
function start() {
  if (started) return;
  const env = loadEnv(process.env);
  // Workers have no stdout file descriptor; send pino's JSON lines to console (Workers Logs).
  const logger = pino(
    {
      level: env.LOG_LEVEL ?? 'info',
      base: { service: 'eden-api' },
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["idempotency-key"]', '*.phone', '*.email', '*.token', '*.accessToken'],
        censor: '[redacted]',
      },
    },
    { write: (line: string) => console.log(line.trimEnd()) },
  );
  const { app } = createApp({ env, logger, background: (task) => waitUntil(task) });
  app.listen(PORT);
  started = true;
}

const handler = httpServerHandler({ port: PORT });

export default {
  fetch(request: Request, bindings: unknown, ctx: unknown) {
    start();
    // Give Express the real client IP (rate limiting) via X-Forwarded-For; TRUST_PROXY=1.
    const headers = new Headers(request.headers);
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) headers.set('x-forwarded-for', ip);
    return handler.fetch(new Request(request, { headers }), bindings, ctx);
  },
};
