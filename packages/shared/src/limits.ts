/** Booking limits shared by validation (schemas.ts) and the UI. Zod-free. */
export const MAX_NIGHTS = 30;
export const MAX_ROOMS_PER_BOOKING = 10;
export const BOOKING_REFERENCE_PATTERN = /^EF-[A-HJ-NP-Z2-9]{8}$/;
