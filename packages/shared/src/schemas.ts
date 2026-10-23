import { z } from 'zod';
import { isIsoDate, nightsBetween, todayInIST } from './dates.js';
import { BOOKING_STATUSES, ENQUIRY_STATUSES, ENQUIRY_TYPES, PAYMENT_STATUSES } from './status.js';

import { MAX_NIGHTS, MAX_ROOMS_PER_BOOKING, BOOKING_REFERENCE_PATTERN } from './limits.js';

export { MAX_NIGHTS, MAX_ROOMS_PER_BOOKING, BOOKING_REFERENCE_PATTERN };

export const isoDateSchema = z
  .string()
  .refine(isIsoDate, { message: 'Use a valid date (YYYY-MM-DD)' });

/** Indian mobile or international number; stored normalised as +<digits>. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((v) => v.replace(/[\s\-().]/g, ''))
  .refine((v) => /^\+?\d{10,15}$/.test(v), { message: 'Enter a valid phone number' })
  .transform((v) => {
    if (v.startsWith('+')) return v;
    if (v.length === 10) return `+91${v}`;
    if (v.length === 12 && v.startsWith('91')) return `+${v}`;
    return `+${v}`;
  });

const optionalEmail = z
  .union([z.literal(''), z.email('Enter a valid email address').max(254)])
  .optional()
  .transform((v) => (v ? v.toLowerCase() : undefined));

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Please enter your full name')
  .max(120, 'Name is too long');

interface StayFields {
  checkIn: string;
  checkOut: string;
}

function refineStay<T extends StayFields>(value: T, ctx: z.RefinementCtx, today: string) {
  if (value.checkIn < today) {
    ctx.addIssue({ code: 'custom', path: ['checkIn'], message: 'Check-in cannot be in the past' });
  }
  if (value.checkOut <= value.checkIn) {
    ctx.addIssue({ code: 'custom', path: ['checkOut'], message: 'Check-out must be after check-in' });
  } else if (nightsBetween(value.checkIn, value.checkOut) > MAX_NIGHTS) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkOut'],
      message: `Online requests are limited to ${MAX_NIGHTS} nights — please call us for longer stays`,
    });
  }
}

const stayShape = {
  checkIn: isoDateSchema,
  checkOut: isoDateSchema,
  adults: z.coerce.number().int().min(1, 'At least one adult is required').max(40),
  children: z.coerce.number().int().min(0).max(40).default(0),
  rooms: z.coerce.number().int().min(1).max(MAX_ROOMS_PER_BOOKING).default(1),
};

/** Factory so tests (and the API) can pin "today". */
export function makeAvailabilityQuerySchema(today: () => string = () => todayInIST()) {
  return z
    .object(stayShape)
    .superRefine((v, ctx) => {
      refineStay(v, ctx, today());
      if (v.rooms > v.adults) {
        ctx.addIssue({ code: 'custom', path: ['rooms'], message: 'Each room needs at least one adult' });
      }
    });
}
export const availabilityQuerySchema = makeAvailabilityQuerySchema();
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const guestDetailsSchema = z.object({
  fullName: nameSchema,
  phone: phoneSchema,
  email: z.email('Enter a valid email address').max(254).transform((v) => v.toLowerCase()),
  specialRequests: z.string().trim().max(1000, 'Please keep requests under 1000 characters').optional(),
});
export type GuestDetailsInput = z.input<typeof guestDetailsSchema>;

export function makeBookingRequestSchema(today: () => string = () => todayInIST()) {
  return z
    .object({
      ...stayShape,
      roomTypeId: z.uuid('Select a room'),
      guest: guestDetailsSchema,
    })
    .superRefine((v, ctx) => {
      refineStay(v, ctx, today());
      if (v.rooms > v.adults) {
        ctx.addIssue({ code: 'custom', path: ['rooms'], message: 'Each room needs at least one adult' });
      }
    });
}
export const bookingRequestSchema = makeBookingRequestSchema();
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;


export const bookingLookupSchema = z.union([
  z.object({
    reference: z.string().trim().toUpperCase().regex(BOOKING_REFERENCE_PATTERN, 'Invalid reference'),
    token: z.string().min(20).max(100),
  }),
  z.object({
    reference: z.string().trim().toUpperCase().regex(BOOKING_REFERENCE_PATTERN, 'Invalid reference'),
    phone: phoneSchema,
  }),
]);
export type BookingLookup = z.infer<typeof bookingLookupSchema>;

export const enquirySchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmail,
  enquiryType: z.enum(ENQUIRY_TYPES),
  message: z.string().trim().min(10, 'Please tell us a little more (at least 10 characters)').max(2000),
  consent: z.literal(true, { error: 'Please accept the privacy notice so we can reply' }),
  /** Honeypot field: must stay empty. Bots tend to fill every input. */
  website: z.string().max(0).optional(),
});
export type EnquiryInput = z.input<typeof enquirySchema>;

/* ---------------------------------- Admin --------------------------------- */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminBookingListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  dateField: z.enum(['check_in', 'check_out', 'created_at']).default('check_in'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  sort: z
    .enum(['created_at', 'check_in', 'check_out', 'total_amount', 'guest_name'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

export const noteSchema = z.object({
  note: z.string().trim().min(1, 'Note cannot be empty').max(2000),
});

export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

export const roomTypeInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens'),
    shortDescription: z.string().trim().max(300).default(''),
    description: z.string().trim().max(5000).default(''),
    basePrice: z
      .string()
      .trim()
      .regex(/^\d{1,8}(\.\d{1,2})?$/, 'Enter a price in rupees, e.g. 4500 or 4500.50')
      .refine((v) => Number(v) > 0, 'Price must be greater than zero'),
    maxAdults: z.coerce.number().int().min(1).max(20),
    maxChildren: z.coerce.number().int().min(0).max(20),
    maxOccupancy: z.coerce.number().int().min(1).max(40),
    inventoryCount: z.coerce.number().int().min(0).max(500),
    bedType: z.string().trim().max(120).nullable().default(null),
    amenities: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
    bookingRules: z.string().trim().max(2000).default(''),
    isActive: z.boolean().default(false),
    displayOrder: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .refine((v) => v.maxOccupancy >= v.maxAdults, {
    path: ['maxOccupancy'],
    message: 'Max occupancy must be at least the adult limit',
  })
  .refine((v) => v.maxOccupancy <= v.maxAdults + v.maxChildren, {
    path: ['maxOccupancy'],
    message: 'Max occupancy cannot exceed adults + children limits',
  });
export type RoomTypeInput = z.input<typeof roomTypeInputSchema>;

export const roomImageInputSchema = z.object({
  imagePath: z
    .string()
    .trim()
    .regex(/^\/images\/[a-z0-9/_.-]+$/i, 'Use a path under /images/, e.g. /images/resort/rooms/room-1'),
  altText: z.string().trim().min(5, 'Describe the image for screen-reader users').max(300),
  displayOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const enquiryUpdateSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES).optional(),
});

export const enquiryNoteSchema = z.object({
  note: z.string().trim().min(1).max(2000),
  kind: z.enum(['note', 'follow_up']).default('note'),
});

export const adminEnquiryListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  type: z.enum(ENQUIRY_TYPES).optional(),
});

export const calendarQuerySchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .refine((v) => v.to > v.from && nightsBetween(v.from, v.to) <= 62, {
    message: 'Calendar range must be between 1 and 62 days',
  });
