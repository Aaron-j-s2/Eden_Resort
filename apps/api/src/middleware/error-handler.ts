import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiFailure } from '@eden/shared';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiFailure = {
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Route not found', requestId: String(req.id ?? '') },
  };
  res.status(404).json(body);
};

/** Centralised error handler. Never leaks stack traces, SQL or secrets. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if (err?.type === 'entity.parse.failed') {
    appError = new AppError(400, 'INVALID_JSON', 'Request body is not valid JSON');
  } else if (err?.type === 'entity.too.large') {
    appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  } else {
    appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
  }

  if (appError.status >= 500) req.log?.error({ err }, 'Unhandled error');
  else req.log?.info({ code: appError.code, status: appError.status }, 'Request rejected');

  const body: ApiFailure = {
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
      requestId: String(req.id ?? ''),
    },
  };
  res.status(appError.status).json(body);
};
