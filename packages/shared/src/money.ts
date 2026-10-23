/**
 * Money is handled as integer paise in application code and as PostgreSQL
 * numeric(12,2) in the database. Never use floating point for totals.
 */

/** Parse a numeric string from Postgres (e.g. "4500.00") into integer paise. */
export function toPaise(amount: string | number): number {
  const str = typeof amount === 'number' ? amount.toFixed(2) : amount.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(str)) throw new Error(`Invalid money amount: ${amount}`);
  const negative = str.startsWith('-');
  const [whole = '0', frac = ''] = str.replace('-', '').split('.');
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return negative ? -paise : paise;
}

/** Integer paise → "4500.00" string suitable for numeric columns / JSON. */
export function fromPaise(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(paise);
  return `${negative ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function formatINR(amount: string | number): string {
  const paise = toPaise(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export interface QuoteInput {
  nightlyRate: string;
  nights: number;
  rooms: number;
  taxRatePercent: number;
}

export interface Quote {
  nightlyRate: string;
  nights: number;
  rooms: number;
  subtotal: string;
  taxes: string;
  total: string;
  currency: 'INR';
}

/**
 * Mirrors the database function `public.calculate_quote`. The database is the
 * authority for stored bookings; this is used for availability previews and is
 * covered by a test that compares both implementations.
 */
export function calculateQuote({ nightlyRate, nights, rooms, taxRatePercent }: QuoteInput): Quote {
  const subtotal = toPaise(nightlyRate) * nights * rooms;
  // Round half up to the nearest paisa, same as numeric round() in Postgres.
  const taxes = Math.round((subtotal * Math.round(taxRatePercent * 100)) / 10_000);
  return {
    nightlyRate: fromPaise(toPaise(nightlyRate)),
    nights,
    rooms,
    subtotal: fromPaise(subtotal),
    taxes: fromPaise(taxes),
    total: fromPaise(subtotal + taxes),
    currency: 'INR',
  };
}
