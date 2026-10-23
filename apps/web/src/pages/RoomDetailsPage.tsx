import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Check } from 'lucide-react';
import { formatINR } from '@eden/shared/core';
import { SampleNotice } from '@/components/booking/SampleNotice';
import { StaySearch } from '@/components/booking/StaySearch';
import { DEFAULT_STAY, stayToParams, type StayState } from '@/components/booking/stay';
import { Lightbox, type LightboxImage } from '@/components/gallery/Lightbox';
import { Container } from '@/components/layout/Section';
import { ImageMissing, ResortImage } from '@/components/ui/ResortImage';
import { Reveal } from '@/components/ui/Reveal';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { ApiError } from '@/lib/api';
import { Seo } from '@/lib/seo';
import { pluralize } from '@/lib/utils';
import { useRoom } from '@/services/public';
import NotFoundPage from './NotFoundPage';

export default function RoomDetailsPage() {
  const { slug = '' } = useParams();
  const { data: room, isLoading, error, refetch } = useRoom(slug);
  const [stay, setStay] = useState<StayState>(DEFAULT_STAY);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;

  if (isLoading || !room) {
    return (
      <div className="bg-woodland pt-20">
        {error ? (
          <Container className="py-32">
            <ErrorState message="This room could not be loaded." action={<button className="eyebrow link-line" onClick={() => refetch()}>Try again</button>} />
          </Container>
        ) : (
          <Skeleton className="h-[70svh] bg-forest" />
        )}
      </div>
    );
  }

  const [hero, ...rest] = room.images;
  const lightboxImages: LightboxImage[] = room.images.map((i) => ({ path: i.imagePath, alt: i.altText }));

  return (
    <>
      <Seo title={room.name} description={room.shortDescription || `${room.name} at Eden Falls Resort, near Thirparappu, Kanyakumari.`} />
      <section className="relative flex min-h-[78svh] items-end overflow-hidden bg-woodland text-ivory">
        {hero ? (
          <ResortImage path={hero.imagePath} alt={hero.altText} sizes="100vw" priority className="absolute inset-0" imgClassName="animate-drift" />
        ) : (
          <ImageMissing className="absolute inset-0" label={room.name} />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-woodland via-woodland/40 to-woodland/30" />
        <Container className="relative pb-14 pt-36">
          <Link to="/stay" className="eyebrow link-line text-sage">
            ← All accommodation
          </Link>
          <h1 className="mt-5 max-w-4xl text-display-lg">{room.name}</h1>
          <p className="mt-4 font-display text-2xl text-ivory/85">
            From {formatINR(room.basePrice)} <span className="font-sans text-sm">per night</span>
          </p>
        </Container>
      </section>

      <section className="bg-paper py-20 sm:py-28">
        <Container className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {room.isSample && <SampleNotice className="mb-8" />}
            <Reveal>
              <p className="font-display text-3xl leading-snug text-forest">{room.shortDescription}</p>
              {room.description && (
                <div className="mt-8 space-y-5 leading-relaxed text-ink-soft">
                  {room.description.split(/\n{2,}/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </Reveal>

            {room.amenities.length > 0 && (
              <Reveal className="mt-14">
                <h2 className="eyebrow text-laterite-deep">In the room</h2>
                <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
                  {room.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-3 border-b border-forest/10 py-3 text-sm">
                      <Check className="size-4 text-moss" aria-hidden /> {a}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {room.bookingRules && (
              <Reveal className="mt-14">
                <h2 className="eyebrow text-laterite-deep">Good to know</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{room.bookingRules}</p>
              </Reveal>
            )}
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-28">
              <dl className="border-t border-forest/15 text-sm">
                {[
                  ['Sleeps', `Up to ${pluralize(room.maxOccupancy, 'guest')}`],
                  ['Adults', `Up to ${room.maxAdults}`],
                  ['Children', room.maxChildren > 0 ? `Up to ${room.maxChildren}` : 'Please ask'],
                  ['Bed', room.bedType ?? 'Confirmed on booking'],
                  ['Rate', `${formatINR(room.basePrice)} / night`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-forest/15 py-4">
                    <dt className="eyebrow text-ink-soft">{k}</dt>
                    <dd className="text-right font-display text-xl">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8">
                <p className="eyebrow mb-3 text-ink-soft">Check availability</p>
                <StaySearch
                  value={stay}
                  onChange={setStay}
                  stacked
                  onSubmit={(s) => navigate(`/book?${stayToParams(s, { room: room.id }).toString()}`)}
                />
              </div>
            </div>
          </aside>
        </Container>
      </section>

      {rest.length > 0 && (
        <section className="bg-ivory py-20 sm:py-28" aria-label="Photographs of this room">
          <Container className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {room.images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className={i === 0 ? 'col-span-2 lg:row-span-2' : ''}
                aria-label={`Open photo: ${img.altText}`}
              >
                <ResortImage path={img.imagePath} alt={img.altText} sizes="(min-width: 1024px) 33vw, 50vw" className="aspect-[4/3] h-full" />
              </button>
            ))}
          </Container>
        </section>
      )}
      <Lightbox images={lightboxImages} index={lightboxIndex} onIndexChange={setLightboxIndex} />
    </>
  );
}
