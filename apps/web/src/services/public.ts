import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type {
  AvailabilityResponse,
  BookingRequestInput,
  CreateBookingResponse,
  EnquiryInput,
  GalleryImage,
  PublicBookingSummary,
  PublicSiteSettings,
  RoomType,
} from '@eden/shared';
import { apiRequest } from '@/lib/api';

export const publicKeys = {
  settings: ['site-settings'] as const,
  rooms: ['rooms'] as const,
  room: (slug: string) => ['rooms', slug] as const,
  gallery: ['gallery'] as const,
  availability: (q: AvailabilityParams) => ['availability', q] as const,
};

export function useSiteSettings() {
  return useQuery({
    queryKey: publicKeys.settings,
    queryFn: ({ signal }) => apiRequest<Partial<PublicSiteSettings>>('/site-settings', { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useRooms() {
  return useQuery({
    queryKey: publicKeys.rooms,
    queryFn: ({ signal }) => apiRequest<RoomType[]>('/rooms', { signal }),
    staleTime: 60_000,
  });
}

export function useRoom(slug: string) {
  return useQuery({
    queryKey: publicKeys.room(slug),
    queryFn: ({ signal }) => apiRequest<RoomType>(`/rooms/${encodeURIComponent(slug)}`, { signal }),
    staleTime: 60_000,
    retry: (count, err) => (err as { status?: number }).status !== 404 && count < 2,
  });
}

export function useGallery() {
  return useQuery({
    queryKey: publicKeys.gallery,
    queryFn: ({ signal }) => apiRequest<GalleryImage[]>('/gallery', { signal }),
    staleTime: 5 * 60_000,
  });
}

export interface AvailabilityParams {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
}

export function useAvailability(params: AvailabilityParams | null) {
  return useQuery({
    queryKey: publicKeys.availability(params ?? ({} as AvailabilityParams)),
    queryFn: ({ signal }) =>
      apiRequest<AvailabilityResponse>('/availability', { query: { ...params }, signal }),
    enabled: params !== null,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: BookingRequestInput; idempotencyKey: string }) =>
      apiRequest<CreateBookingResponse>('/bookings', {
        method: 'POST',
        body: payload,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
  });
}

export function lookupBooking(params: { reference: string; token?: string; phone?: string }) {
  return apiRequest<PublicBookingSummary>('/bookings/lookup', { query: params });
}

export function useSendEnquiry() {
  return useMutation({
    mutationFn: (payload: EnquiryInput) => apiRequest<{ received: true }>('/enquiries', { method: 'POST', body: payload }),
  });
}
