import { Link } from 'react-router';
import { formatDisplayDate, formatINR, type AdminBookingRow } from '@eden/shared/core';
import { AdminPageHeader, BookingStatusBadge, formatDateTimeIST, formatShortDate, Panel, Stat } from '@/components/admin/AdminUi';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useDashboard } from '@/services/admin';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        description={data ? `Today is ${formatDisplayDate(data.today)} (IST). All figures are live from the booking database.` : 'Live figures from the booking database.'}
      />
      {isError && <ErrorState message="The dashboard could not be loaded." action={<button className="underline" onClick={() => refetch()}>Retry</button>} />}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="New requests" value={data.pendingRequests} tone={data.pendingRequests > 0 ? 'attention' : 'default'} hint="Pending confirmation" />
            <Stat label="Arriving today" value={data.checkInsToday} />
            <Stat label="Departing today" value={data.checkOutsToday} />
            <Stat
              label="Rooms occupied tonight"
              value={
                <>
                  {data.roomsOccupiedTonight}
                  <span className="text-xl text-ink-soft"> / {data.totalInventory}</span>
                </>
              }
              hint="Confirmed & checked-in vs. active inventory"
            />
            <Stat label="Confirmed upcoming" value={data.confirmedUpcoming} />
            <Stat label="Guests in house" value={data.inHouseTonight} hint="Bookings checked in" />
            <Stat label="Open enquiries" value={data.openEnquiries} tone={data.openEnquiries > 0 ? 'attention' : 'default'} />
            <Stat label="All bookings" value={data.totalBookings} />
          </div>
          {data.revenueCollected !== null ? (
            <p className="text-sm text-ink-soft">Verified payments received: {formatINR(data.revenueCollected)}</p>
          ) : (
            <p className="text-xs text-ink-soft">Revenue is not shown: no online payment provider is connected, so there are no verified payment records.</p>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Requests awaiting confirmation" actions={<Link to="/admin/bookings?status=pending" className="text-sm text-forest underline">All</Link>}>
              <BookingMiniList rows={data.recentRequests} empty="No pending requests." showCreated />
            </Panel>
            <Panel title="Upcoming arrivals" actions={<Link to="/admin/calendar" className="text-sm text-forest underline">Calendar</Link>}>
              <BookingMiniList rows={data.upcomingArrivals} empty="No upcoming arrivals." />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function BookingMiniList({ rows, empty, showCreated }: { rows: AdminBookingRow[]; empty: string; showCreated?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="-my-2 divide-y divide-stone">
      {rows.map((b) => (
        <li key={b.id}>
          <Link to={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:bg-ivory">
            <span>
              <span className="font-semibold">{b.guestName}</span>
              <span className="ml-2 font-mono text-xs text-ink-soft">{b.reference}</span>
              <span className="block text-xs text-ink-soft">
                {formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)} · {b.roomNames} · {b.adults + b.children} guests
                {showCreated && ` · received ${formatDateTimeIST(b.createdAt)}`}
              </span>
            </span>
            <BookingStatusBadge status={b.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
