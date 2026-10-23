import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { ApiSuccess } from '@eden/shared';
import { AppError } from './errors.js';

export function send<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  const body: ApiSuccess<T> = meta ? { ok: true, data, meta } : { ok: true, data };
  return res.status(status).json(body);
}

function zodDetails(error: z.ZodError) {
  return error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

export function parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.', zodDetails(result.error));
  }
  return result.data;
}

export const body = <S extends z.ZodType>(req: Request, schema: S) => parse(schema, req.body);
export const query = <S extends z.ZodType>(req: Request, schema: S) => parse(schema, req.query);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuidParam(req: Request, name = 'id'): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !UUID.test(value)) throw new AppError(404, 'NOT_FOUND', 'Not found');
  return value;
}

/** Strip characters that have meaning in PostgREST filter syntax. */
export function sanitizeSearch(q: string | undefined): string | undefined {
  const cleaned = q?.replace(/[^\p{L}\p{N}\s@.+-]/gu, '').trim();
  return cleaned ? cleaned.slice(0, 100) : undefined;
}
