import { Link } from 'react-router';
import { formatINR, type RoomType } from '@eden/shared/core';
import { ResortImage } from '@/components/ui/ResortImage';
import { Reveal } from '@/components/ui/Reveal';
import { cn, pluralize } from '@/lib/utils';
import { SampleNotice } from './SampleNotice';

/** Editorial room row: large photograph + facts column. Alternates sides. */
export function RoomFeature({ room, index }: { room: RoomType; index: number }) {
  const flip = index % 2 === 1;
  const image = room.images[0];
  return (
    <article className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
      <Reveal className={cn('lg:col-span-7', flip && 'lg:order-2 lg:col-start-6')}>
        <Link to={`/stay/${room.slug}`} className="group block" aria-label={`View ${room.name}`}>
          <ResortImage
            path={image?.imagePath}
            alt={image?.altText ?? room.name}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="aspect-[4/3] sm:aspect-[16/11]"
            imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-calm)] group-hover:scale-[1.03]"
          />
        </Link>
      </Reveal>
      <Reveal delay={0.1} className={cn('lg:col-span-5', flip && 'lg:order-1 lg:col-start-1 lg:row-start-1')}>
        <p className="chapter text-laterite-deep">{String(index + 1).padStart(2, '0')}</p>
        <h3 className="mt-3 text-display-sm text-forest">
          <Link to={`/stay/${room.slug}`} className="hover:text-laterite-deep">
            {room.name}
          </Link>
        </h3>
        {room.isSample && <SampleNotice className="mt-4" />}
        <p className="mt-4 max-w-md leading-relaxed text-ink-soft">{room.shortDescription}</p>
        <dl className="mt-8 grid grid-cols-2 border-t border-forest/15 text-sm">
          <div className="border-b border-r border-forest/15 py-4 pr-4">
            <dt className="eyebrow text-ink-soft">Sleeps</dt>
            <dd className="mt-1 font-display text-2xl">{pluralize(room.maxOccupancy, 'guest')}</dd>
          </div>
          <div className="border-b border-forest/15 py-4 pl-4">
            <dt className="eyebrow text-ink-soft">From</dt>
            <dd className="mt-1 font-display text-2xl">
              {formatINR(room.basePrice)}
              <span className="ml-1 font-sans text-xs text-ink-soft">/ night</span>
            </dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link to={`/book?room=${room.id}`} className="eyebrow inline-flex min-h-12 items-center bg-forest px-6 text-ivory hover:bg-woodland">
            Check availability
          </Link>
          <Link to={`/stay/${room.slug}`} className="eyebrow link-line text-forest">
            View the room
          </Link>
        </div>
      </Reveal>
    </article>
  );
}
