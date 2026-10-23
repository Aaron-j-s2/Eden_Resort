/**
 * Hotel stays are date ranges, not timestamp ranges. All operational dates are
 * interpreted in India Standard Time (Asia/Kolkata, UTC+05:30, no DST).
 * Dates are passed around as ISO `YYYY-MM-DD` strings.
 */

export const RESORT_TIME_ZONE = 'Asia/Kolkata';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today's calendar date in IST, as YYYY-MM-DD. */
export function todayInIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RESORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function toUtcMs(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

export function addDays(isoDate: string, days: number): string {
  return new Date(toUtcMs(isoDate) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Number of nights between check-in and check-out. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((toUtcMs(checkOut) - toUtcMs(checkIn)) / 86_400_000);
}

/** Every night of a stay: [checkIn, checkOut). */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) nights.push(d);
  return nights;
}

export function formatDisplayDate(isoDate: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
