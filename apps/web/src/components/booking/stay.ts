import { addDays, nightsBetween, todayInIST } from '@eden/shared/core';

export interface StayState {
  checkIn: string | null;
  checkOut: string | null;
  adults: number;
  children: number;
  rooms: number;
}

export const DEFAULT_STAY: StayState = { checkIn: null, checkOut: null, adults: 2, children: 0, rooms: 1 };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clampInt = (v: string | null, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function stayFromParams(params: URLSearchParams): StayState {
  const today = todayInIST();
  const checkIn = params.get('checkIn');
  const checkOut = params.get('checkOut');
  const validIn = checkIn && ISO.test(checkIn) && checkIn >= today ? checkIn : null;
  const validOut = validIn && checkOut && ISO.test(checkOut) && checkOut > validIn ? checkOut : null;
  return {
    checkIn: validIn,
    checkOut: validOut,
    adults: clampInt(params.get('adults'), 1, 20, DEFAULT_STAY.adults),
    children: clampInt(params.get('children'), 0, 20, DEFAULT_STAY.children),
    rooms: clampInt(params.get('rooms'), 1, 10, DEFAULT_STAY.rooms),
  };
}

export function stayToParams(stay: StayState, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams(extra);
  if (stay.checkIn) p.set('checkIn', stay.checkIn);
  if (stay.checkOut) p.set('checkOut', stay.checkOut);
  p.set('adults', String(stay.adults));
  p.set('children', String(stay.children));
  p.set('rooms', String(stay.rooms));
  return p;
}

export const stayNights = (s: StayState) => (s.checkIn && s.checkOut ? nightsBetween(s.checkIn, s.checkOut) : 0);

/** A sensible default suggestion: two nights starting next week. */
export function suggestedStay(): Pick<StayState, 'checkIn' | 'checkOut'> {
  const checkIn = addDays(todayInIST(), 7);
  return { checkIn, checkOut: addDays(checkIn, 2) };
}

/** Local Date at midnight for an ISO date (DayPicker works in local dates). */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
