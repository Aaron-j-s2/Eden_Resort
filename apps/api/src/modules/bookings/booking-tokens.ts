import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Guest confirmation tokens.
 *
 * The token is HMAC-SHA256(BOOKING_LOOKUP_SECRET, idempotencyKey), so a retried
 * submission (same idempotency key + same payload) yields the same token without
 * the database ever storing it. Only SHA-256(token) is persisted.
 */
export function deriveAccessToken(secret: string, idempotencyKey: string): string {
  return createHmac('sha256', secret).update(`booking-access:${idempotencyKey}`).digest('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Stable fingerprint of the validated request, used to detect idempotency-key reuse. */
export function requestFingerprint(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}
