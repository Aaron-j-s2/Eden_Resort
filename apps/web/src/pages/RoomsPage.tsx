import { Link } from 'react-router';
import { RoomFeature } from '@/components/booking/RoomFeature';
import { Container, PageHero } from '@/components/layout/Section';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useContact } from '@/hooks/useContact';
import { Seo } from '@/lib/seo';
import { telHref } from '@/lib/utils';
import { useRooms, useSiteSettings } from '@/services/public';

export default function RoomsPage() {
  const { data: rooms, isLoading, isError, refetch } = useRooms();
  const { data: settings } = useSiteSettings();
  const contact = useContact();
  const policy = settings?.booking_policy;

  return (
    <>
      <Seo
        title="Stay — cottages and rooms"
        description="Cottages and rooms at Eden Falls Resort, set among rubber trees and lily ponds near Thirparappu. See capacity and nightly rates, then check availability for your dates."
      />
      <PageHero
        slug="cottage-evening"
        eyebrow="Accommodation"
        title={
          <>
            Stay <em className="italic text-sage-soft">under the canopy</em>
          </>
        }
        intro="Laterite-walled cottages and rooms set among the trees. Choose your dates to see what is free."
      />

      <section className="bg-ivory py-20 sm:py-28">
        <Container>
          <div className="mb-16 grid gap-6 border-y border-forest/15 py-6 text-sm sm:grid-cols-3">
            <p>
              <span className="eyebrow block text-ink-soft">Check-in</span>
              <span className="mt-1 block font-display text-xl">{policy?.checkInTime ?? 'Confirmed on booking'}</span>
            </p>
            <p>
              <span className="eyebrow block text-ink-soft">Check-out</span>
              <span className="mt-1 block font-display text-xl">{policy?.checkOutTime ?? 'Confirmed on booking'}</span>
            </p>
            <p>
              <span className="eyebrow block text-ink-soft">Payment</span>
              <span className="mt-1 block font-display text-xl">Nothing charged online</span>
            </p>
          </div>

          {isLoading && (
            <div className="space-y-16">
              {[0, 1].map((i) => (
                <div key={i} className="grid gap-8 lg:grid-cols-12">
                  <Skeleton className="aspect-[16/11] lg:col-span-7" />
                  <Skeleton className="h-48 lg:col-span-5" />
                </div>
              ))}
            </div>
          )}
          {isError && (
            <ErrorState
              message="We couldn't load the rooms just now."
              action={
                <button type="button" className="eyebrow link-line" onClick={() => refetch()}>
                  Try again
                </button>
              }
            />
          )}
          {rooms && rooms.length === 0 && (
            <EmptyState title="Room details coming soon">
              Please{' '}
              <a className="link-line text-forest" href={telHref(contact.phone)}>
                call {contact.phone}
              </a>{' '}
              to plan your stay.
            </EmptyState>
          )}
          <div className="space-y-24 sm:space-y-32">
            {rooms?.map((room, i) => <RoomFeature key={room.id} room={room} index={i} />)}
          </div>

          <p className="mt-24 max-w-xl text-sm text-ink-soft">
            Travelling as a larger group or planning an event?{' '}
            <Link to="/contact?type=group" className="link-line text-forest">
              Send us an enquiry
            </Link>{' '}
            and we'll help you arrange it.
          </p>
        </Container>
      </section>
    </>
  );
}
