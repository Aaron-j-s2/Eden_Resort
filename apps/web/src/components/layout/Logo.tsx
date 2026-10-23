import { cn } from '@/lib/utils';

/** Arch (the property's scalloped laterite arches) over a line of water. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" fill="none" aria-hidden className={cn('h-9 w-auto', className)}>
      <path d="M3 39V16C3 8.8 8.8 3 16 3s13 5.8 13 13v23" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 39V17.5C8 13 11.6 9.5 16 9.5s8 3.5 8 8V39" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <path
        d="M3 30.5c2.2 0 2.2-1.6 4.3-1.6s2.2 1.6 4.4 1.6 2.2-1.6 4.3-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.3-1.6 2.2 1.6 4.3 1.6"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-laterite"
      />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.65rem] font-medium tracking-tight">Eden Falls</span>
          <span className="eyebrow mt-1 text-[0.55rem] tracking-[0.42em] opacity-75">Resort · Kanyakumari</span>
        </span>
      )}
    </span>
  );
}
