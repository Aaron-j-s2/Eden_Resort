import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SettingKey, SiteSettings } from '@eden/shared/core';
import { AdminButton, AdminPageHeader, Panel } from '@/components/admin/AdminUi';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { ApiError } from '@/lib/api';
import { publicPhotos } from '@/lib/images';
import { cn } from '@/lib/utils';
import { useAdminSettings, useSaveSetting } from '@/services/admin';

/* ------------------------------------------------------------ Field specs */

type Kind = 'text' | 'textarea' | 'nullable' | 'nullableTextarea' | 'number' | 'boolean' | 'lines' | 'paragraphs' | 'image';
interface FieldSpec {
  name: string;
  label: string;
  kind: Kind;
  hint?: string;
}
interface SectionSpec {
  key: SettingKey;
  title: string;
  description: string;
  fields?: FieldSpec[];
  list?: { prop: string; itemLabel: string; fields: FieldSpec[]; blank: Record<string, unknown> };
}

const SECTIONS: SectionSpec[] = [
  {
    key: 'contact',
    title: 'Contact & address',
    description: 'Shown in the header, footer, contact page and booking confirmations.',
    fields: [
      { name: 'resortName', label: 'Resort name', kind: 'text' },
      { name: 'phone', label: 'Phone (as displayed)', kind: 'text' },
      { name: 'whatsappNumber', label: 'WhatsApp number', kind: 'text', hint: 'Digits only with country code, e.g. 919597445838' },
      { name: 'email', label: 'Public email', kind: 'nullable', hint: 'Leave blank until an official address is confirmed' },
      { name: 'addressLines', label: 'Address lines', kind: 'lines', hint: 'One line per row' },
      { name: 'postalCode', label: 'PIN code', kind: 'text' },
      { name: 'mapsQuery', label: 'Google Maps search text', kind: 'text', hint: 'Used for the directions link and map' },
    ],
  },
  {
    key: 'booking_policy',
    title: 'Booking policies',
    description: 'Blank fields show “confirmed on booking” on the website.',
    fields: [
      { name: 'checkInTime', label: 'Check-in time', kind: 'nullable', hint: 'e.g. 12:00 noon' },
      { name: 'checkOutTime', label: 'Check-out time', kind: 'nullable' },
      { name: 'cancellationPolicy', label: 'Cancellation policy', kind: 'nullableTextarea' },
      { name: 'childPolicy', label: 'Children policy', kind: 'nullableTextarea' },
      { name: 'idPolicy', label: 'ID requirements', kind: 'nullableTextarea' },
      { name: 'houseRules', label: 'House rules', kind: 'lines', hint: 'One rule per line' },
      { name: 'paymentInstructions', label: 'Payment instructions shown to guests', kind: 'nullableTextarea' },
      { name: 'taxRatePercent', label: 'Tax rate (%)', kind: 'number', hint: 'Applied to new quotes. Confirm the applicable GST rate with your accountant.' },
      { name: 'taxLabel', label: 'Tax label', kind: 'text' },
      {
        name: 'pendingHoldsInventory',
        label: 'Pending requests hold rooms',
        kind: 'boolean',
        hint: 'On: a new request reserves the room until you confirm or reject it. Off: only confirmed bookings block rooms (requests may then compete for the last room).',
      },
    ],
  },
  {
    key: 'homepage',
    title: 'Homepage',
    description: 'The main words on the homepage.',
    fields: [
      { name: 'heroEyebrow', label: 'Small label above the headline', kind: 'text' },
      { name: 'heroHeadline', label: 'Headline', kind: 'text' },
      { name: 'heroIntro', label: 'Introduction', kind: 'textarea' },
      { name: 'storyHeading', label: 'Story heading', kind: 'text' },
      { name: 'storyBody', label: 'Story paragraphs', kind: 'paragraphs', hint: 'Separate paragraphs with a blank line. Describe only what is true of the resort.' },
      { name: 'bookingInvitation', label: 'Booking invitation', kind: 'textarea' },
    ],
  },
  {
    key: 'experiences',
    title: 'Experiences',
    description: 'Only items marked “confirmed” appear on the website.',
    list: {
      prop: 'items',
      itemLabel: 'Experience',
      blank: { key: '', title: '', summary: '', body: '', confirmed: false, image: null, imageAlt: null },
      fields: [
        { name: 'title', label: 'Title', kind: 'text' },
        { name: 'key', label: 'Anchor key', kind: 'text', hint: 'lowercase-with-hyphens' },
        { name: 'summary', label: 'Summary', kind: 'textarea' },
        { name: 'body', label: 'Description', kind: 'textarea' },
        { name: 'image', label: 'Photograph', kind: 'image' },
        { name: 'imageAlt', label: 'Photograph description', kind: 'nullable' },
        { name: 'confirmed', label: 'Confirmed by the resort — show on website', kind: 'boolean' },
      ],
    },
  },
  {
    key: 'nearby',
    title: 'Nearby attractions',
    description: 'Unverified distances are shown as approximate.',
    list: {
      prop: 'items',
      itemLabel: 'Attraction',
      blank: { name: '', description: '', distance: null, distanceVerified: false },
      fields: [
        { name: 'name', label: 'Name', kind: 'text' },
        { name: 'description', label: 'Description', kind: 'textarea' },
        { name: 'distance', label: 'Distance', kind: 'nullable', hint: 'e.g. 6 km — leave blank if unknown' },
        { name: 'distanceVerified', label: 'Distance has been verified', kind: 'boolean' },
      ],
    },
  },
  {
    key: 'faq',
    title: 'Frequently asked questions',
    description: 'Shown on the contact page.',
    list: {
      prop: 'items',
      itemLabel: 'Question',
      blank: { question: '', answer: '' },
      fields: [
        { name: 'question', label: 'Question', kind: 'text' },
        { name: 'answer', label: 'Answer', kind: 'textarea' },
      ],
    },
  },
  {
    key: 'sustainability',
    title: 'Sustainability practices',
    description: 'Add only practices the resort actually follows and can substantiate. The section is hidden while empty.',
    list: {
      prop: 'practices',
      itemLabel: 'Practice',
      blank: { title: '', body: '' },
      fields: [
        { name: 'title', label: 'Title', kind: 'text' },
        { name: 'body', label: 'Description', kind: 'textarea' },
      ],
    },
  },
  {
    key: 'gallery_categories',
    title: 'Gallery categories',
    description: 'Filters on the gallery page.',
    list: {
      prop: 'items',
      itemLabel: 'Category',
      blank: { key: '', label: '' },
      fields: [
        { name: 'label', label: 'Label', kind: 'text' },
        { name: 'key', label: 'Key', kind: 'text', hint: 'lowercase-with-hyphens' },
      ],
    },
  },
  {
    key: 'social',
    title: 'Social links',
    description: 'Only add official accounts. Blank links are hidden.',
    fields: [
      { name: 'instagram', label: 'Instagram URL', kind: 'nullable' },
      { name: 'facebook', label: 'Facebook URL', kind: 'nullable' },
      { name: 'youtube', label: 'YouTube URL', kind: 'nullable' },
      { name: 'googleBusiness', label: 'Google Business profile URL', kind: 'nullable' },
    ],
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Staff email alerts. Delivery also needs an email provider key in the server configuration (see docs).',
    fields: [
      { name: 'emailOnNewBooking', label: 'Email staff on new booking requests', kind: 'boolean' },
      { name: 'emailOnNewEnquiry', label: 'Email staff on new enquiries', kind: 'boolean' },
      { name: 'staffEmail', label: 'Staff email address', kind: 'nullable' },
      { name: 'whatsappAlerts', label: 'WhatsApp alerts (requires a WhatsApp Business API integration — not yet connected)', kind: 'boolean' },
    ],
  },
];

