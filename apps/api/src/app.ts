import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env.js';
import type { AppContext } from './context.js';
import { createLogger } from './lib/logger.js';
import { createNotifier } from './lib/notifier.js';
import { createServiceClient } from './lib/supabase.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createRateLimiters, DEFAULT_RATE_LIMITS, type RateLimits } from './middleware/rate-limit.js';
import { adminRoutes } from './routes/admin.routes.js';
import { publicRoutes } from './routes/public.routes.js';

export interface CreateAppOptions {
  env: Env;
  rateLimits?: Partial<RateLimits>;
}

export function createApp({ env, rateLimits }: CreateAppOptions) {
  const logger = createLogger(env);
  const db = createServiceClient(env);
  const ctx: AppContext = { env, db, logger, notifier: createNotifier(env, db, logger) };
  const limiters = createRateLimiters({ ...DEFAULT_RATE_LIMITS, ...rateLimits });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url.split('?')[0] }),
      },
    }),
  );

  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } }));

  const allowed = new Set(env.FRONTEND_URL);
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin/non-browser requests carry no Origin header.
        if (!origin) return cb(null, true);
        if (allowed.has(origin) || (env.NODE_ENV !== 'production' && allowed.size === 0)) return cb(null, true);
        return cb(null, false);
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '64kb' }));

  app.use('/api/admin', adminRoutes(ctx));
  app.use('/api', publicRoutes(ctx, limiters));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, ctx };
}
