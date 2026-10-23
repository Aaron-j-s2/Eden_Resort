import type { AvailabilityResponse, PublicBookingSummary, RoomType } from '@eden/shared/core';

export const room: RoomType = {
  id: 'a1f3c1d2-0000-4000-8000-000000000001',
  name: 'Cottage (sample listing)',
  slug: 'sample-cottage',
  shortDescription: 'Sample listing',
  description: '',
  basePrice: '4500.00',
  maxAdults: 2,
  maxChildren: 1,
  maxOccupancy: 3,
  bedType: null,
  amenities: [],
  bookingRules: '',
  isSample: true,
  images: [{ id: 'i1', imagePath: '/images/resort/stay/cottage-evening', altText: 'A cottage at dusk', displayOrder: 0 }],
};

export function availability(overrides: Partial<AvailabilityResponse> = {}): AvailabilityResponse {
  return {
    checkIn: '2030-01-10',
    checkOut: '2030-01-12',
    nights: 2,
    adults: 2,
    children: 0,
    rooms: 1,
    results: [
      {
        room,
        availableRooms: 3,
        fitsParty: true,
        unavailableReason: null,
        quote: { nightlyRate: '4500.00', nights: 2, rooms: 1, subtotal: '9000.00', taxes: '0.00', total: '9000.00', currency: 'INR' },
      },
    ],
    ...overrides,
  };
}

export const booking: PublicBookingSummary = {
  reference: 'EF-7KQ2M9XA',
  status: 'pending',
  paymentStatus: 'unpaid',
  guestFirstName: 'Asha',
  checkIn: '2030-01-10',
  checkOut: '2030-01-12',
  nights: 2,
  adults: 2,
  children: 0,
  rooms: 1,
  roomName: 'Cottage (sample listing)',
  subtotal: '9000.00',
  taxes: '0.00',
  total: '9000.00',
  currency: 'INR',
  createdAt: '2029-12-01T10:00:00Z',
};
