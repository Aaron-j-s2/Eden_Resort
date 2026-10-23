import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Experience } from '@eden/shared/core';
import { RoomFeature } from '@/components/booking/RoomFeature';
import { StaySearch } from '@/components/booking/StaySearch';
import { DEFAULT_STAY, type StayState } from '@/components/booking/stay';
import { Caption, ChapterHeading, Container } from '@/components/layout/Section';
import { ImageMissing, ResortImage } from '@/components/ui/ResortImage';
import { Reveal } from '@/components/ui/Reveal';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useContact } from '@/hooks/useContact';
import { photoByPath } from '@/lib/images';
import { Seo } from '@/lib/seo';
import { cn, mapsDirectionsHref, telHref, whatsappHref } from '@/lib/utils';
import { useRooms, useSiteSettings } from '@/services/public';
import { DEFAULT_HOMEPAGE, NearbyList } from './shared-content';

const ease = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const { data: settings } = useSiteSettings();
  const home = settings?.homepage ?? DEFAULT_HOMEPAGE;
  const experiences = (settings?.experiences?.items ?? []).filter((e) => e.confirmed);

  return (
    <>
      <Seo
        title="Eden Falls Resort — A nature retreat near Thirparappu, Kanyakumari"
        description="A quiet eco-retreat in Koodal near Thirparappu, Kanyakumari District: cottages and pavilions among rubber plantations, bamboo and a natural stream. Request a reservation online."
      />
      <Hero headline={home.heroHeadline} eyebrow={home.heroEyebrow} intro={home.heroIntro} />
      <Story heading={home.storyHeading} body={home.storyBody} />
      <NatureSection />
      <FeaturedStay />
      {experiences.length > 0 && <ExperienceIndex items={experiences} />}
      <GalleryStrip />
      <NearbySection />
      <BookingInvitation text={home.bookingInvitation} />
      <FindUs />
    </>
  );
}

/* ---------------------------------------------------------------- Hero */

function Headline({ text }: { text: string }) {
  // Set the word "Quiet" in italic when the headline contains it.
  const parts = text.split(/(Quiet)/);
  return (
    <>
      {parts.map((part, i) =>
        part === 'Quiet' ? (
          <em key={i} className="font-normal italic text-sage-soft">
            {part}
          </em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Hero({ headline, eyebrow, intro }: { headline: string; eyebrow: string; intro: string }) {
  const [stay, setStay] = useState<StayState>(DEFAULT_STAY);
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-woodland text-ivory" aria-labelledby="hero-title">
      <ResortImage
        slug="pavilion-bridge"
        sizes="100vw"
        priority
        allowEnhanced
        className="absolute inset-0 -z-10"
        imgClassName="animate-drift"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(16,42,35,0.88)_0%,rgba(16,42,35,0.55)_45%,rgba(16,42,35,0.15)_75%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-woodland/90 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-woodland/70 to-transparent" />

      <Container className="flex flex-1 flex-col justify-end pb-10 pt-32 lg:pb-14">
        <div className="max-w-4xl">
          <motion.p
            className="eyebrow flex items-center gap-4 text-sage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <span>Eden Falls Resort</span>
            <span aria-hidden className="h-px w-8 bg-sage/70" />
            <span className="hidden sm:inline">{eyebrow}</span>
          </motion.p>
          <motion.h1
            id="hero-title"
            className="mt-6 text-display-xl"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease }}
          >
            <Headline text={headline} />
          </motion.h1>
          <motion.p
            className="mt-7 max-w-xl text-base leading-relaxed text-ivory/85 sm:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease }}
          >
            {intro}
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease }}
          >
            <Link to="/stay" className="eyebrow inline-flex min-h-12 items-center gap-3 bg-ivory px-7 text-woodland transition-colors hover:bg-paper">
              Explore the Stay <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link to="/book" className="eyebrow link-line text-ivory">
              Check Availability
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="mt-12 hidden lg:block"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease }}
        >
          <StaySearch value={stay} onChange={setStay} tone="overlay" />
        </motion.div>
      </Container>

      <p className="pointer-events-none absolute right-5 top-36 hidden text-ivory/75 xl:block">
        <span className="eyebrow [writing-mode:vertical-rl]">The covered footbridge over the stream</span>
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- I. Story */

