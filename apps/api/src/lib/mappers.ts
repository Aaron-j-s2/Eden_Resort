import type { AdminBookingRow, AdminRoomType, RoomImage, RoomType } from '@eden/shared';
import type { BookingStatus, PaymentStatus } from '@eden/shared';

/** Postgres numeric arrives as a number or string depending on the path; normalise to "1234.00". */
export function money(value: string | number): string {
  return typeof value === 'number' ? value.toFixed(2) : Number(value).toFixed(2);
}

export interface RoomImageRow {
  id: string;
  image_path: string;
  alt_text: string;
  display_order: number;
}

export interface RoomTypeRow {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  base_price: string | number;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  inventory_count: number;
  bed_type: string | null;
  amenities: string[];
  booking_rules: string;
  is_active: boolean;
  is_sample: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  room_images?: RoomImageRow[];
}

export const ROOM_SELECT = '*, room_images(id, image_path, alt_text, display_order)';

export function toRoomImage(row: RoomImageRow): RoomImage {
  return { id: row.id, imagePath: row.image_path, altText: row.alt_text, displayOrder: row.display_order };
}

export function toPublicRoom(row: RoomTypeRow): RoomType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    basePrice: money(row.base_price),
    maxAdults: row.max_adults,
    maxChildren: row.max_children,
    maxOccupancy: row.max_occupancy,
    bedType: row.bed_type,
    amenities: row.amenities,
    bookingRules: row.booking_rules,
    isSample: row.is_sample,
    images: (row.room_images ?? []).map(toRoomImage).sort((a, b) => a.displayOrder - b.displayOrder),
  };
}

export function toAdminRoom(row: RoomTypeRow): AdminRoomType {
  return {
    ...toPublicRoom(row),
    inventoryCount: row.inventory_count,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface BookingOverviewRow {
  id: string;
  public_reference: string;
  guest_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  room_names: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  number_of_rooms: number;
  total_amount: string | number;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  created_at: string;
}

export function toAdminBookingRow(row: BookingOverviewRow): AdminBookingRow {
  return {
    id: row.id,
    reference: row.public_reference,
    guestId: row.guest_id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    guestEmail: row.guest_email,
    roomNames: row.room_names,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    adults: row.adults,
    children: row.children,
    rooms: row.number_of_rooms,
    totalAmount: money(row.total_amount),
    paymentStatus: row.payment_status,
    status: row.booking_status,
    createdAt: row.created_at,
  };
}
