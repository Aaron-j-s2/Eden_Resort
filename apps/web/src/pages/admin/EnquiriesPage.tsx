import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { Mail, MessageCircle, Phone, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { ENQUIRY_STATUSES, ENQUIRY_TYPE_LABELS, ENQUIRY_TYPES, type EnquiryStatus } from '@eden/shared/core';
import { AdminButton, AdminPageHeader, EnquiryStatusBadge, formatDateTimeIST, Pagination } from '@/components/admin/AdminUi';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { cn, whatsappHref } from '@/lib/utils';
import { useEnquiries, useEnquiry, useUpdateEnquiry } from '@/services/admin';

const control = 'min-h-10 rounded-sm border border-stone bg-paper px-3 text-sm focus:border-forest focus:outline-none';
const STATUS_LABEL: Record<EnquiryStatus, string> = { new: 'New', in_progress: 'In progress', resolved: 'Resolved' };

export default function EnquiriesPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const status = (params.get('status') ?? '') as EnquiryStatus | '';
  const type = params.get('type') ?? '';
  const [search, setSearch] = useState(params.get('q') ?? '');
  const openId = params.get('id');
  const { data, isLoading, isError } = useEnquiries({ page, pageSize: 20, q: params.get('q') ?? undefined, status, type: type || undefined });

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch) && !('id' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => (params.get('q') ?? '') !== search && update({ q: search || undefined }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Enquiries" description="Messages from the contact form." />
      <div className="grid gap-3 rounded-sm border border-stone bg-paper p-4 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search enquiries</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, email or message" className={cn(control, 'w-full pl-9')} />
        </label>
        <select aria-label="Status" className={control} value={status} onChange={(e) => update({ status: e.target.value || undefined })}>
          <option value="">All statuses</option>
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select aria-label="Type" className={control} value={type} onChange={(e) => update({ type: e.target.value || undefined })}>
          <option value="">All types</option>
          {ENQUIRY_TYPES.map((t) => (
            <option key={t} value={t}>{ENQUIRY_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {isError && <ErrorState message="Enquiries could not be loaded." />}
      {isLoading && <Skeleton className="h-80" />}
      {data && data.items.length === 0 && <EmptyState title="No enquiries" />}
      {data && data.items.length > 0 && (
        <>
          <ul className="divide-y divide-stone rounded-sm border border-stone bg-paper">
            {data.items.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => update({ id: e.id })} className="grid w-full gap-1 px-4 py-3 text-left hover:bg-ivory sm:grid-cols-[12rem_1fr_auto] sm:gap-4">
                  <span>
                    <span className="block font-semibold">{e.name}</span>
                    <span className="block text-xs text-ink-soft">{e.phone}</span>
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">{ENQUIRY_TYPE_LABELS[e.enquiryType]}</span>
                    <span className="block truncate">{e.message}</span>
                  </span>
                  <span className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <EnquiryStatusBadge status={e.status} />
                    <span className="text-xs text-ink-soft">{formatDateTimeIST(e.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => update({ page: String(p) })} />
        </>
      )}

      <EnquiryDrawer id={openId} onClose={() => update({ id: undefined })} />
    </div>
  );
}

function EnquiryDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: e, isLoading } = useEnquiry(id);
  const mutations = useUpdateEnquiry(id ?? '');
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<'note' | 'follow_up'>('follow_up');

  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-woodland/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-paper p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-3xl text-forest">{e?.name ?? 'Enquiry'}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="inline-flex size-10 items-center justify-center">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Enquiry details, status and follow-up notes</Dialog.Description>
          {isLoading && <Skeleton className="mt-6 h-64" />}
          {e && (
            <div className="mt-4 space-y-6 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <EnquiryStatusBadge status={e.status} />
                <span className="text-xs text-ink-soft">{ENQUIRY_TYPE_LABELS[e.enquiryType]} · {formatDateTimeIST(e.createdAt)}</span>
              </div>
              <ul className="space-y-2">
                <li><a href={`tel:${e.phone}`} className="inline-flex items-center gap-2 text-forest underline"><Phone className="size-4" />{e.phone}</a></li>
                <li><a href={whatsappHref(e.phone, `Hello ${e.name.split(' ')[0]}, this is Eden Falls Resort replying to your enquiry.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-forest underline"><MessageCircle className="size-4" />WhatsApp</a></li>
                {e.email && <li><a href={`mailto:${e.email}`} className="inline-flex items-center gap-2 break-all text-forest underline"><Mail className="size-4" />{e.email}</a></li>}
              </ul>
              <p className="whitespace-pre-line rounded-sm bg-ivory p-4">{e.message}</p>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Status</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ENQUIRY_STATUSES.map((s) => (
                    <AdminButton
                      key={s}
                      variant={e.status === s ? 'primary' : 'secondary'}
                      disabled={mutations.status.isPending || e.status === s}
                      onClick={() => mutations.status.mutateAsync(s).catch(() => toast.error('Could not update status'))}
                    >
                      {STATUS_LABEL[s]}
                    </AdminButton>
                  ))}
                </div>
              </div>

              <form
                className="space-y-2"
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  if (!note.trim()) return;
                  try {
                    await mutations.note.mutateAsync({ note: note.trim(), kind });
                    setNote('');
                  } catch {
                    toast.error('Could not save the note');
                  }
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Record follow-up</p>
                <select value={kind} onChange={(ev) => setKind(ev.target.value as 'note' | 'follow_up')} className={control} aria-label="Entry type">
                  <option value="follow_up">Follow-up action (e.g. called back)</option>
                  <option value="note">Internal note</option>
                </select>
                <textarea
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                  rows={3}
                  maxLength={2000}
                  aria-label="Note"
                  className="w-full rounded-sm border border-stone bg-paper p-3 text-sm focus:border-forest focus:outline-none"
                />
                <AdminButton type="submit" disabled={mutations.note.isPending || !note.trim()}>Save</AdminButton>
              </form>

              <ol className="space-y-3">
                {e.notes.map((n) => (
                  <li key={n.id} className={cn('border-l-2 pl-3', n.kind === 'follow_up' ? 'border-laterite' : 'border-sage')}>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">{n.kind === 'follow_up' ? 'Follow-up' : 'Note'}</p>
                    <p className="whitespace-pre-line">{n.note}</p>
                    <p className="text-xs text-ink-soft">{n.authorName ?? 'Staff'} · {formatDateTimeIST(n.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
