import { pino, type Logger } from 'pino';
import type { Env } from '../config/env.js';

export function createLogger(env: Pick<Env, 'NODE_ENV' | 'LOG_LEVEL'>): Logger {
  const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug');
  return pino({
    level,
    base: { service: 'eden-api' },
    // Never log credentials or guest contact data.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["idempotency-key"]',
        '*.phone',
        '*.email',
        '*.token',
        '*.accessToken',
      ],
      censor: '[redacted]',
    },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
      : {}),
  });
}
