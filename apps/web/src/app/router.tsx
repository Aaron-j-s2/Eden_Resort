import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { PublicLayout, type RouteHandle } from '@/components/layout/PublicLayout';
import HomePage from '@/pages/HomePage';
import { RouteError } from '@/pages/RouteError';

// Code-split every page except the homepage.
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const RoomsPage = lazy(() => import('@/pages/RoomsPage'));
const RoomDetailsPage = lazy(() => import('@/pages/RoomDetailsPage'));
const ExperiencesPage = lazy(() => import('@/pages/ExperiencesPage'));
const GalleryPage = lazy(() => import('@/pages/GalleryPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const BookingPage = lazy(() => import('@/pages/BookingPage'));
const BookingSuccessPage = lazy(() => import('@/pages/BookingSuccessPage'));
const FindBookingPage = lazy(() => import('@/pages/FindBookingPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const AdminApp = lazy(() => import('@/pages/admin/AdminApp'));

const overlay: RouteHandle = { overlayHeader: true };

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage />, handle: overlay },
      { path: 'about', element: <AboutPage />, handle: overlay },
      { path: 'stay', element: <RoomsPage />, handle: overlay },
      { path: 'stay/:slug', element: <RoomDetailsPage />, handle: overlay },
      { path: 'rooms', element: <Navigate to="/stay" replace /> },
      { path: 'experiences', element: <ExperiencesPage />, handle: overlay },
      { path: 'gallery', element: <GalleryPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'book', element: <BookingPage /> },
      { path: 'booking/confirmation/:reference', element: <BookingSuccessPage /> },
      { path: 'booking/find', element: <FindBookingPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: 'admin/*', element: <AdminApp />, errorElement: <RouteError /> },
];

export const router = createBrowserRouter(routes);
