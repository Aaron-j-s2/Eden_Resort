import { z } from 'zod';

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    /** Comma-separated list of allowed browser origins (CORS). */
    FRONTEND_URL: csv,
    /** Public site URL used in links sent to guests. */
    PUBLIC_SITE_URL: z.url().default('http://localhost:5173'),
    /** Number of reverse proxies in front of the API (for correct client IPs in rate limiting). */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),

    SUPABASE_URL: z.url(),
    /**
     * Server-only secret key (sb_secret_…). The legacy service_role JWT is
     * accepted as a fallback via SUPABASE_SERVICE_ROLE_KEY. Never expose either
     * to the browser.
     */
    SUPABASE_SECRET_KEY: z.string().min(20).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

    /** Optional: only these emails may use the admin API (in addition to profiles.role). */
    ADMIN_EMAIL_ALLOWLIST: csv.transform((list) => list.map((e) => e.toLowerCase())),
    /** HMAC secret for guest confirmation tokens. At least 32 random characters. */
    BOOKING_LOOKUP_SECRET: z.string().min(32, 'BOOKING_LOOKUP_SECRET must be at least 32 characters'),

    /** Optional email notifications via Resend (https://resend.com). */
    RESEND_API_KEY: z.string().optional(),
    NOTIFY_FROM_EMAIL: z.string().optional(),
  })
  .transform((env, ctx) => {
    const secretKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secretKey) {
      ctx.addIssue({ code: 'custom', path: ['SUPABASE_SECRET_KEY'], message: 'SUPABASE_SECRET_KEY is required' });
      return z.NEVER;
    }
    if (env.NODE_ENV === 'production' && env.FRONTEND_URL.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'FRONTEND_URL is required in production' });
      return z.NEVER;
    }
    return { ...env, supabaseSecretKey: secretKey };
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}
