import type { ReactNode } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type BookingStatus,
  type EnquiryStatus,
  type PaymentStatus,
} from '@eden/shared/core';
import { cn } from '@/lib/utils';

const BOOKING_TONE: Record<BookingStatus, string> = {
  pending: 'bg-[#f4e3c8] text-[#6d4a12] ring-[#e0c08d]',
  confirmed: 'bg-[#dbe7d6] text-[#24502f] ring-[#b4cdaa]',
  checked_in: 'bg-forest text-ivory ring-forest',
  checked_out: 'bg-stone/60 text-ink-soft ring-stone',
  cancelled: 'bg-[#f2dcd6] text-[#7d2a1c] ring-[#e1b7ac]',
  rejected: 'bg-[#efe1e8] text-[#6d2848] ring-[#d9bccb]',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', BOOKING_TONE[status])}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn('whitespace-nowrap text-xs', status === 'paid' ? 'font-semibold text-moss' : 'text-ink-soft')}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

const ENQUIRY_TONE: Record<EnquiryStatus, string> = {
  new: 'bg-[#f4e3c8] text-[#6d4a12] ring-[#e0c08d]',
  in_progress: 'bg-[#dde6ee] text-[#23435f] ring-[#b9cbdb]',
  resolved: 'bg-[#dbe7d6] text-[#24502f] ring-[#b4cdaa]',
};
const ENQUIRY_LABEL: Record<EnquiryStatus, string> = { new: 'New', in_progress: 'In progress', resolved: 'Resolved' };

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', ENQUIRY_TONE[status])}>
      {ENQUIRY_LABEL[status]}
    </span>
  );
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-stone pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-4xl text-forest">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn('rounded-sm border border-stone bg-paper', className)}>
      {title && (
        <header className="flex items-center justify-between gap-4 border-b border-stone px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminButton({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition-colors disabled:opacity-50',
        variant === 'primary' && 'bg-forest text-ivory hover:bg-woodland',
        variant === 'secondary' && 'border border-stone bg-paper text-ink hover:border-forest',
        variant === 'danger' && 'bg-danger text-paper hover:bg-[#7f2418]',
        variant === 'ghost' && 'text-forest hover:bg-ivory',
        className,
      )}
      {...props}
    />
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4 text-sm text-ink-soft">
      <p className="tabular">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <AdminButton variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </AdminButton>
        <span className="tabular px-2">
          {page} / {pages}
        </span>
        <AdminButton variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </AdminButton>
      </div>
    </nav>
  );
}

/** Confirmation dialog for consequential or destructive actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  loading,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-woodland/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-paper p-6 shadow-2xl">
          <AlertDialog.Title className="font-display text-2xl text-forest">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-ink-soft">{description}</AlertDialog.Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <AdminButton variant="secondary">Cancel</AdminButton>
            </AlertDialog.Cancel>
            <AdminButton
              variant={destructive ? 'danger' : 'primary'}
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {loading ? 'Working…' : confirmLabel}
            </AdminButton>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'attention' }) {
  return (
    <div className={cn('rounded-sm border bg-paper px-5 py-4', tone === 'attention' ? 'border-laterite/50' : 'border-stone')}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{label}</p>
      <p className={cn('tabular mt-2 font-display text-4xl leading-none', tone === 'attention' ? 'text-laterite-deep' : 'text-forest')}>{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export const formatDateTimeIST = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const formatShortDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${isoDate}T00:00:00Z`));
