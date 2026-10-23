import { Link } from 'react-router';
import type { Experience } from '@eden/shared/core';
import { Container, PageHero } from '@/components/layout/Section';
import { ImageMissing, ResortImage } from '@/components/ui/ResortImage';
import { Reveal } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/States';
import { photoByPath } from '@/lib/images';
import { Seo } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/services/public';
import { NearbyList } from './shared-content';

const ROMAN = ['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.', 'VII.', 'VIII.', 'IX.', 'X.'];

export default function ExperiencesPage() {
  const { data, isLoading } = useSiteSettings();
  const items = (data?.experiences?.items ?? []).filter((e) => e.confirmed);

  return (
    <>
      <Seo
        title="Experiences"
        description="The stream, the plantation, the pool, dining, campfire evenings and gatherings at Eden Falls Resort — plus nearby Thirparappu Falls."
      />
      <PageHero
        slug="stream-rapids"
        eyebrow="Experiences"
        title={
          <>
            Days measured by <em className="italic text-sage-soft">light and water</em>
          </>
        }
        intro="Nothing is scheduled, and nothing is rushed. These are the simple pleasures the resort offers."
      />

      {isLoading && (
        <Container className="space-y-10 py-24">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
        </Container>
      )}

      {items.map((item, i) => (
        <ExperienceChapter key={item.key} item={item} index={i} />
      ))}

      <section className="bg-paper py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow text-laterite-deep">Beyond the resort</p>
            <h2 className="mt-4 text-display-md text-forest">Nearby nature</h2>
            <p className="mt-6 max-w-sm text-sm text-ink-soft">
              The resort does not run guided tours; ask us for directions and timing tips for these local sights.
            </p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <NearbyList />
          </div>
        </Container>
      </section>

      <section className="bg-forest py-20 text-center text-ivory">
        <Container>
          <p className="font-display text-display-sm">Questions about any of these?</p>
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            <Link to="/contact" className="eyebrow inline-flex min-h-12 items-center border border-ivory/50 px-6 hover:bg-ivory hover:text-woodland">
              Ask the resort
            </Link>
            <Link to="/book" className="eyebrow inline-flex min-h-12 items-center bg-ivory px-6 text-woodland">
              Check availability
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

/** Alternating compositions: full-bleed, split left, split right — never a uniform card grid. */
function ExperienceChapter({ item, index }: { item: Experience; index: number }) {
  const hasImage = Boolean(photoByPath(item.image));
  const variant = index % 3;
  const dark = variant === 0;

  if (variant === 0 && hasImage) {
    return (
      <section id={item.key} className="relative scroll-mt-20 bg-woodland text-ivory">
        <ResortImage path={item.image ?? undefined} alt={item.imageAlt ?? undefined} sizes="100vw" className="h-[60svh] min-h-[22rem] w-full" />
        <Container className="relative -mt-28 pb-24 sm:-mt-40">
          <Reveal className="max-w-2xl bg-woodland p-8 sm:p-12">
            <p className="chapter text-sage">{ROMAN[index]}</p>
            <h2 className="mt-3 text-display-md">{item.title}</h2>
            <p className="mt-5 text-lg text-ivory/85">{item.summary}</p>
            <p className="mt-4 leading-relaxed text-ivory/70">{item.body}</p>
          </Reveal>
        </Container>
      </section>
    );
  }

  const flip = variant === 2;
  return (
    <section id={item.key} className={cn('scroll-mt-20 py-20 sm:py-28', dark ? 'bg-woodland text-ivory' : variant === 1 ? 'bg-paper' : 'bg-ivory')}>
      <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className={cn('lg:col-span-6', flip && 'lg:order-2 lg:col-start-7')}>
          {hasImage ? (
            <ResortImage path={item.image ?? undefined} alt={item.imageAlt ?? undefined} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3]" />
          ) : (
            <ImageMissing label={item.title} className="aspect-[4/3]" />
          )}
        </Reveal>
        <Reveal delay={0.1} className={cn('lg:col-span-5', flip ? 'lg:order-1' : 'lg:col-start-8')}>
          <p className={cn('chapter', dark ? 'text-sage' : 'text-laterite-deep')}>{ROMAN[index]}</p>
          <h2 className={cn('mt-3 text-display-md', dark ? 'text-ivory' : 'text-forest')}>{item.title}</h2>
          <p className={cn('mt-5 text-lg', dark ? 'text-ivory/85' : 'text-ink')}>{item.summary}</p>
          <p className={cn('mt-4 leading-relaxed', dark ? 'text-ivory/70' : 'text-ink-soft')}>{item.body}</p>
        </Reveal>
      </Container>
    </section>
  );
}
