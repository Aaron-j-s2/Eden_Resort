import { rateLimit, type Options } from 'express-rate-limit';
import type { ApiFailure } from '@eden/shared';

export interface RateLimits {
  /** General public reads. */
  publicRead: number;
  /** Booking + enquiry submissions. */
  submissions: number;
  /** Booking lookups — kept tight to stop reference enumeration. */
  lookups: number;
}

export const DEFAULT_RATE_LIMITS: RateLimits = { publicRead: 300, submissions: 10, lookups: 10 };

function limiter(limit: number, windowMs: number, message: string) {
  const options: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      const body: ApiFailure = {
        ok: false,
        error: { code: 'RATE_LIMITED', message, requestId: String(req.id ?? '') },
      };
      res.status(429).json(body);
    },
  };
  return rateLimit(options);
}

export function createRateLimiters(limits: RateLimits) {
  return {
    publicRead: limiter(limits.publicRead, 60_000, 'Too many requests. Please slow down.'),
    submissions: limiter(limits.submissions, 15 * 60_000, 'Too many submissions. Please wait a few minutes or call us.'),
    lookups: limiter(limits.lookups, 15 * 60_000, 'Too many lookup attempts. Please wait a few minutes or call us.'),
  };
}
