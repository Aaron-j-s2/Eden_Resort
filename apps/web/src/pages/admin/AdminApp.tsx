import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Spinner } from '@/components/ui/States';
import { AdminLayout } from './AdminLayout';
import LoginPage from './LoginPage';
import { RequireStaff } from './RequireStaff';

const DashboardPage = lazy(() => import('./DashboardPage'));
const BookingsPage = lazy(() => import('./BookingsPage'));
const BookingDetailPage = lazy(() => import('./BookingDetailPage'));
const GuestPage = lazy(() => import('./GuestPage'));
const CalendarPage = lazy(() => import('./CalendarPage'));
const EnquiriesPage = lazy(() => import('./EnquiriesPage'));
const RoomsAdminPage = lazy(() => import('./RoomsAdminPage'));
const RoomEditPage = lazy(() => import('./RoomEditPage'));
const GalleryAdminPage = lazy(() => import('./GalleryAdminPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

/** /admin/* — a separate application area with its own layout and guard. */
export default function AdminApp() {
  return (
    <>
      <title>Admin · Eden Falls Resort</title>
      <meta name="robots" content="noindex, nofollow" />
      <Suspense fallback={<Spinner className="min-h-svh justify-center" />}>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<RequireStaff />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:id" element={<BookingDetailPage />} />
              <Route path="guests/:id" element={<GuestPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="enquiries" element={<EnquiriesPage />} />
              <Route element={<RequireStaff role="admin" />}>
                <Route path="rooms" element={<RoomsAdminPage />} />
                <Route path="rooms/new" element={<RoomEditPage />} />
                <Route path="rooms/:id" element={<RoomEditPage />} />
                <Route path="gallery" element={<GalleryAdminPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
