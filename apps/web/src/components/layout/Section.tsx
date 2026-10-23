import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/Reveal';
import { ResortImage } from '@/components/ui/ResortImage';

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12', className)}>{children}</div>;
}

/** Chapter numeral + eyebrow + display title. Paces long editorial pages. */
export function ChapterHeading({
  numeral,
  eyebrow,
  title,
  tone = 'dark',
  className,
  as: Tag = 'h2',
}: {
  numeral?: string;
  eyebrow: string;
  title: ReactNode;
  tone?: 'dark' | 'light';
  className?: string;
  as?: 'h1' | 'h2';
}) {
  return (
    <Reveal className={className}>
      <p className={cn('flex items-center gap-4', tone === 'light' ? 'text-sage' : 'text-laterite-deep')}>
        {numeral && <span className="chapter">{numeral}</span>}
        {numeral && <span aria-hidden className="h-px w-10 bg-current opacity-60" />}
        <span className="eyebrow">{eyebrow}</span>
      </p>
      <Tag className={cn('mt-5 text-display-md', tone === 'light' ? 'text-ivory' : 'text-forest')}>{title}</Tag>
    </Reveal>
  );
}

/** Inner-page hero: a cropped photograph with the title set low on the left. */
export function PageHero({
  slug,
  eyebrow,
  title,
  intro,
}: {
  slug: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
}) {
  return (
    <section className="relative flex min-h-[72svh] items-end overflow-hidden bg-woodland text-ivory">
      <ResortImage
        slug={slug}
        sizes="100vw"
        priority
        allowEnhanced
        className="absolute inset-0"
        imgClassName="animate-drift"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-woodland via-woodland/45 to-woodland/25" />
      <Container className="relative pb-14 pt-36 sm:pb-20">
        <p className="eyebrow text-sage">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-display-lg">{title}</h1>
        {intro && <div className="mt-6 max-w-xl text-base leading-relaxed text-ivory/85 sm:text-lg">{intro}</div>}
      </Container>
    </section>
  );
}

export function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return <figcaption className={cn('mt-3 font-display text-base italic text-ink-soft', className)}>{children}</figcaption>;
}