function Story({ heading, body }: { heading: string; body: string[] }) {
  return (
    <section className="bg-paper py-24 sm:py-32" aria-labelledby="story-title">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ChapterHeading numeral="I." eyebrow="The place" title={<span id="story-title">{heading}</span>} />
          </div>
          <Reveal delay={0.1} className="space-y-6 text-lg leading-relaxed text-ink-soft lg:col-span-6 lg:col-start-7 lg:pt-14">
            {body.map((p, i) => (
              <p key={i} className={cn(i === 0 && 'drop-cap text-xl text-ink')}>
                {p}
              </p>
            ))}
            <Link to="/about" className="eyebrow link-line inline-block pt-2 text-forest">
              Our story
            </Link>
          </Reveal>
        </div>

        <div className="mt-20 grid grid-cols-12 gap-4 sm:gap-6">
          <Reveal as="figure" className="col-span-7 sm:col-span-5">
            <ResortImage slug="cottage-plantation" sizes="(min-width: 640px) 40vw, 58vw" className="aspect-[3/4]" />
            <Caption>A cottage among the rubber trees</Caption>
          </Reveal>
          <Reveal as="figure" delay={0.15} className="col-span-5 self-end sm:col-span-3 sm:col-start-6">
            <ResortImage slug="garden-buddha" sizes="(min-width: 640px) 25vw, 40vw" className="aspect-[3/4]" />
          </Reveal>
          <Reveal as="figure" delay={0.25} className="col-span-12 sm:col-span-4 sm:col-start-9 sm:mt-24">
            <ResortImage slug="arched-window-seats" sizes="(min-width: 640px) 33vw, 100vw" className="aspect-[4/3]" />
            <Caption>Arched windows frame the green</Caption>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- II. Nature */

function NatureSection() {
  const { data: settings } = useSiteSettings();
  const falls = settings?.nearby?.items.find((n) => /thirparappu/i.test(n.name));
  const facts = [
    { k: 'Setting', v: 'Rubber plantation, bamboo and palms' },
    { k: 'Water', v: 'A natural stream on the property' },
    {
      k: 'Nearby',
      v: falls ? `${falls.name}${falls.distance ? `, ${falls.distanceVerified ? '' : 'approx. '}${falls.distance.replace(/^about\s+/i, '')}` : ''}` : 'Thirparappu Falls',
    },
    { k: 'Region', v: 'Kanyakumari District, near the Kerala border' },
  ];
  return (
    <section className="relative overflow-hidden bg-woodland py-24 text-ivory sm:py-32" aria-labelledby="nature-title">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ChapterHeading
              numeral="II."
              eyebrow="Nature & location"
              tone="light"
              title={
                <span id="nature-title">
                  Water over stone, <em className="italic text-sage-soft">shade</em> from the trees.
                </span>
              }
            />
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-md leading-relaxed text-ivory/75">
                The resort is laid out along a clear, shallow stream that runs through the plantation — quick over the rocks in
                places, still and glassy in others. Paths lead from the cottages to the water and to a covered footbridge.
              </p>
              <dl className="mt-10 border-t border-ivory/15">
                {facts.map((f) => (
                  <div key={f.k} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-ivory/15 py-4 text-sm">
                    <dt className="eyebrow pt-0.5 text-sage">{f.k}</dt>
                    <dd className="text-ivory/85">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="relative lg:col-span-7">
            <Reveal as="figure">
              <ResortImage slug="stream-wide" sizes="(min-width: 1024px) 55vw, 100vw" className="aspect-[4/3]" />
            </Reveal>
            <Reveal
              as="figure"
              delay={0.2}
              className="relative -mt-24 ml-auto w-[48%] border-[6px] border-woodland sm:-mt-40 sm:w-[40%] lg:absolute lg:-bottom-16 lg:-left-16 lg:ml-0 lg:mt-0"
            >
              <ResortImage slug="bamboo-stream-rocks" sizes="(min-width: 1024px) 22vw, 45vw" className="aspect-[3/4]" />
            </Reveal>
            <Reveal delay={0.3} className="mt-6 flex justify-end lg:mt-8">
              <Link to="/experiences" className="eyebrow link-line text-ivory">
                Experiences at Eden
              </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- III. Stay */

function FeaturedStay() {
  const { data: rooms, isLoading, isError, refetch } = useRooms();
  return (
    <section className="bg-ivory py-24 sm:py-32" aria-labelledby="stay-title">
      <Container>
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <ChapterHeading numeral="III." eyebrow="Stay" title={<span id="stay-title">Cottages under the canopy</span>} />
          <Link to="/stay" className="eyebrow link-line shrink-0 text-forest">
            All accommodation
          </Link>
        </div>
        <div className="mt-16 space-y-24">
          {isLoading && (
            <div className="grid gap-8 lg:grid-cols-12">
              <Skeleton className="aspect-[16/11] lg:col-span-7" />
              <div className="space-y-4 lg:col-span-5">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-24" />
              </div>
            </div>
          )}
          {isError && (
            <ErrorState
              message="Accommodation could not be loaded right now."
              action={
                <button type="button" className="eyebrow link-line" onClick={() => refetch()}>
                  Try again
                </button>
              }
            />
          )}
          {rooms?.slice(0, 2).map((room, i) => <RoomFeature key={room.id} room={room} index={i} />)}
          {rooms && rooms.length === 0 && (
            <p className="text-ink-soft">
              Accommodation details are being finalised. Please{' '}
              <Link to="/contact" className="link-line text-forest">
                contact the resort
              </Link>{' '}
              to plan your stay.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- IV. Experiences */

function ExperienceIndex({ items }: { items: Experience[] }) {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0]!;
  const currentImage = photoByPath(current.image);
  return (
    <section className="bg-paper py-24 sm:py-32" aria-labelledby="exp-title">
      <Container>
        <ChapterHeading numeral="IV." eyebrow="Experiences" title={<span id="exp-title">An index of slow days</span>} />
        <div className="mt-14 grid gap-12 lg:grid-cols-12">
          <ol className="border-t border-forest/15 lg:col-span-7">
            {items.map((item, i) => {
              const img = photoByPath(item.image);
              return (
                <li key={item.key} className="border-b border-forest/15">
                  <Link
                    to={`/experiences#${item.key}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 sm:grid-cols-[3.5rem_1fr_auto]"
                  >
                    <span className="chapter text-laterite-deep">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span
                        className={cn(
                          'block font-display text-3xl leading-tight transition-colors sm:text-4xl',
                          active === i ? 'text-forest' : 'text-ink/70 group-hover:text-forest',
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="mt-1 block max-w-md text-sm text-ink-soft">{item.summary}</span>
                    </span>
                    {img ? (
                      <ResortImage path={item.image ?? undefined} alt="" sizes="64px" className="size-16 lg:hidden" />
                    ) : (
                      <ArrowRight className="size-4 text-forest lg:hidden" aria-hidden />
                    )}
                    <ArrowRight
                      className="hidden size-5 -translate-x-2 text-forest opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 lg:block"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-28">
              <motion.div key={current.key} initial={{ opacity: 0.2, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease }}>
                {currentImage ? (
                  <ResortImage path={current.image ?? undefined} alt={current.imageAlt ?? undefined} sizes="40vw" className="aspect-[4/5]" />
                ) : (
                  <ImageMissing label={current.title} className="aspect-[4/5]" />
                )}
              </motion.div>
              <p className="mt-4 font-display text-lg italic text-ink-soft">{current.title}</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- Gallery strip */

const STRIP = [
  { slug: 'lily-pond-pavilion', cls: 'h-[22rem] sm:h-[30rem] aspect-[4/3]' },
  { slug: 'water-lilies', cls: 'h-[22rem] sm:h-[30rem] aspect-[9/16]' },
  { slug: 'stream-rapids', cls: 'h-[16rem] sm:h-[22rem] aspect-[4/3] self-end' },
  { slug: 'cottage-evening', cls: 'h-[22rem] sm:h-[30rem] aspect-[3/2]' },
  { slug: 'white-horse', cls: 'h-[18rem] sm:h-[24rem] aspect-[9/16] self-center' },
  { slug: 'arched-hall-interior', cls: 'h-[22rem] sm:h-[30rem] aspect-[4/3]' },
  { slug: 'stream-still-rock', cls: 'h-[18rem] sm:h-[26rem] aspect-[3/4] self-end' },
];

function GalleryStrip() {
  return (
    <section className="overflow-hidden bg-ivory py-24 sm:py-28" aria-labelledby="gallery-title">
      <Container className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-laterite-deep">From the resort</p>
          <h2 id="gallery-title" className="mt-4 text-display-md text-forest">
            Seen at Eden
          </h2>
        </div>
        <Link to="/gallery" className="eyebrow link-line shrink-0 text-forest">
          Open the gallery
        </Link>
      </Container>
      <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:gap-6 sm:px-8 lg:px-12" tabIndex={0} aria-label="Photographs of the resort, scroll horizontally">
        {STRIP.map((item) => (
          <Link key={item.slug} to="/gallery" className={cn('group shrink-0 snap-start', item.cls)}>
            <ResortImage slug={item.slug} sizes="(min-width: 640px) 40vw, 80vw" className="h-full w-full" imgClassName="transition-transform duration-[1.2s] group-hover:scale-[1.04]" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- V. Nearby */

function NearbySection() {
  return (
    <section className="bg-paper py-24 sm:py-32" aria-labelledby="nearby-title">
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ChapterHeading numeral="V." eyebrow="Nearby" title={<span id="nearby-title">Around Thirparappu</span>} />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-sm text-ink-soft">
              The resort sits in quiet countryside, within easy reach of the district's rivers, falls and reservoirs. Ask us for
              directions and the best times to visit.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <NearbyList />
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- Booking invitation */

function BookingInvitation({ text }: { text: string }) {
  const [stay, setStay] = useState<StayState>(DEFAULT_STAY);
  return (
    <section className="grid bg-forest text-ivory lg:grid-cols-2" aria-labelledby="invite-title">
      <div className="flex flex-col justify-center px-5 py-20 sm:px-12 lg:px-16 lg:py-28">
        <Reveal>
          <p className="eyebrow text-sage">Reservations</p>
          <h2 id="invite-title" className="mt-5 text-display-lg">
            Your dates, <em className="italic text-sage-soft">your quiet.</em>
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-ivory/80">{text}</p>
        </Reveal>
        <Reveal delay={0.15} className="mt-10">
          <StaySearch value={stay} onChange={setStay} tone="overlay" stacked />
        </Reveal>
      </div>
      <ResortImage slug="cottage-evening" sizes="(min-width: 1024px) 50vw, 100vw" className="min-h-[22rem] lg:min-h-full" />
    </section>
  );
}

/* ---------------------------------------------------------------- Find us */

function FindUs() {
  const contact = useContact();
  return (
    <section className="bg-ivory py-24 sm:py-32" aria-labelledby="find-title">
      <Container className="grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <p className="eyebrow text-laterite-deep">Find us</p>
          <h2 id="find-title" className="mt-4 text-display-md text-forest">
            Koodal, near Nandhimangalam
          </h2>
          <address className="mt-6 not-italic leading-relaxed text-ink-soft">
            {contact.addressLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
            <span className="block">{contact.postalCode}</span>
          </address>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <a href={telHref(contact.phone)} className="eyebrow inline-flex min-h-12 items-center gap-3 bg-forest px-6 text-ivory hover:bg-woodland">
              <Phone className="size-4" aria-hidden /> <span className="tabular">{contact.phone}</span>
            </a>
            <a
              href={whatsappHref(contact.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow inline-flex min-h-12 items-center gap-3 border border-forest px-6 text-forest hover:bg-forest hover:text-ivory"
            >
              <MessageCircle className="size-4" aria-hidden /> WhatsApp
            </a>
          </div>
        </div>
        <a
          href={mapsDirectionsHref(contact.mapsQuery)}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block lg:col-span-6 lg:col-start-7"
          aria-label="Get directions in Google Maps (opens in a new tab)"
        >
          <ResortImage slug="plantation-pavilion" sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[16/10]" />
          <span className="absolute bottom-0 left-0 flex items-center gap-3 bg-paper px-6 py-4 text-forest">
            <MapPin className="size-4 text-laterite-deep" aria-hidden />
            <span className="eyebrow link-line">Directions in Google Maps</span>
          </span>
        </a>
      </Container>
    </section>
  );
}
