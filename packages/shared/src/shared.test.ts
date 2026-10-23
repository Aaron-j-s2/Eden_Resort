import { describe, expect, it } from 'vitest';
import {
  addDays,
  calculateQuote,
  canTransition,
  eachNight,
  fromPaise,
  makeAvailabilityQuerySchema,
  makeBookingRequestSchema,
  nightsBetween,
  phoneSchema,
  toPaise,
  todayInIST,
} from './index.js';

describe('IST dates', () => {
  it('uses Asia/Kolkata for "today"', () => {
    // 2026-01-01 20:00 UTC is already 2 Jan 01:30 in India.
    expect(todayInIST(new Date('2026-01-01T20:00:00Z'))).toBe('2026-01-02');
    expect(todayInIST(new Date('2026-01-01T18:00:00Z'))).toBe('2026-01-01');
  });
  it('counts nights as a date range', () => {
    expect(nightsBetween('2026-03-30', '2026-04-02')).toBe(3);
    expect(eachNight('2026-03-30', '2026-04-02')).toEqual(['2026-03-30', '2026-03-31', '2026-04-01']);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('money', () => {
  it('round-trips paise without floating point errors', () => {
    expect(toPaise('4500.10')).toBe(450010);
    expect(toPaise('0.1')).toBe(10);
    expect(fromPaise(450010)).toBe('4500.10');
  });
  it('calculates a quote', () => {
    expect(calculateQuote({ nightlyRate: '3999.99', nights: 3, rooms: 2, taxRatePercent: 12 })).toEqual({
      nightlyRate: '3999.99',
      nights: 3,
      rooms: 2,
      subtotal: '23999.94',
      taxes: '2879.99',
      total: '26879.93',
      currency: 'INR',
    });
  });
});

describe('booking schema', () => {
  const today = () => '2026-06-10';
  const schema = makeBookingRequestSchema(today);
  const base = {
    checkIn: '2026-06-12',
    checkOut: '2026-06-14',
    adults: 2,
    children: 0,
    rooms: 1,
    roomTypeId: '6f1c2c4e-8f0e-4a43-9a43-1b9a1a6a1a11',
    guest: { fullName: 'Asha Raman', phone: '95974 45838', email: 'ASHA@example.com' },
  };
  it('accepts a valid request and normalises contact data', () => {
    const r = schema.parse(base);
    expect(r.guest.phone).toBe('+919597445838');
    expect(r.guest.email).toBe('asha@example.com');
  });
  it('rejects past dates and inverted ranges', () => {
    expect(schema.safeParse({ ...base, checkIn: '2026-06-09' }).success).toBe(false);
    expect(schema.safeParse({ ...base, checkOut: '2026-06-12' }).success).toBe(false);
    expect(schema.safeParse({ ...base, checkIn: '2026-02-30' }).success).toBe(false);
  });
  it('rejects more rooms than adults', () => {
    expect(schema.safeParse({ ...base, rooms: 3, adults: 2 }).success).toBe(false);
  });
  it('requires guest details', () => {
    expect(schema.safeParse({ ...base, guest: { fullName: '', phone: '', email: '' } }).success).toBe(false);
  });
  it('limits stay length', () => {
    expect(makeAvailabilityQuerySchema(today).safeParse({ ...base, checkOut: '2026-08-01' }).success).toBe(false);
  });
});

describe('phone', () => {
  it('normalises Indian numbers', () => {
    expect(phoneSchema.parse('+91 95974-45838')).toBe('+919597445838');
    expect(phoneSchema.parse('919597445838')).toBe('+919597445838');
    expect(phoneSchema.safeParse('12345').success).toBe(false);
  });
});

describe('status transitions', () => {
  it('permits only documented transitions', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'checked_out')).toBe(false);
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
  });
});
