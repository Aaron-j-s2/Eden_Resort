import type { BookingStatus, EnquiryStatus, EnquiryType, PaymentStatus } from './status.js';
import type { Quote } from './money.js';

/** Standard API response envelope. */
export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown; requestId?: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RoomImage {
  id: string;
  imagePath: string;
  altText: string;
  displayOrder: number;
}

export interface RoomType {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedType: string | null;
  amenities: string[];
  bookingRules: string;
  isSample: boolean;
  images: RoomImage[];
}

export interface AdminRoomType extends RoomType {
  inventoryCount: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityResult {
  room: RoomType;
  availableRooms: number;
  fitsParty: boolean;
  /** Reason the room cannot host the requested party, if any. */
  unavailableReason: 'sold_out' | 'occupancy' | null;
  quote: Quote | null;
}

export interface AvailabilityResponse {
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
  results: AvailabilityResult[];
}

/** What the public may see about a booking. No contact details beyond masked hints. */
export interface PublicBookingSummary {
  reference: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  guestFirstName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
  roomName: string;
  subtotal: string;
  taxes: string;
  total: string;
  currency: string;
  createdAt: string;
}

export interface CreateBookingResponse {
  booking: PublicBookingSummary;
  /** Secret token that lets the guest reopen this confirmation. Shown once. */
  accessToken: string | null;
  replayed: boolean;
}

export interface AdminBookingRow {
  id: string;
  reference: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  roomNames: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
  totalAmount: string;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
}

export interface BookingHistoryEntry {
  id: string;
  previousStatus: BookingStatus | null;
  newStatus: BookingStatus;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
}

export interface StaffNote {
  id: string;
  note: string;
  authorName: string | null;
  createdAt: string;
  kind?: 'note' | 'follow_up';
}

export interface AdminBookingDetail extends AdminBookingRow {
  specialRequests: string | null;
  subtotal: string;
  taxes: string;
  currency: string;
  source: string;
  items: { roomTypeId: string; roomName: string; quantity: number; nightlyRate: string; nights: number; lineTotal: string }[];
  history: BookingHistoryEntry[];
  notes: StaffNote[];
  payments: { id: string; provider: string; amount: string; status: PaymentStatus; verifiedAt: string | null; createdAt: string }[];
}

export interface GuestDetail {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: string;
  bookings: AdminBookingRow[];
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  enquiryType: EnquiryType;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
  notes: StaffNote[];
}

export interface DashboardMetrics {
  today: string;
  totalBookings: number;
  pendingRequests: number;
  confirmedUpcoming: number;
  checkInsToday: number;
  checkOutsToday: number;
  inHouseTonight: number;
  roomsOccupiedTonight: number;
  totalInventory: number;
  openEnquiries: number;
  /** Null unless verified payment records exist. */
  revenueCollected: string | null;
  upcomingArrivals: AdminBookingRow[];
  recentRequests: AdminBookingRow[];
}

export interface CalendarDay {
  date: string;
  roomTypeId: string;
  inventory: number;
  confirmedRooms: number;
  pendingRooms: number;
  checkIns: number;
  checkOuts: number;
}

export interface CalendarResponse {
  from: string;
  to: string;
  pendingHoldsInventory: boolean;
  roomTypes: { id: string; name: string; inventoryCount: number; isActive: boolean }[];
  days: CalendarDay[];
  bookings: AdminBookingRow[];
}

export interface GalleryImage {
  id: string;
  imagePath: string;
  category: string;
  altText: string;
  width: number;
  height: number;
  displayOrder: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'staff';
}
