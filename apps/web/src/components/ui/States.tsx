import type { ReactNode } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center gap-3 text-ink-soft', className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  className,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('border-l-2 border-danger bg-ivory/70 px-5 py-4', className)}>
      <p className="flex items-center gap-2 font-semibold text-danger">
        <AlertCircle className="size-4" aria-hidden />
        {title}
      </p>
      {message && <p className="mt-1 text-sm text-ink-soft">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, children, className }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('border border-dashed border-stone px-6 py-10 text-center', className)}>
      <p className="font-display text-2xl text-forest">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse bg-stone/50', className)} />;
}
