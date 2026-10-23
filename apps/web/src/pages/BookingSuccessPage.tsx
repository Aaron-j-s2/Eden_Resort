import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router';
import { MessageCircle, Phone } from 'lucide-react';
import { BOOKING_STATUS_LABELS, formatDisplayDate, formatINR, PAYMENT_STATUS_LABELS, type PublicBookingSummary } from '@eden/shared/core';
import { Container } from '@/components/layout/Section';
import { ResortImage } from '@/components/ui/ResortImage';
import { Spinner } from '@/components/ui/States';
import { useContact } from '@/hooks/useContact';
import { Seo } from '@/lib/seo';
import { pluralize, telHref, whatsappHref } from '@/lib/utils';
import { lookupBooking } from '@/services/public';
import { FindBookingForm } from './FindBookingPage';

const NEXT_STEPS: Record<PublicBookingSummary['status'], string> = {
  pending: 'The resort will call you to confirm availability and talk through your stay. Keep your reference handy.',
  confirmed: 'Your stay is confirmed. We look forward to welcoming you to Eden Falls.',
  checked_in: 'Welcome — you are checked in. Enjoy your stay.',
  checked_out: 'Thank you for staying with us.',
  cancelled: 'This reservation has been cancelled. Please call us if you have any questions.',
  rejected: "We're sorry — the resort could not accept this request. Please call us to discuss other dates.",
};

export default function BookingSuccessPage() {
  const { reference = '' } = useParams();
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('t');
  const contact = useContact();

  const cached = (() => {
    try {
      const raw = sessionStorage.getItem(`eden-booking-${reference}`);
      return raw ? (JSON.parse(raw) as PublicBookingSummary) : undefined;
    } catch {
      return undefined;
    }
  })();

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['booking', reference, token],
    queryFn: () => lookupBooking({ reference, token: token! }),
    enabled: Boolean(token),
    initialData: cached,
    retry: false,
  });

  if (!token) {
    return (
      <Container className="max-w-xl pb-24 pt-36">
        <Seo title="Find your booking" description="Look up your Eden Falls reservation." noindex />
        <h1 className="text-display-md text-forest">Find your booking</h1>
        <p className="mt-3 text-ink-soft">Enter your reference and the phone number you booked with.</p>
        <FindBookingForm defaultReference={reference} />
      </Container>
    );
  }

  if (isLoading && !booking) return <Spinner className="min-h-svh justify-center" label="Loading your booking" />;

  if (isError || !booking) {
    return (
      <Container className="max-w-xl pb-24 pt-36">
        <Seo title="Booking" description="Your Eden Falls reservation." noindex />
        <h1 className="text-display-md text-forest">We couldn't open this link</h1>
        <p className="mt-3 text-ink-soft">Look up your booking with your reference and phone number instead.</p>
        <FindBookingForm defaultReference={reference} />
      </Container>
    );
  }

  return <BookingConfirmation booking={booking} contact={contact} />;
}

export function BookingConfirmation({ booking, contact }: { booking: PublicBookingSummary; contact: ReturnType<typeof useContact> }) {
  const pending = booking.status === 'pending';
  return (
    <>
      <Seo title={`Booking ${booking.reference}`} description="Your Eden Falls reservation." noindex />
      <section className="bg-paper pb-24 pt-28 sm:pt-36">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow text-laterite-deep">{pending ? 'Request received' : BOOKING_STATUS_LABELS[booking.status]}</p>
            <h1 className="mt-4 text-display-lg text-forest">
              {pending ? (
                <>
                  Thank you, {booking.guestFirstName}. <em className="italic">We'll be in touch.</em>
                </>
              ) : (
                <>Your reservation, {booking.guestFirstName}</>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">{NEXT_STEPS[booking.status]}</p>

            <div className="mt-10 inline-flex flex-col border border-forest/20 bg-ivory px-6 py-5">
              <span className="eyebrow text-ink-soft">Booking reference</span>
              <span className="tabular mt-1 select-all font-display text-4xl tracking-wide text-forest" data-testid="booking-reference">
                {booking.reference}
              </span>
            </div>

            <dl className="mt-10 grid gap-px bg-forest/10 text-sm sm:grid-cols-2">
              {[
                ['Status', BOOKING_STATUS_LABELS[booking.status]],
                ['Payment', PAYMENT_STATUS_LABELS[booking.paymentStatus]],
                ['Arrive', formatDisplayDate(booking.checkIn)],
                ['Depart', formatDisplayDate(booking.checkOut)],
                ['Accommodation', `${booking.roomName} × ${booking.rooms}`],
                ['Guests', `${pluralize(booking.adults, 'adult')}${booking.children ? `, ${pluralize(booking.children, 'child', 'children')}` : ''}`],
              ].map(([k, v]) => (
                <div key={k} className="bg-paper py-4 sm:pr-6">
                  <dt className="eyebrow text-ink-soft">{k}</dt>
                  <dd className="mt-1 font-display text-2xl">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href={telHref(contact.phone)} className="eyebrow inline-flex min-h-12 items-center justify-center gap-3 bg-forest px-6 text-ivory hover:bg-woodland">
                <Phone className="size-4" aria-hidden /> Call {contact.phone}
              </a>
              <a
                href={whatsappHref(contact.whatsappNumber, `Hello, this is about my booking ${booking.reference}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="eyebrow inline-flex min-h-12 items-center justify-center gap-3 border border-forest px-6 text-forest hover:bg-forest hover:text-ivory"
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </div>
            <p className="mt-6 text-sm text-ink-soft">
              Bookmark this page to check your status later, or use{' '}
              <Link to="/booking/find" className="link-line text-forest">
                Find my booking
              </Link>{' '}
              with your reference and phone number.
            </p>
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="border border-forest/15 bg-ivory">
              <ResortImage slug="cottage-evening" sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[16/10]" />
              <dl className="space-y-3 p-6 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{pluralize(booking.nights, 'night')}</dt>
                  <dd className="tabular">{formatINR(booking.subtotal)}</dd>
                </div>
                {Number(booking.taxes) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">Taxes</dt>
                    <dd className="tabular">{formatINR(booking.taxes)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-forest/15 pt-4">
                  <dt className="eyebrow">Quoted total</dt>
                  <dd className="tabular font-display text-3xl text-forest">{formatINR(booking.total)}</dd>
                </div>
                <p className="pt-2 text-xs text-ink-soft">No payment has been taken. The resort will explain how to pay when confirming.</p>
              </dl>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}
