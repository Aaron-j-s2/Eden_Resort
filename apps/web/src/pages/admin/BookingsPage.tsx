import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowDownUp, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { BOOKING_STATUS_LABELS, BOOKING_STATUSES, formatINR, type BookingStatus } from '@eden/shared/core';
import {
  AdminButton,
  AdminPageHeader,
  BookingStatusBadge,
  formatDateTimeIST,
  formatShortDate,
  Pagination,
  PaymentBadge,
} from '@/components/admin/AdminUi';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/utils';
import { useBookings, useExportBookings, type BookingListQuery } from '@/services/admin';

function SortHeader({
  col,
  sort,
  order,
  onSort,
  children,
  className,
}: {
  col: string;
  sort: string;
  order: 'asc' | 'desc';
  onSort: (col: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" className={cn('px-3 py-2 font-semibold', className)} aria-sort={sort === col ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-forest">
        {children}
        <ArrowDownUp className={cn('size-3', sort === col ? 'opacity-100' : 'opacity-30')} aria-hidden />
      </button>
    </th>
  );
}

const control = 'min-h-10 rounded-sm border border-stone bg-paper px-3 text-sm focus:border-forest focus:outline-none';

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const query: BookingListQuery = {
    page: Number(params.get('page') ?? 1) || 1,
    pageSize: 20,
    q: params.get('q') ?? undefined,
    status: (params.get('status') as BookingStatus | null) ?? '',
    dateField: (params.get('dateField') as BookingListQuery['dateField']) ?? 'check_in',
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    sort: params.get('sort') ?? 'created_at',
    order: (params.get('order') as 'asc' | 'desc' | null) ?? 'desc',
  };
  const { data, isLoading, isError, isFetching } = useBookings(query);
  const exportCsv = useExportBookings();
  const [search, setSearch] = useState(query.q ?? '');

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((query.q ?? '') !== search) update({ q: search || undefined });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const sortBy = (col: string) =>
    update({ sort: col, order: query.sort === col && query.order === 'desc' ? 'asc' : 'desc' });
  const sortProps = { sort: query.sort ?? 'created_at', order: query.order ?? 'desc', onSort: sortBy };


  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bookings"
        description="Search, filter and manage reservation requests."
        actions={
          <AdminButton
            variant="secondary"
            onClick={() =>
              exportCsv({ q: query.q, status: query.status, dateField: query.dateField, from: query.from, to: query.to, sort: query.sort, order: query.order }).catch(() =>
                toast.error('Export failed'),
              )
            }
          >
            <Download className="size-4" /> Export CSV
          </AdminButton>
        }
      />

      <div className="grid gap-3 rounded-sm border border-stone bg-paper p-4 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search bookings</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, guest name or phone"
            className={cn(control, 'w-full pl-9')}
          />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select className={control} value={query.status} onChange={(e) => update({ status: e.target.value || undefined })}>
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Date field</span>
          <select className={control} value={query.dateField} onChange={(e) => update({ dateField: e.target.value })}>
            <option value="check_in">Check-in date</option>
            <option value="check_out">Check-out date</option>
            <option value="created_at">Received date</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">From</span>
          <input type="date" className={control} value={query.from ?? ''} onChange={(e) => update({ from: e.target.value || undefined })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">To</span>
          <input type="date" className={control} value={query.to ?? ''} onChange={(e) => update({ to: e.target.value || undefined })} />
        </label>
      </div>

      {isError && <ErrorState message="Bookings could not be loaded." />}
      {isLoading && <Skeleton className="h-96" />}
      {data && data.items.length === 0 && <EmptyState title="No bookings match">Try clearing a filter.</EmptyState>}

      {data && data.items.length > 0 && (
        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-sm border border-stone bg-paper lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone bg-ivory text-xs uppercase tracking-[0.08em] text-ink-soft">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Reference</th>
                  <SortHeader {...sortProps} col="guest_name">Guest</SortHeader>
                  <th scope="col" className="px-3 py-2 font-semibold">Room</th>
                  <SortHeader {...sortProps} col="check_in">Stay</SortHeader>
                  <th scope="col" className="px-3 py-2 font-semibold">Guests</th>
                  <SortHeader {...sortProps} col="total_amount" className="text-right">Total</SortHeader>
                  <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                  <SortHeader {...sortProps} col="created_at">Received</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone">
                {data.items.map((b) => (
                  <tr key={b.id} className="hover:bg-ivory/60">
                    <td className="px-3 py-3">
                      <Link to={`/admin/bookings/${b.id}`} className="font-mono text-xs font-semibold text-forest underline-offset-2 hover:underline">
                        {b.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold">{b.guestName}</span>
                      <span className="block text-xs text-ink-soft">
                        <a href={`tel:${b.guestPhone}`} className="hover:underline">{b.guestPhone}</a>
                        {b.guestEmail && <> · {b.guestEmail}</>}
                      </span>
                    </td>
                    <td className="px-3 py-3">{b.roomNames}</td>
                    <td className="tabular px-3 py-3 whitespace-nowrap">
                      {formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)}
                      <span className="block text-xs text-ink-soft">{b.nights} nights · {b.rooms} room{b.rooms > 1 ? 's' : ''}</span>
                    </td>
                    <td className="tabular px-3 py-3">{b.adults}A{b.children ? ` + ${b.children}C` : ''}</td>
                    <td className="tabular px-3 py-3 text-right">
                      {formatINR(b.totalAmount)}
                      <span className="block"><PaymentBadge status={b.paymentStatus} /></span>
                    </td>
                    <td className="px-3 py-3"><BookingStatusBadge status={b.status} /></td>
                    <td className="px-3 py-3 text-xs text-ink-soft">{formatDateTimeIST(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 lg:hidden">
            {data.items.map((b) => (
              <li key={b.id}>
                <Link to={`/admin/bookings/${b.id}`} className="block rounded-sm border border-stone bg-paper p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{b.guestName}</p>
                      <p className="font-mono text-xs text-ink-soft">{b.reference}</p>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="tabular mt-2 text-sm">
                    {formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)} · {b.roomNames}
                  </p>
                  <p className="tabular mt-1 flex justify-between text-xs text-ink-soft">
                    <span>{b.guestPhone}</span>
                    <span>{formatINR(b.totalAmount)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => update({ page: String(p) })} />
        </div>
      )}
    </div>
  );
}