/* ---------------------------------------------------------------- Page */

export default function SettingsPage() {
  const { data, isLoading, isError } = useAdminSettings();
  const [active, setActive] = useState<SettingKey>('contact');
  const section = SECTIONS.find((s) => s.key === active)!;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" description="Public website content and booking policies. Secrets and API keys are never stored here." />
      {isError && <ErrorState message="Settings could not be loaded." />}
      {isLoading && <Skeleton className="h-96" />}
      {data && (
        <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
          <nav aria-label="Settings sections" className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                aria-current={active === s.key ? 'page' : undefined}
                className={cn(
                  'min-h-10 shrink-0 rounded-sm px-3 text-left text-sm',
                  active === s.key ? 'bg-forest text-ivory' : 'text-ink-soft hover:bg-paper',
                )}
              >
                {s.title}
              </button>
            ))}
          </nav>
          <SectionEditor key={section.key} spec={section} initial={(data[section.key] ?? {}) as Record<string, unknown>} />
        </div>
      )}
    </div>
  );
}

function SectionEditor({ spec, initial }: { spec: SectionSpec; initial: Record<string, unknown> }) {
  const [value, setValue] = useState<Record<string, unknown>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveSetting();

  const submit = async () => {
    setErrors({});
    try {
      await save.mutateAsync({ key: spec.key, value: value as SiteSettings[typeof spec.key] });
      toast.success(`${spec.title} saved`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.path.replace(/^value\./, ''), d.message])));
        toast.error('Please fix the highlighted fields');
      } else toast.error('Could not save');
    }
  };

  const items = spec.list ? ((value[spec.list.prop] as Record<string, unknown>[] | undefined) ?? []) : [];
  const setItems = (next: Record<string, unknown>[]) => setValue({ ...value, [spec.list!.prop]: next });

  return (
    <Panel title={spec.title} actions={<AdminButton onClick={submit} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</AdminButton>}>
      <p className="mb-5 text-sm text-ink-soft">{spec.description}</p>
      {spec.fields && (
        <div className="grid gap-4 md:grid-cols-2">
          {spec.fields.map((f) => (
            <FieldInput key={f.name} spec={f} value={value[f.name]} error={errors[f.name]} onChange={(v) => setValue({ ...value, [f.name]: v })} />
          ))}
        </div>
      )}
      {spec.list && (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <fieldset key={idx} className="rounded-sm border border-stone p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                {spec.list!.itemLabel} {idx + 1}
              </legend>
              <div className="mb-3 flex justify-end gap-1">
                <AdminButton variant="ghost" aria-label="Move up" disabled={idx === 0} onClick={() => setItems(swap(items, idx, idx - 1))}><ArrowUp className="size-4" /></AdminButton>
                <AdminButton variant="ghost" aria-label="Move down" disabled={idx === items.length - 1} onClick={() => setItems(swap(items, idx, idx + 1))}><ArrowDown className="size-4" /></AdminButton>
                <AdminButton variant="ghost" aria-label="Remove" className="text-danger" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="size-4" /></AdminButton>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {spec.list!.fields.map((f) => (
                  <FieldInput
                    key={f.name}
                    spec={f}
                    value={item[f.name]}
                    error={errors[`${spec.list!.prop}.${idx}.${f.name}`]}
                    onChange={(v) => setItems(items.map((it, i) => (i === idx ? { ...it, [f.name]: v } : it)))}
                  />
                ))}
              </div>
            </fieldset>
          ))}
          <AdminButton variant="secondary" onClick={() => setItems([...items, { ...spec.list!.blank }])}>
            <Plus className="size-4" /> Add {spec.list.itemLabel.toLowerCase()}
          </AdminButton>
        </div>
      )}
    </Panel>
  );
}

