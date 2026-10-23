import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, eachNight, todayInIST, type CalendarDay } from '@eden/shared/core';
import { AdminButton, AdminPageHeader, BookingStatusBadge, formatShortDate, Panel } from '@/components/admin/AdminUi';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/utils';
import { useCalendar } from '@/services/admin';

type View = 'month' | 'week';

function startOfMonth(iso: string) {
  return `${iso.slice(0, 8)}01`;
}
function addMonths(iso: string, n: number) {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}
function startOfWeek(iso: string) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((day + 6) % 7)); // Monday
}
const monthLabel = (iso: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${iso}T00:00:00Z`));
const dayLabel = (iso: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'narrow' }).format(new Date(`${iso}T00:00:00Z`));

export default function CalendarPage() {
  const today = todayInIST();
  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState(startOfMonth(today));

  const from = view === 'month' ? startOfMonth(anchor) : startOfWeek(anchor);
  const to = view === 'month' ? addMonths(from, 1) : addDays(from, 7);
  const { data, isLoading, isError, isFetching } = useCalendar(from, to);
  const nights = eachNight(from, to);

  const cells = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of data?.days ?? []) map.set(`${d.roomTypeId}|${d.date}`, d);
    return map;
  }, [data]);

  const move = (dir: 1 | -1) => setAnchor(view === 'month' ? addMonths(from, dir) : addDays(from, 7 * dir));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Availability"
        description={
          data
            ? `Rooms reserved per night against inventory. Pending requests ${data.pendingHoldsInventory ? 'hold' : 'do not hold'} inventory under the current policy.`
            : 'Rooms reserved per night against inventory.'
        }
        actions={
          <div className="flex rounded-sm border border-stone bg-paper p-0.5" role="group" aria-label="View">
            {(['month', 'week'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  setAnchor(v === 'month' ? startOfMonth(from) : startOfWeek(from < today && addDays(from, 31) > today ? today : from));
                }}
                className={cn('min-h-9 rounded-sm px-4 text-sm capitalize', view === v ? 'bg-forest text-ivory' : 'text-ink-soft')}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AdminButton variant="secondary" onClick={() => move(-1)} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => setAnchor(view === 'month' ? startOfMonth(today) : startOfWeek(today))}>
            Today
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => move(1)} aria-label="Next">
            <ChevronRight className="size-4" />
          </AdminButton>
          <h2 className="ml-2 font-display text-2xl text-forest">
            {view === 'month' ? monthLabel(from) : `${formatShortDate(from)} – ${formatShortDate(addDays(to, -1))}`}
          </h2>
        </div>
        <Legend />
      </div>

      {isError && <ErrorState message="The calendar could not be loaded." />}
      {isLoading && <Skeleton className="h-80" />}

      {data && (
        <div className={cn('overflow-x-auto rounded-sm border border-stone bg-paper transition-opacity', isFetching && 'opacity-60')}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-32 bg-ivory px-3 py-2 text-left font-semibold">Room type</th>
                {nights.map((n) => (
                  <th key={n} scope="col" className={cn('min-w-8 border-l border-stone px-0.5 py-1 text-center font-normal', n === today && 'bg-laterite/15')}>
                    <span className="block text-ink-soft">{dayLabel(n)}</span>
                    <span className="tabular block font-semibold">{Number(n.slice(8))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.roomTypes.map((rt) => (
                <tr key={rt.id} className="border-t border-stone">
                  <th scope="row" className="sticky left-0 z-10 bg-paper px-3 py-2 text-left font-semibold">
                    {rt.name}
                    <span className="block font-normal text-ink-soft">
                      {rt.inventoryCount} room{rt.inventoryCount === 1 ? '' : 's'}
                      {!rt.isActive && ' · unpublished'}
                    </span>
                  </th>
                  {nights.map((n) => {
                    const c = cells.get(`${rt.id}|${n}`);
                    const used = c ? c.confirmedRooms + (data.pendingHoldsInventory ? c.pendingRooms : 0) : 0;
                    const inv = c?.inventory ?? rt.inventoryCount;
                    const ratio = inv > 0 ? used / inv : 0;
                    return (
                      <td
                        key={n}
                        className={cn(
                          'relative h-14 border-l border-stone px-1 text-center align-middle',
                          ratio >= 1 ? 'bg-forest text-ivory' : ratio >= 0.5 ? 'bg-sage/70' : ratio > 0 ? 'bg-sage-soft' : '',
                          n === today && 'outline outline-2 -outline-offset-2 outline-laterite',
                        )}
                        title={`${n}: ${c?.confirmedRooms ?? 0} confirmed, ${c?.pendingRooms ?? 0} pending of ${inv}; ${c?.checkIns ?? 0} arriving, ${c?.checkOuts ?? 0} departing`}
                      >
                        <span className="tabular block font-semibold">
                          {c?.confirmedRooms ?? 0}/{inv}
                        </span>
                        {c && c.pendingRooms > 0 && <span className="block text-[0.65rem] font-semibold text-laterite-deep">+{c.pendingRooms}p</span>}
                        <span className="absolute inset-x-0 bottom-0.5 flex justify-center gap-0.5 text-[0.6rem] leading-none">
                          {c && c.checkIns > 0 && <span aria-label={`${c.checkIns} arriving`}>▸{c.checkIns}</span>}
                          {c && c.checkOuts > 0 && <span aria-label={`${c.checkOuts} departing`}>◂{c.checkOuts}</span>}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Panel title={`Reservations in this ${view}`}>
          {data.bookings.length === 0 ? (
            <p className="text-sm text-ink-soft">No reservations.</p>
          ) : (
            <ul className="-my-2 divide-y divide-stone">
              {data.bookings.map((b) => (
                <li key={b.id}>
                  <Link to={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm hover:bg-ivory">
                    <span>
                      <span className="tabular">{formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)}</span> · <span className="font-semibold">{b.guestName}</span> · {b.roomNames}
                      {b.rooms > 1 && ` (${b.rooms} rooms)`}
                    </span>
                    <BookingStatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-ink-soft">
      <li className="flex items-center gap-1.5"><span className="size-3 bg-sage-soft" /> Some booked</li>
      <li className="flex items-center gap-1.5"><span className="size-3 bg-sage/70" /> Half or more</li>
      <li className="flex items-center gap-1.5"><span className="size-3 bg-forest" /> Full</li>
      <li><span className="font-semibold text-laterite-deep">+Np</span> pending</li>
      <li>▸ arrivals ◂ departures</li>
    </ul>
  );
}
