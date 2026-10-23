import { useState } from 'react';
import { useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { DayPicker, type DateRange } from 'react-day-picker';
import { CalendarDays, Minus, Plus, Users, X } from 'lucide-react';
import { formatDisplayDate, MAX_NIGHTS, nightsBetween, todayInIST } from '@eden/shared/core';
import { cn, pluralize } from '@/lib/utils';
import { dateToIso, isoToDate, stayNights, stayToParams, type StayState } from './stay';

interface StaySearchProps {
  value: StayState;
  onChange: (next: StayState) => void;
  /** Called with a complete stay; defaults to navigating to /book. */
  onSubmit?: (stay: StayState) => void;
  tone?: 'overlay' | 'paper';
  submitLabel?: string;
  /** Two-row layout for narrow containers. */
  stacked?: boolean;
  className?: string;
}

export function StaySearch({
  value,
  onChange,
  onSubmit,
  tone = 'paper',
  submitLabel = 'Check availability',
  stacked,
  className,
}: StaySearchProps) {
  const navigate = useNavigate();
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const nights = stayNights(value);
  const complete = Boolean(value.checkIn && value.checkOut);

  const submit = () => {
    if (!complete) {
      setDatesOpen(true);
      return;
    }
    if (onSubmit) onSubmit(value);
    else navigate(`/book?${stayToParams(value).toString()}`);
  };

  const overlay = tone === 'overlay';
  const fieldCls = cn(
    'group flex min-h-16 w-full flex-col justify-center gap-1 px-5 py-3 text-left transition-colors',
    overlay ? 'hover:bg-ivory/10' : 'hover:bg-ivory',
  );

  return (
    <div
      className={cn(
        'grid w-full grid-cols-1',
        stacked ? 'sm:grid-cols-2 [&>button:last-child]:sm:col-span-2' : 'sm:grid-cols-[1.4fr_1fr_auto]',
        overlay ? 'border border-ivory/25 bg-woodland/55 text-ivory backdrop-blur-md' : 'border border-forest/15 bg-paper text-ink',
        className,
      )}
    >
      <Dialog.Root open={datesOpen} onOpenChange={setDatesOpen}>
        <Dialog.Trigger className={cn(fieldCls, 'sm:border-r', overlay ? 'border-ivory/20' : 'border-forest/15')}>
          <span className={cn('eyebrow flex items-center gap-2', overlay ? 'text-sage' : 'text-ink-soft')}>
            <CalendarDays className="size-3.5" aria-hidden /> Arrive — Depart
          </span>
          <span className="font-display text-xl leading-tight">
            {value.checkIn && value.checkOut ? (
              <>
                {formatDisplayDate(value.checkIn, { year: undefined })} — {formatDisplayDate(value.checkOut, { year: undefined })}
                <span className="ml-2 text-base opacity-70">· {pluralize(nights, 'night')}</span>
              </>
            ) : (
              <span className="opacity-80">Choose your dates</span>
            )}
          </span>
        </Dialog.Trigger>
        <DatesDialog value={value} onChange={onChange} onDone={() => setDatesOpen(false)} />
      </Dialog.Root>

      <Dialog.Root open={guestsOpen} onOpenChange={setGuestsOpen}>
        <Dialog.Trigger
          className={cn(fieldCls, 'border-t sm:border-t-0', !stacked && 'sm:border-r', overlay ? 'border-ivory/20' : 'border-forest/15')}
        >
          <span className={cn('eyebrow flex items-center gap-2', overlay ? 'text-sage' : 'text-ink-soft')}>
            <Users className="size-3.5" aria-hidden /> Guests
          </span>
          <span className="font-display text-xl leading-tight">
            {pluralize(value.adults, 'adult')}
            {value.children > 0 && `, ${pluralize(value.children, 'child', 'children')}`}
            <span className="ml-2 text-base opacity-70">· {pluralize(value.rooms, 'room')}</span>
          </span>
        </Dialog.Trigger>
        <GuestsDialog value={value} onChange={onChange} onDone={() => setGuestsOpen(false)} />
      </Dialog.Root>

      <button
        type="button"
        onClick={submit}
        className={cn(
          'eyebrow min-h-16 px-8 transition-colors',
          overlay ? 'bg-ivory text-woodland hover:bg-paper' : 'bg-forest text-ivory hover:bg-woodland',
        )}
      >
        {submitLabel}
      </button>
    </div>
  );
}

function SheetContent({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-woodland/60 backdrop-blur-[2px]" />
      <Dialog.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto bg-paper px-5 pb-6 pt-6 text-ink shadow-2xl',
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-auto sm:min-w-[22rem] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-8 sm:pb-8',
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <Dialog.Title className="font-display text-3xl text-forest">{title}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-ink-soft">{description}</Dialog.Description>
          </div>
          <Dialog.Close className="-mr-2 inline-flex size-11 items-center justify-center text-ink-soft hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function DatesDialog({ value, onChange, onDone }: { value: StayState; onChange: (s: StayState) => void; onDone: () => void }) {
  const today = isoToDate(todayInIST());
  const selected: DateRange | undefined = value.checkIn
    ? { from: isoToDate(value.checkIn), to: value.checkOut ? isoToDate(value.checkOut) : undefined }
    : undefined;
  const nights = stayNights(value);
  const tooLong = nights > MAX_NIGHTS;

  return (
    <SheetContent title="Your dates" description="Select arrival, then departure. Dates follow India Standard Time.">
      <DayPicker
        mode="range"
        className="eden-calendar mt-4"
        numberOfMonths={typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 2 : 1}
        selected={selected}
        defaultMonth={selected?.from ?? today}
        startMonth={today}
        disabled={{ before: today }}
        excludeDisabled
        min={1}
        onSelect={(range) => {
          const checkIn = range?.from ? dateToIso(range.from) : null;
          let checkOut = range?.to ? dateToIso(range.to) : null;
          if (checkIn && checkOut && checkOut <= checkIn) checkOut = null;
          onChange({ ...value, checkIn, checkOut });
        }}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-stone pt-4">
        <p className="text-sm text-ink-soft" aria-live="polite">
          {value.checkIn && value.checkOut
            ? `${formatDisplayDate(value.checkIn)} → ${formatDisplayDate(value.checkOut)} · ${pluralize(nightsBetween(value.checkIn, value.checkOut), 'night')}`
            : value.checkIn
              ? 'Now choose your departure date'
              : 'Choose your arrival date'}
          {tooLong && <span className="block text-danger">Online requests are limited to {MAX_NIGHTS} nights — please call us.</span>}
        </p>
        <button
          type="button"
          disabled={!value.checkIn || !value.checkOut || tooLong}
          onClick={onDone}
          className="eyebrow min-h-12 bg-forest px-6 text-ivory disabled:opacity-40"
        >
          Done
        </button>
      </div>
    </SheetContent>
  );
}

export function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-stone py-4">
      <div>
        <p className="font-display text-2xl leading-none">{label}</p>
        {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      </div>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="inline-flex size-11 items-center justify-center border border-forest/25 text-forest hover:border-forest disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <output aria-live="polite" className="tabular w-10 text-center font-display text-2xl">
          {value}
        </output>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="inline-flex size-11 items-center justify-center border border-forest/25 text-forest hover:border-forest disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function GuestsDialog({ value, onChange, onDone }: { value: StayState; onChange: (s: StayState) => void; onDone: () => void }) {
  return (
    <SheetContent title="Guests & rooms" description="Each room needs at least one adult.">
      <div className="mt-4 sm:w-[24rem]">
        <Counter
          label="Adults"
          value={value.adults}
          min={Math.max(1, value.rooms)}
          max={20}
          onChange={(adults) => onChange({ ...value, adults })}
        />
        <Counter
          label="Children"
          hint="Please mention ages in your special requests"
          value={value.children}
          min={0}
          max={20}
          onChange={(children) => onChange({ ...value, children })}
        />
        <Counter
          label="Rooms"
          value={value.rooms}
          min={1}
          max={Math.min(10, value.adults)}
          onChange={(rooms) => onChange({ ...value, rooms })}
        />
        <button type="button" onClick={onDone} className="eyebrow mt-6 min-h-12 w-full bg-forest px-6 text-ivory">
          Done
        </button>
      </div>
    </SheetContent>
  );
}
