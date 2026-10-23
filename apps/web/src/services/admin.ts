import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminBookingDetail,
  AdminBookingRow,
  AdminRoomType,
  AdminUser,
  BookingStatus,
  CalendarResponse,
  DashboardMetrics,
  Enquiry,
  EnquiryStatus,
  GalleryImage,
  GuestDetail,
  Paginated,
  RoomTypeInput,
  SettingKey,
  SiteSettings,
} from '@eden/shared';
import { useAuth } from '@/app/auth';
import { apiRequest, ApiError, buildUrl, type RequestOptions } from '@/lib/api';

/** Authenticated request helper bound to the current staff session. */
export function useAdminApi() {
  const { getToken, signOut } = useAuth();
  return async function adminApi<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const token = await getToken();
    try {
      return await apiRequest<T>(`/admin${path}`, { ...opts, token });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) await signOut();
      throw err;
    }
  };
}

export const adminKeys = {
  me: ['admin', 'me'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  bookings: (q: object) => ['admin', 'bookings', q] as const,
  booking: (id: string) => ['admin', 'booking', id] as const,
  guest: (id: string) => ['admin', 'guest', id] as const,
  calendar: (from: string, to: string) => ['admin', 'calendar', from, to] as const,
  enquiries: (q: object) => ['admin', 'enquiries', q] as const,
  enquiry: (id: string) => ['admin', 'enquiry', id] as const,
  rooms: ['admin', 'rooms'] as const,
  room: (id: string) => ['admin', 'room', id] as const,
  settings: ['admin', 'settings'] as const,
  gallery: ['admin', 'gallery'] as const,
};

export function useMe(enabled: boolean) {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.me, queryFn: () => api<AdminUser>('/me'), enabled, retry: false, staleTime: 5 * 60_000 });
}

export function useDashboard() {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.dashboard, queryFn: () => api<DashboardMetrics>('/dashboard'), refetchInterval: 60_000 });
}

export interface BookingListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: BookingStatus | '';
  dateField?: 'check_in' | 'check_out' | 'created_at';
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useBookings(q: BookingListQuery) {
  const api = useAdminApi();
  return useQuery({
    queryKey: adminKeys.bookings(q),
    queryFn: () => api<Paginated<AdminBookingRow>>('/bookings', { query: { ...q } }),
    placeholderData: keepPreviousData,
  });
}

/** Download the filtered CSV with the bearer token (a plain link cannot send it). */
export function useExportBookings() {
  const { getToken } = useAuth();
  return async (q: Omit<BookingListQuery, 'page' | 'pageSize'>) => {
    const token = await getToken();
    const res = await fetch(buildUrl('/admin/reports/bookings.csv', { ...q }), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const name = /filename="?([^"]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'bookings.csv';
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
  };
}

export function useBooking(id: string) {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.booking(id), queryFn: () => api<AdminBookingDetail>(`/bookings/${id}`) });
}

function useInvalidateBookings() {
  const qc = useQueryClient();
  return (detail: AdminBookingDetail) => {
    qc.setQueryData(adminKeys.booking(detail.id), detail);
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    qc.invalidateQueries({ queryKey: adminKeys.dashboard });
    qc.invalidateQueries({ queryKey: ['admin', 'calendar'] });
    qc.invalidateQueries({ queryKey: adminKeys.guest(detail.guestId) });
  };
}

export function useChangeBookingStatus(id: string) {
  const api = useAdminApi();
  const done = useInvalidateBookings();
  return useMutation({
    mutationFn: (v: { status: BookingStatus; note?: string }) =>
      api<AdminBookingDetail>(`/bookings/${id}/status`, { method: 'PATCH', body: v }),
    onSuccess: done,
  });
}

export function useAddBookingNote(id: string) {
  const api = useAdminApi();
  const done = useInvalidateBookings();
  return useMutation({
    mutationFn: (note: string) => api<AdminBookingDetail>(`/bookings/${id}/notes`, { method: 'POST', body: { note } }),
    onSuccess: done,
  });
}

export function useGuest(id: string) {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.guest(id), queryFn: () => api<GuestDetail>(`/guests/${id}`) });
}

