import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shown on development placeholder rooms so they are never mistaken for confirmed details. */
export function SampleNotice({ className, showPrice = true }: { className?: string; showPrice?: boolean }) {
  return (
    <p className={cn('inline-flex items-start gap-2 border border-laterite/40 bg-laterite/5 px-3 py-2 text-xs text-laterite-deep', className)}>
      <Info className="mt-px size-3.5 shrink-0" aria-hidden />
      Sample listing — room details{showPrice ? ' and price' : ''} are placeholders pending confirmation from the resort.
    </p>
  );
}
