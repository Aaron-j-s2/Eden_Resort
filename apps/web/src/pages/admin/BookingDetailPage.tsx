import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_TRANSITIONS,
  formatDisplayDate,
  formatINR,
  todayInIST,
  type BookingStatus,
} from '@eden/shared/core';
import {
  AdminButton,
  BookingStatusBadge,
  ConfirmDialog,
  formatDateTimeIST,
  Panel,
  PaymentBadge,
} from '@/components/admin/AdminUi';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { ApiError } from '@/lib/api';
import { whatsappHref } from '@/lib/utils';
import { useAddBookingNote, useBooking, useChangeBookingStatus } from '@/services/admin';

const ACTION_COPY: Record<BookingStatus, { label: string; describe: string; destructive?: boolean }> = {
  confirmed: { label: 'Confirm booking', describe: 'Confirm this reservation. Inventory is re-checked for every night before it is confirmed.' },
  rejected: { label: 'Reject request', describe: 'Decline this request. The rooms are released and the guest will see the request as not accepted.', destructive: true },
  cancelled: { label: 'Cancel booking', describe: 'Cancel this reservation and release its rooms. This cannot be undone.', destructive: true },
  checked_in: { label: 'Mark checked in', describe: 'Record that the guest has arrived.' },
  checked_out: { label: 'Mark checked out', describe: 'Record that the guest has left. Remaining nights are released.' },
  pending: { label: 'Pending', describe: '' },
};

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const { data: b, isLoading, isError } = useBooking(id);
  const change = useChangeBookingStatus(id);
  const addNote = useAddBookingNote(id);
  const [pendingAction, setPendingAction] = useState<BookingStatus | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [note, setNote] = useState('');

  if (isLoading) return <Skeleton className="h-[70vh]" />;
  if (isError || !b) return <ErrorState message="This booking could not be loaded." />;

  const actions = BOOKING_TRANSITIONS[b.status];
  const today = todayInIST();

  const runAction = async () => {
    if (!pendingAction) return;
    try {
      await change.mutateAsync({ status: pendingAction, note: actionNote || undefined });
      toast.success(`Booking ${BOOKING_STATUS_LABELS[pendingAction].toLowerCase()}`);
      setPendingAction(null);
      setActionNote('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'The status could not be changed');
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/bookings" className="inline-flex items-center gap-2 text-sm text-forest hover:underline">
        <ArrowLeft className="size-4" /> Bookings
      </Link>

      <header className="flex flex-col gap-4 border-b border-stone pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-sm text-ink-soft">{b.reference}</p>
          <h1 className="mt-1 font-display text-4xl text-forest">{b.guestName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <BookingStatusBadge status={b.status} />
            <PaymentBadge status={b.paymentStatus} />
            <span className="text-xs text-ink-soft">Received {formatDateTimeIST(b.createdAt)} via {b.source}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((s) => {
            const tooEarly = s === 'checked_in' && today < b.checkIn;
            return (
              <AdminButton
                key={s}
                variant={ACTION_COPY[s].destructive ? 'secondary' : 'primary'}
                className={ACTION_COPY[s].destructive ? 'text-danger' : undefined}
                disabled={tooEarly}
                title={tooEarly ? `Check-in opens on ${formatDisplayDate(b.checkIn)}` : undefined}
                onClick={() => setPendingAction(s)}
              >
                {ACTION_COPY[s].label}
              </AdminButton>
            );
          })}
          {actions.length === 0 && <p className="text-sm text-ink-soft">No further status changes are possible.</p>}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Stay">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <Item k="Check-in" v={formatDisplayDate(b.checkIn)} />
              <Item k="Check-out" v={formatDisplayDate(b.checkOut)} />
              <Item k="Nights" v={b.nights} />
              <Item k="Adults" v={b.adults} />
              <Item k="Children" v={b.children} />
              <Item k="Rooms" v={b.rooms} />
            </dl>
            <table className="mt-6 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-ink-soft">
                <tr>
                  <th className="py-2 font-semibold">Room</th>
                  <th className="py-2 font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Rate</th>
                  <th className="py-2 text-right font-semibold">Line total</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-stone border-t border-stone">
                {b.items.map((i) => (
                  <tr key={i.roomTypeId}>
                    <td className="py-2">{i.roomName}</td>
                    <td className="py-2">{i.quantity} × {i.nights} nights</td>
                    <td className="py-2 text-right">{formatINR(i.nightlyRate)}</td>
                    <td className="py-2 text-right">{formatINR(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="tabular border-t border-stone">
                <tr><td colSpan={3} className="py-1 text-right text-ink-soft">Subtotal</td><td className="py-1 text-right">{formatINR(b.subtotal)}</td></tr>
                <tr><td colSpan={3} className="py-1 text-right text-ink-soft">Taxes</td><td className="py-1 text-right">{formatINR(b.taxes)}</td></tr>
                <tr className="font-semibold"><td colSpan={3} className="py-1 text-right">Quoted total</td><td className="py-1 text-right">{formatINR(b.totalAmount)}</td></tr>
              </tfoot>
            </table>
            {b.specialRequests && (
              <div className="mt-6 rounded-sm bg-ivory p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Special requests</p>
                <p className="mt-1 whitespace-pre-line">{b.specialRequests}</p>
              </div>
            )}
          </Panel>

          <Panel title="Staff notes">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                try {
                  await addNote.mutateAsync(note.trim());
                  setNote('');
                } catch {
                  toast.error('The note could not be saved');
                }
              }}
            >
              <label className="sr-only" htmlFor="note">Add a note</label>
              <input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder="Internal note — not visible to the guest"
                className="min-h-10 flex-1 rounded-sm border border-stone bg-paper px-3 text-sm focus:border-forest focus:outline-none"
              />
              <AdminButton type="submit" disabled={addNote.isPending || !note.trim()}>Add note</AdminButton>
            </form>
            <ul className="mt-4 space-y-3">
              {b.notes.map((n) => (
                <li key={n.id} className="border-l-2 border-sage pl-3 text-sm">
                  <p className="whitespace-pre-line">{n.note}</p>
                  <p className="mt-1 text-xs text-ink-soft">{n.authorName ?? 'Staff'} · {formatDateTimeIST(n.createdAt)}</p>
                </li>
              ))}
              {b.notes.length === 0 && <li className="text-sm text-ink-soft">No notes yet.</li>}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Guest" actions={<Link to={`/admin/guests/${b.guestId}`} className="text-sm text-forest underline">History</Link>}>
            <p className="font-semibold">{b.guestName}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href={`tel:${b.guestPhone}`} className="inline-flex items-center gap-2 text-forest hover:underline"><Phone className="size-4" />{b.guestPhone}</a></li>
              <li><a href={whatsappHref(b.guestPhone, `Hello ${b.guestName.split(' ')[0]}, this is Eden Falls Resort about your booking ${b.reference}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-forest hover:underline"><MessageCircle className="size-4" />WhatsApp</a></li>
              {b.guestEmail && <li><a href={`mailto:${b.guestEmail}?subject=Your Eden Falls booking ${b.reference}`} className="inline-flex items-center gap-2 break-all text-forest hover:underline"><Mail className="size-4" />{b.guestEmail}</a></li>}
            </ul>
          </Panel>

          <Panel title="Payment">
            <p className="text-sm"><PaymentBadge status={b.paymentStatus} /></p>
            {b.payments.length === 0 ? (
              <p className="mt-2 text-xs text-ink-soft">No verified payments recorded. Online payment is not connected; collect payment as agreed with the guest.</p>
            ) : (
              <ul className="mt-2 text-sm">
                {b.payments.map((p) => (
                  <li key={p.id}>{p.provider} · {formatINR(p.amount)} · {p.status}</li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Status history">
            <ol className="space-y-3 text-sm">
              {b.history.map((h) => (
                <li key={h.id} className="border-l-2 border-stone pl-3">
                  <p>
                    {h.previousStatus ? `${BOOKING_STATUS_LABELS[h.previousStatus]} → ` : ''}
                    <span className="font-semibold">{BOOKING_STATUS_LABELS[h.newStatus]}</span>
                  </p>
                  {h.note && <p className="text-ink-soft">“{h.note}”</p>}
                  <p className="text-xs text-ink-soft">{h.changedByName ?? 'Website'} · {formatDateTimeIST(h.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(o) => !o && setPendingAction(null)}
        title={pendingAction ? ACTION_COPY[pendingAction].label : ''}
        description={pendingAction ? ACTION_COPY[pendingAction].describe : ''}
        confirmLabel={pendingAction ? ACTION_COPY[pendingAction].label : 'Confirm'}
        destructive={pendingAction ? ACTION_COPY[pendingAction].destructive : false}
        loading={change.isPending}
        onConfirm={runAction}
      >
        <label className="block text-xs font-semibold text-ink-soft" htmlFor="action-note">Note for the history (optional)</label>
        <input
          id="action-note"
          value={actionNote}
          onChange={(e) => setActionNote(e.target.value)}
          maxLength={1000}
          className="mt-1 min-h-10 w-full rounded-sm border border-stone bg-paper px-3 text-sm focus:border-forest focus:outline-none"
        />
      </ConfirmDialog>
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">{k}</dt>
      <dd className="tabular mt-1 text-base">{v}</dd>
    </div>
  );
}
