import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { stayFromParams } from '@/components/booking/stay';
import BookingPage from '@/pages/BookingPage';
import BookingSuccessPage from '@/pages/BookingSuccessPage';
import ContactPage from '@/pages/ContactPage';
import HomePage from '@/pages/HomePage';
import { RequireStaff } from '@/pages/admin/RequireStaff';
import { availability, booking, room } from './fixtures';
import { mockApi, renderAt, renderRoutes } from './render';

const baseApi = {
  'GET /api/site-settings': () => ({}),
  'GET /api/rooms': () => [room],
};

describe('public pages', () => {
  it('renders the homepage with the hero, story and real rooms', async () => {
    mockApi(baseApi);
    renderRoutes([{ element: <PublicLayout />, children: [{ index: true, element: <HomePage /> }] }], '/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Find Your Quiet in the Heart of Nature.');
    expect(screen.getByRole('link', { name: /Explore the Stay/ })).toHaveAttribute('href', '/stay');
    expect(await screen.findByRole('heading', { name: 'Cottage (sample listing)' })).toBeInTheDocument();
    expect(screen.getAllByText(/Sample listing — room details and price are placeholders/).length).toBeGreaterThan(0);
  });

  it('shows navigation and click-to-call contact details', () => {
    mockApi(baseApi);
    renderRoutes([{ element: <PublicLayout />, children: [{ index: true, element: <div /> }] }], '/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const label of ['Stay', 'Experiences', 'Gallery', 'About', 'Contact']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link', { name: /95974 45838/ })[0]).toHaveAttribute('href', 'tel:+919597445838');
  });

  it('shows an error state when rooms fail to load', async () => {
    mockApi({ 'GET /api/site-settings': () => ({}), 'GET /api/rooms': { status: 500, error: { code: 'DATABASE_ERROR', message: 'down' } } });
    renderRoutes([{ element: <PublicLayout />, children: [{ index: true, element: <HomePage /> }] }], '/');
    expect(await screen.findByText('Accommodation could not be loaded right now.')).toBeInTheDocument();
  });
});

describe('stay search parameters', () => {
  it('ignores past or inverted dates from the URL', () => {
    expect(stayFromParams(new URLSearchParams('checkIn=2001-01-01&checkOut=2001-01-03')).checkIn).toBeNull();
    expect(stayFromParams(new URLSearchParams('checkIn=2099-01-05&checkOut=2099-01-03')).checkOut).toBeNull();
    const ok = stayFromParams(new URLSearchParams('checkIn=2099-01-05&checkOut=2099-01-07&adults=3&rooms=50'));
    expect(ok).toMatchObject({ checkIn: '2099-01-05', checkOut: '2099-01-07', adults: 3, rooms: 10 });
  });
});

