export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue');
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'You do not have permission to do that');

/** Error codes raised by our plpgsql functions (SQLSTATE P0001, message = code). */
const DB_ERRORS: Record<string, { status: number; message: string }> = {
  INVALID_DATES: { status: 422, message: 'Check-out must be after check-in.' },
  PAST_DATE: { status: 422, message: 'Check-in cannot be in the past.' },
  STAY_TOO_LONG: { status: 422, message: 'Online requests are limited to 30 nights. Please call us for longer stays.' },
  INVALID_PARTY: { status: 422, message: 'Each room needs at least one adult.' },
  ROOM_NOT_FOUND: { status: 404, message: 'That room is not available for booking.' },
  OCCUPANCY_EXCEEDED: { status: 422, message: 'Your party is larger than this room allows. Try adding a room.' },
  NOT_AVAILABLE: { status: 409, message: 'Sorry — this room is no longer available for all of your selected nights.' },
  IDEMPOTENCY_CONFLICT: { status: 409, message: 'This request key was already used for a different booking.' },
  BOOKING_NOT_FOUND: { status: 404, message: 'Booking not found.' },
  INVALID_TRANSITION: { status: 409, message: 'That status change is not permitted.' },
  TOO_EARLY_TO_CHECK_IN: { status: 409, message: 'A guest cannot be checked in before the arrival date.' },
  INVENTORY_CONFLICT: {
    status: 409,
    message: 'Inventory cannot be reduced below rooms already reserved on future nights.',
  },
};

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/** Translate a Supabase/PostgREST error into a safe AppError. */
export function fromDbError(error: PostgrestLikeError, fallbackMessage = 'Something went wrong. Please try again.'): AppError {
  if (error.code === 'P0001' && error.message && DB_ERRORS[error.message]) {
    const known = DB_ERRORS[error.message]!;
    return new AppError(known.status, error.message, known.message, error.details ? { detail: error.details } : undefined);
  }
  if (error.code === '23505') return new AppError(409, 'CONFLICT', 'A record with these details already exists.');
  if (error.code === '23503') return new AppError(409, 'IN_USE', 'This record is referenced by other records.');
  if (error.code === '23514') return new AppError(422, 'CONSTRAINT', 'The submitted values are not valid.');
  return new AppError(500, 'DATABASE_ERROR', fallbackMessage, undefined);
}
