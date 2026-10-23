export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'checked_in',
  'checked_out',
  'rejected',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'refunded', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ENQUIRY_STATUSES = ['new', 'in_progress', 'resolved'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_TYPES = ['stay', 'day_visit', 'event', 'group', 'general'] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = {
  stay: 'Stay / accommodation',
  day_visit: 'Day visit',
  event: 'Event or celebration',
  group: 'Group booking',
  general: 'General question',
};

/**
 * Permitted booking status transitions. Enforced in the database function
 * `public.update_booking_status`; mirrored here so the UI only offers valid actions.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  rejected: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  rejected: 'Rejected',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Pay at resort',
  pending: 'Payment pending',
  paid: 'Paid',
  refunded: 'Refunded',
  failed: 'Payment failed',
};

/** Statuses that never consume inventory, regardless of policy. */
export const NON_CONSUMING_STATUSES: readonly BookingStatus[] = ['cancelled', 'rejected', 'checked_out'];