export function useCalendar(from: string, to: string) {
  const api = useAdminApi();
  return useQuery({
    queryKey: adminKeys.calendar(from, to),
    queryFn: () => api<CalendarResponse>('/availability', { query: { from, to } }),
    placeholderData: keepPreviousData,
  });
}

export function useEnquiries(q: { page: number; pageSize: number; q?: string; status?: EnquiryStatus | ''; type?: string }) {
  const api = useAdminApi();
  return useQuery({
    queryKey: adminKeys.enquiries(q),
    queryFn: () => api<Paginated<Enquiry>>('/enquiries', { query: { ...q } }),
    placeholderData: keepPreviousData,
  });
}

export function useEnquiry(id: string | null) {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.enquiry(id ?? ''), queryFn: () => api<Enquiry>(`/enquiries/${id}`), enabled: Boolean(id) });
}

export function useUpdateEnquiry(id: string) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const onSuccess = (e: Enquiry) => {
    qc.setQueryData(adminKeys.enquiry(id), e);
    qc.invalidateQueries({ queryKey: ['admin', 'enquiries'] });
    qc.invalidateQueries({ queryKey: adminKeys.dashboard });
  };
  return {
    status: useMutation({
      mutationFn: (status: EnquiryStatus) => api<Enquiry>(`/enquiries/${id}`, { method: 'PATCH', body: { status } }),
      onSuccess,
    }),
    note: useMutation({
      mutationFn: (v: { note: string; kind: 'note' | 'follow_up' }) => api<Enquiry>(`/enquiries/${id}/notes`, { method: 'POST', body: v }),
      onSuccess,
    }),
  };
}

export function useAdminRooms() {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.rooms, queryFn: () => api<AdminRoomType[]>('/room-types') });
}

export function useAdminRoom(id: string | undefined) {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.room(id ?? ''), queryFn: () => api<AdminRoomType>(`/room-types/${id}`), enabled: Boolean(id) });
}

export function useRoomMutations() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const refresh = (room?: AdminRoomType) => {
    if (room) qc.setQueryData(adminKeys.room(room.id), room);
    qc.invalidateQueries({ queryKey: adminKeys.rooms });
    qc.invalidateQueries({ queryKey: ['rooms'] });
    qc.invalidateQueries({ queryKey: ['admin', 'calendar'] });
  };
  return {
    create: useMutation({ mutationFn: (body: RoomTypeInput) => api<AdminRoomType>('/room-types', { method: 'POST', body }), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: RoomTypeInput }) => api<AdminRoomType>(`/room-types/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => api<void>(`/room-types/${id}`, { method: 'DELETE' }), onSuccess: () => refresh() }),
    addImage: useMutation({
      mutationFn: ({ id, body }: { id: string; body: { imagePath: string; altText: string; displayOrder: number } }) =>
        api<AdminRoomType>(`/room-types/${id}/images`, { method: 'POST', body }),
      onSuccess: refresh,
    }),
    removeImage: useMutation({
      mutationFn: ({ id, imageId }: { id: string; imageId: string }) => api<AdminRoomType>(`/room-types/${id}/images/${imageId}`, { method: 'DELETE' }),
      onSuccess: refresh,
    }),
  };
}

export function useAdminSettings() {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.settings, queryFn: () => api<Partial<SiteSettings>>('/settings') });
}

export function useSaveSetting() {
  const api = useAdminApi();
  const qc = useQueryClient();
  return useMutation({
    // The server validates `value` against the schema for `key`.
    mutationFn: (v: { key: SettingKey; value: SiteSettings[SettingKey] }) => api('/settings', { method: 'PATCH', body: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.settings });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
}

export type AdminGalleryImage = GalleryImage & { isPublished: boolean; adminNote: string | null };

export function useAdminGallery() {
  const api = useAdminApi();
  return useQuery({ queryKey: adminKeys.gallery, queryFn: () => api<AdminGalleryImage[]>('/gallery') });
}

export function useUpdateGalleryImage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<{ isPublished: boolean; category: string; altText: string; displayOrder: number }> }) =>
      api<AdminGalleryImage>(`/gallery/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.gallery });
      qc.invalidateQueries({ queryKey: ['gallery'] });
    },
  });
}
