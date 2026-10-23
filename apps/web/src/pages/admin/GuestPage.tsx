import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatINR, todayInIST } from '@eden/shared/core';
import { AdminPageHeader, BookingStatusBadge, formatDateTimeIST, formatShortDate, Panel } from '@/components/admin/AdminUi';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useGuest } from '@/services/admin';

export default function GuestPage() {
  const { id = '' } = useParams();
  const { data: g, isLoading, isError } = useGuest(id);
  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !g) return <ErrorState message="Guest not found." />;

  const today = todayInIST();
  const current = g.bookings.filter((b) => b.checkOut >= today && !['cancelled', 'rejected', 'checked_out'].includes(b.status));
  const past = g.bookings.filter((b) => !current.includes(b));

  return (
    <div className="space-y-6">
      <Link to="/admin/bookings" className="inline-flex items-center gap-2 text-sm text-forest hover:underline">
        <ArrowLeft className="size-4" /> Bookings
      </Link>
      <AdminPageHeader title={g.fullName} description={`Guest since ${formatDateTimeIST(g.createdAt)} · ${g.bookings.length} booking(s)`} />
      <Panel title="Contact">
        <p className="text-sm">
          <a href={`tel:${g.phone}`} className="text-forest underline">{g.phone}</a>
          {g.email && (
            <>
              {' · '}
              <a href={`mailto:${g.email}`} className="text-forest underline">{g.email}</a>
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-ink-soft">Guests are matched by phone number. The name and email on each booking are as the guest entered them.</p>
      </Panel>
      {[
        ['Current & upcoming', current],
        ['Previous & closed', past],
      ].map(([title, rows]) => (
        <Panel key={title as string} title={title as string}>
          {(rows as typeof g.bookings).length === 0 ? (
            <p className="text-sm text-ink-soft">None.</p>
          ) : (
            <ul className="-my-2 divide-y divide-stone">
              {(rows as typeof g.bookings).map((b) => (
                <li key={b.id}>
                  <Link to={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:bg-ivory">
                    <span>
                      <span className="font-mono text-xs">{b.reference}</span> · {formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)} · {b.roomNames}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular">{formatINR(b.totalAmount)}</span>
                      <BookingStatusBadge status={b.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ))}
    </div>
  );
}