describe('booking flow', () => {
  const path = '/book?checkIn=2099-01-10&checkOut=2099-01-12&adults=2&children=0&rooms=1';

  it('asks for dates when none are chosen', async () => {
    mockApi(baseApi);
    renderAt(<BookingPage />, '/book');
    expect(screen.getByRole('heading', { name: 'When would you like to stay?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    expect(await screen.findByRole('dialog', { name: 'Your dates' })).toBeInTheDocument();
  });

  it('lists available rooms with the server quote', async () => {
    mockApi({ ...baseApi, 'GET /api/availability': () => availability() });
    renderAt(<BookingPage />, path);
    expect(await screen.findByRole('heading', { name: 'Cottage (sample listing)' })).toBeInTheDocument();
    expect(screen.getByText('₹9,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeEnabled();
  });

  it('shows sold-out and empty states', async () => {
    mockApi({
      ...baseApi,
      'GET /api/availability': () => availability({ results: [{ ...availability().results[0]!, unavailableReason: 'sold_out', quote: null, availableRooms: 0 }] }),
    });
    renderAt(<BookingPage />, path);
    expect(await screen.findByText('Fully booked for these dates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  });

  it('validates guest details before review, then submits with an idempotency key', async () => {
    const post = vi.fn((_init: RequestInit) => ({ booking, accessToken: 'tok_abcdefghijklmnopqrstuvwxyz', replayed: false }));
    mockApi({ ...baseApi, 'GET /api/availability': () => availability(), 'POST /api/bookings': (_u, init) => post(init!) });
    const { router } = renderAt(<BookingPage />, `${path}&room=${room.id}&step=details`);

    await userEvent.click(await screen.findByRole('button', { name: 'Review request' }));
    expect(await screen.findByText('Please enter your full name')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Full name/), 'Asha Raman');
    await userEvent.type(screen.getByLabelText(/^Phone/), '9597445838');
    await userEvent.type(screen.getByLabelText(/^Email/), 'asha@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Review request' }));
    expect(await screen.findByRole('heading', { name: 'Review & send' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Send reservation request' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/booking/confirmation/EF-7KQ2M9XA'));
    const init = post.mock.calls[0]![0];
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty('total');
    expect(body.guest).toMatchObject({ fullName: 'Asha Raman', phone: '+919597445838' });
  });
});

const renderConfirmation = (path: string) => renderRoutes([{ path: '/booking/confirmation/:reference', element: <BookingSuccessPage /> }], path);

describe('booking confirmation states', () => {
  it('shows a pending request with next steps and pay-later status', async () => {
    const lookup = vi.fn((url: URL) => {
      expect(url.searchParams.get('reference')).toBe('EF-7KQ2M9XA');
      expect(url.searchParams.get('token')).toBe('tok_abcdefghijklmnopqrstuvwxyz');
      return booking;
    });
    mockApi({ ...baseApi, 'GET /api/bookings/lookup': lookup });
    renderConfirmation('/booking/confirmation/EF-7KQ2M9XA#t=tok_abcdefghijklmnopqrstuvwxyz');
    expect(await screen.findByTestId('booking-reference')).toHaveTextContent('EF-7KQ2M9XA');
    expect(screen.getByText(/The resort will call you to confirm/)).toBeInTheDocument();
    expect(screen.getByText('Pay at resort')).toBeInTheDocument();
  });

  it('shows a confirmed booking', async () => {
    mockApi({ ...baseApi, 'GET /api/bookings/lookup': () => ({ ...booking, status: 'confirmed' }) });
    renderConfirmation('/booking/confirmation/EF-7KQ2M9XA#t=tok_abcdefghijklmnopqrstuvwxyz');
    expect(await screen.findByText(/Your stay is confirmed/)).toBeInTheDocument();
  });

  it('falls back to reference + phone lookup when the link is invalid', async () => {
    mockApi({ ...baseApi, 'GET /api/bookings/lookup': { status: 404, error: { code: 'BOOKING_NOT_FOUND', message: 'not found' } } });
    renderConfirmation('/booking/confirmation/EF-7KQ2M9XA#t=bad-token-bad-token-bad');
    expect(await screen.findByRole('heading', { name: "We couldn't open this link" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Booking reference/)).toHaveValue('EF-7KQ2M9XA');
  });
});

describe('contact form', () => {
  it('validates and requires privacy consent', async () => {
    mockApi(baseApi);
    renderAt(<ContactPage />, '/contact');
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByText('Please accept the privacy notice so we can reply')).toBeInTheDocument();
    expect(screen.getByText('Please enter your full name')).toBeInTheDocument();
  });

  it('submits a valid enquiry', async () => {
    mockApi({ ...baseApi, 'POST /api/enquiries': () => ({ received: true }) });
    renderAt(<ContactPage />, '/contact?type=event');
    expect(screen.getByLabelText(/About/)).toHaveValue('event');
    await userEvent.type(screen.getByLabelText(/Your name/), 'Arun Das');
    await userEvent.type(screen.getByLabelText(/^Phone/), '9445566778');
    await userEvent.type(screen.getByLabelText(/^Message/), 'A family gathering for twenty people');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByText("Thank you — we've received your message.")).toBeInTheDocument();
  });
});

describe('admin route protection', () => {
  it('redirects visitors without a session to the login page', async () => {
    mockApi(baseApi);
    window.history.pushState({}, '', '/');
    const { router } = renderRoutes(
      [
        { path: '/admin/login', element: <p>login page</p> },
        { element: <RequireStaff />, children: [{ path: '/admin/bookings', element: <p>secret bookings</p> }] },
      ],
      '/admin/bookings',
    );
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret bookings')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/login');
  });
});