const swap = <T,>(arr: T[], a: number, b: number) => {
  const next = [...arr];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
};

const inputCls = 'w-full rounded-sm border border-stone bg-paper px-3 py-2 text-sm focus:border-forest focus:outline-none aria-[invalid=true]:border-danger';

function FieldInput({ spec, value, error, onChange }: { spec: FieldSpec; value: unknown; error?: string; onChange: (v: unknown) => void }) {
  const id = useId();
  const wide = ['textarea', 'nullableTextarea', 'lines', 'paragraphs'].includes(spec.kind);
  const label = (
    <label htmlFor={id} className="text-xs font-semibold text-ink-soft">
      {spec.label}
    </label>
  );
  const help = error ? <p className="text-xs text-danger" role="alert">{error}</p> : spec.hint ? <p className="text-xs text-ink-soft">{spec.hint}</p> : null;

  if (spec.kind === 'boolean') {
    return (
      <div className="md:col-span-2">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-forest" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{spec.label}</span>
        </label>
        {help && <div className="ml-7 mt-1">{help}</div>}
      </div>
    );
  }

  let control: React.ReactNode;
  switch (spec.kind) {
    case 'textarea':
    case 'nullableTextarea':
      control = (
        <textarea
          id={id}
          rows={4}
          aria-invalid={Boolean(error)}
          className={inputCls}
          value={(value as string | null) ?? ''}
          onChange={(e) => onChange(spec.kind === 'nullableTextarea' ? e.target.value.trim() ? e.target.value : null : e.target.value)}
        />
      );
      break;
    case 'lines':
      control = (
        <textarea
          id={id}
          rows={4}
          aria-invalid={Boolean(error)}
          className={inputCls}
          value={((value as string[] | undefined) ?? []).join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n').filter((l, i, all) => l.trim() || i === all.length - 1))}
          onBlur={(e) => onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
        />
      );
      break;
    case 'paragraphs':
      control = (
        <textarea
          id={id}
          rows={8}
          aria-invalid={Boolean(error)}
          className={inputCls}
          defaultValue={((value as string[] | undefined) ?? []).join('\n\n')}
          onBlur={(e) => onChange(e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean))}
        />
      );
      break;
    case 'number':
      control = <input id={id} type="number" step="0.01" min={0} aria-invalid={Boolean(error)} className={inputCls} value={(value as number | undefined) ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
      break;
    case 'image':
      control = (
        <select id={id} className={inputCls} value={(value as string | null) ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">No photograph yet (shows a placeholder)</option>
          {publicPhotos.map((p) => (
            <option key={p.slug} value={p.src}>{p.alt}</option>
          ))}
        </select>
      );
      break;
    default:
      control = (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          className={inputCls}
          value={(value as string | null) ?? ''}
          onChange={(e) => onChange(spec.kind === 'nullable' ? (e.target.value.trim() ? e.target.value : null) : e.target.value)}
        />
      );
  }
  return (
    <div className={cn('flex flex-col gap-1.5', wide && 'md:col-span-2')}>
      {label}
      {control}
      {help}
    </div>
  );
}
