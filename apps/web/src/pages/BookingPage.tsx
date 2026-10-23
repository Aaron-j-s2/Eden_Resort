import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatDisplayDate,
  formatINR,
  guestDetailsSchema,
  type AvailabilityResult,
  type GuestDetailsInput,
} from '@eden/shared';
import { SampleNotice } from '@/components/booking/SampleNotice';
import { StaySearch } from '@/components/booking/StaySearch';
import { stayFromParams, stayNights, stayToParams, type StayState } from '@/components/booking/stay';
import { TextAreaField, TextField } from '@/components/forms/Field';
import { Container } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { ResortImage } from '@/components/ui/ResortImage';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useContact } from '@/hooks/useContact';
import { ApiError } from '@/lib/api';
import { Seo } from '@/lib/seo';
import { cn, newIdempotencyKey, pluralize, telHref } from '@/lib/utils';
import { useAvailability, useCreateBooking, useSiteSettings } from '@/services/public';

type Step = 'rooms' | 'details' | 'review';

export default function BookingPage() {
  const [params, setParams] = useSearchParams();
  const stay = useMemo(() => stayFromParams(params), [params]);
  // The editable search draft resets whenever the URL's stay changes.
  const [draftState, setDraftState] = useState({ source: params.toString(), draft: stay });
  if (draftState.source !== params.toString()) setDraftState({ source: params.toString(), draft: stay });
  const draft = draftState.draft;
  const setDraft = (next: StayState) => setDraftState({ source: params.toString(), draft: next });
  const selectedRoomId = params.get('room');
  const step: Step = (params.get('step') as Step | null) ?? 'rooms';
  const complete = Boolean(stay.checkIn && stay.checkOut);

  const availability = useAvailability(
    complete ? { checkIn: stay.checkIn!, checkOut: stay.checkOut!, adults: stay.adults, children: stay.children, rooms: stay.rooms } : null,
  );
  const selected = availability.data?.results.find((r) => r.room.id === selectedRoomId && !r.unavailableReason);

  const go = (next: Partial<{ step: Step; room: string | null }>, s: StayState = stay) => {
    const p = stayToParams(s);
    const room = next.room === undefined ? selectedRoomId : next.room;
    if (room) p.set('room', room);
    if (next.step && next.step !== 'rooms') p.set('step', next.step);
    setParams(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // A details/review URL without a bookable room falls back to the room list.
  const effectiveStep: Step = step !== 'rooms' && (!complete || (availability.data && !selected)) ? 'rooms' : step;

  return (
    <>
      <Seo title="Check availability" description="Choose your dates and send a reservation request to Eden Falls Resort. Nothing is charged online." noindex={params.size > 0} />
      <section className="min-h-svh bg-paper pb-24 pt-28 sm:pt-36">
        <Container>
          <ol className="eyebrow flex flex-wrap gap-x-8 gap-y-2 text-ink-soft" aria-label="Booking steps">
            {(['rooms', 'details', 'review'] as const).map((s, i) => (
              <li key={s} aria-current={effectiveStep === s ? 'step' : undefined} className={cn(effectiveStep === s && 'text-forest')}>
                <span className="chapter mr-2 normal-case tracking-normal">{i + 1}.</span>
                {s === 'rooms' ? 'Dates & room' : s === 'details' ? 'Your details' : 'Review & send'}
              </li>
            ))}
          </ol>

          {effectiveStep === 'rooms' && (
            <>
              <h1 className="mt-6 text-display-md text-forest">
                {complete ? 'Choose your room' : 'When would you like to stay?'}
              </h1>
              <div className="mt-8">
                <StaySearch
                  value={draft}
                  onChange={setDraft}
                  submitLabel={complete ? 'Update search' : 'Check availability'}
                  onSubmit={(s) => go({ step: 'rooms', room: selectedRoomId }, s)}
                />
              </div>
              {complete && <Results query={stay} state={availability} preselected={selectedRoomId} onSelect={(id) => go({ step: 'details', room: id })} />}
            </>
          )}

          {effectiveStep !== 'rooms' && selected && (
            <DetailsAndReview
              stay={stay}
              selected={selected}
              step={effectiveStep}
              onStep={(s) => go({ step: s })}
              onUnavailable={() => {
                availability.refetch();
                go({ step: 'rooms', room: null });
              }}
            />
          )}
          {effectiveStep !== 'rooms' && !selected && availability.isLoading && <Skeleton className="mt-10 h-96" />}
        </Container>
      </section>
    </>
  );
}

/* ----------------------------------------------------------------- Results */

function Results({
  query,
  state,
  preselected,
  onSelect,
}: {
  query: StayState;
  state: ReturnType<typeof useAvailability>;
  preselected: string | null;
  onSelect: (roomId: string) => void;
}) {
  const contact = useContact();
  if (state.isLoading) {
    return (
      <div className="mt-12 space-y-6" aria-busy>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (state.isError) {
    const err = state.error as ApiError;
    return <ErrorState className="mt-12" title="Availability could not be checked" message={err.details?.[0]?.message ?? err.message} />;
  }
  const results = state.data?.results ?? [];
  const bookable = results.filter((r) => !r.unavailableReason);

  return (
    <div className={cn('mt-12 transition-opacity', state.isFetching && 'opacity-60')} aria-live="polite">
      <p className="text-sm text-ink-soft">
        {formatDisplayDate(query.checkIn!)} → {formatDisplayDate(query.checkOut!)} · {pluralize(stayNights(query), 'night')} ·{' '}
        {bookable.length === 0 ? 'no rooms available for these dates' : `${pluralize(bookable.length, 'room type')} available`}
      </p>
      {results.length === 0 && <EmptyState className="mt-8" title="No rooms are listed yet">Please call {contact.phone} to plan your stay.</EmptyState>}
      {results.length > 0 && bookable.length === 0 && (
        <EmptyState className="mt-8" title="Fully booked for these dates">
          Try different dates or fewer rooms — or{' '}
          <a href={telHref(contact.phone)} className="link-line text-forest">
            call us
          </a>{' '}
          and we'll do our best to help.
        </EmptyState>
      )}
      <ul className="mt-8 space-y-6">
        <AnimatePresence initial={false}>
          {results.map((r, i) => (
            <motion.li
              key={r.room.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
            >
              <ResultRow result={r} highlighted={preselected === r.room.id} onSelect={() => onSelect(r.room.id)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function ResultRow({ result, highlighted, onSelect }: { result: AvailabilityResult; highlighted: boolean; onSelect: () => void }) {
  const { room, quote, unavailableReason, availableRooms } = result;
  const disabled = Boolean(unavailableReason);
  return (
    <article
      className={cn(
        'grid gap-0 border bg-paper sm:grid-cols-[16rem_1fr] lg:grid-cols-[20rem_1fr_16rem]',
        highlighted && !disabled ? 'border-forest' : 'border-forest/15',
        disabled && 'opacity-60',
      )}
    >
      <ResortImage path={room.images[0]?.imagePath} alt={room.images[0]?.altText ?? room.name} sizes="(min-width: 640px) 20rem, 100vw" className="aspect-[16/10] sm:aspect-auto sm:min-h-full" />
      <div className="p-6">
        <h2 className="font-display text-3xl text-forest">{room.name}</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Up to {pluralize(room.maxOccupancy, 'guest')} per room · {room.maxAdults} adults, {room.maxChildren} children
        </p>
        {room.isSample && <SampleNotice className="mt-4" />}
        <Link to={`/stay/${room.slug}`} target="_blank" className="eyebrow link-line mt-4 inline-block text-forest">
          Room details
        </Link>
      </div>
      <div className="flex flex-col justify-between gap-4 border-t border-forest/15 p-6 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0">
        {disabled ? (
          <p className="text-sm font-semibold text-danger">
            {unavailableReason === 'occupancy' ? 'Your party is too large for this room — try adding a room.' : 'Not available for all of your nights.'}
          </p>
        ) : (
          <div>
            <p className="eyebrow text-ink-soft">
              {pluralize(quote!.nights, 'night')} · {pluralize(quote!.rooms, 'room')}
            </p>
            <p className="tabular mt-1 font-display text-4xl text-forest">{formatINR(quote!.total)}</p>
            <p className="text-xs text-ink-soft">
              {formatINR(quote!.nightlyRate)} per room per night{Number(quote!.taxes) > 0 ? ' · incl. taxes' : ''}
            </p>
            {availableRooms <= 2 && <p className="mt-2 text-xs font-semibold text-laterite-deep">Only {pluralize(availableRooms, 'room')} left for these dates</p>}
          </div>
        )}
        <Button type="button" disabled={disabled} onClick={onSelect} className="w-full">
          {disabled ? 'Unavailable' : 'Select'}
        </Button>
      </div>
    </article>
  );
}

/* ----------------------------------------------------------- Details + review */

function DetailsAndReview({
  stay,
  selected,
  step,
  onStep,
  onUnavailable,
}: {
  stay: StayState;
  selected: AvailabilityResult;
  step: 'details' | 'review';
  onStep: (s: Step) => void;
  onUnavailable: () => void;
}) {
  const navigate = useNavigate();
  const contact = useContact();
  const { data: settings } = useSiteSettings();
  const policy = settings?.booking_policy;
  const create = useCreateBooking();
  const [guest, setGuest] = useState<GuestDetailsInput | null>(() => {
    try {
      const saved = sessionStorage.getItem('eden-guest-draft');
      return saved ? (JSON.parse(saved) as GuestDetailsInput) : null;
    } catch {
      return null;
    }
  });

  // One idempotency key per distinct request. Retries reuse it; any change mints a new one.
  const fingerprint = JSON.stringify({ stay, room: selected.room.id, guest });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a new key exactly when the request changes
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [fingerprint]);

  const form = useForm<GuestDetailsInput>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: guest ?? { fullName: '', phone: '', email: '', specialRequests: '' },
  });
  const errors = form.formState.errors;

  const onDetails = form.handleSubmit((values) => {
    setGuest(values);
    try {
      // Kept for this tab only so a reload does not lose what was typed.
      sessionStorage.setItem('eden-guest-draft', JSON.stringify(values));
    } catch {
      /* storage unavailable */
    }
    onStep('review');
  });

  const submit = async () => {
    if (!guest) return onStep('details');
    try {
      const result = await create.mutateAsync({
        idempotencyKey,
        payload: {
          checkIn: stay.checkIn!,
          checkOut: stay.checkOut!,
          adults: stay.adults,
          children: stay.children,
          rooms: stay.rooms,
          roomTypeId: selected.room.id,
          guest,
        },
      });
      try {
        sessionStorage.removeItem('eden-guest-draft');
        sessionStorage.setItem(`eden-booking-${result.booking.reference}`, JSON.stringify(result.booking));
      } catch {
        /* storage unavailable */
      }
      // The token travels in the URL fragment, which is never sent to servers or in Referer headers.
      navigate(`/booking/confirmation/${result.booking.reference}#t=${result.accessToken}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'NOT_AVAILABLE' || err.code === 'ROOM_NOT_FOUND')) {
        toast.error(err.message);
        onUnavailable();
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        toast.error(err.details?.[0]?.message ?? err.message);
        onStep('details');
      }
    }
  };

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <button type="button" onClick={() => onStep(step === 'review' ? 'details' : 'rooms')} className="eyebrow inline-flex min-h-11 items-center gap-2 text-forest">
          <ArrowLeft className="size-4" aria-hidden /> Back
        </button>

        {step === 'details' && (
          <form onSubmit={onDetails} noValidate>
            <h1 className="mt-4 text-display-md text-forest">Your details</h1>
            <p className="mt-3 text-ink-soft">We'll use these to confirm your reservation by phone.</p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <TextField label="Full name" autoComplete="name" required wrapperClassName="sm:col-span-2" error={errors.fullName?.message} {...form.register('fullName')} />
              <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" required hint="Indian numbers can be entered without +91" error={errors.phone?.message} {...form.register('phone')} />
              <TextField label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...form.register('email')} />
              <TextAreaField
                label="Special requests (optional)"
                wrapperClassName="sm:col-span-2"
                placeholder="Arrival time, children's ages, dietary needs, celebrations…"
                error={errors.specialRequests?.message}
                {...form.register('specialRequests')}
              />
            </div>
            <Button type="submit" className="mt-10 w-full sm:w-auto">
              Review request
            </Button>
          </form>
        )}

        {step === 'review' && guest && (
          <div>
            <h1 className="mt-4 text-display-md text-forest">Review & send</h1>
            <dl className="mt-8 border-t border-forest/15 text-sm">
              {[
                ['Name', guest.fullName],
                ['Phone', guest.phone],
                ['Email', guest.email],
                ...(guest.specialRequests ? [['Requests', guest.specialRequests]] : []),
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-forest/15 py-4">
                  <dt className="eyebrow pt-0.5 text-ink-soft">{k}</dt>
                  <dd className="whitespace-pre-line break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="eyebrow link-line mt-4 text-forest" onClick={() => onStep('details')}>
              Edit details
            </button>

            <div className="mt-10 border-l-2 border-laterite bg-ivory px-5 py-4 text-sm leading-relaxed">
              <p className="font-semibold text-ink">This is a reservation request.</p>
              <p className="mt-1 text-ink-soft">
                {policy?.paymentInstructions ?? 'No payment is collected online. The resort will call you to confirm.'}
              </p>
              {policy?.cancellationPolicy && <p className="mt-2 text-ink-soft">Cancellation: {policy.cancellationPolicy}</p>}
            </div>

            {create.isError && !(create.error instanceof ApiError && ['NOT_AVAILABLE', 'ROOM_NOT_FOUND', 'VALIDATION_ERROR'].includes(create.error.code)) && (
              <ErrorState
                className="mt-6"
                title="Your request was not sent"
                message={`${(create.error as Error).message} You can safely try again — you won't be booked twice.`}
              />
            )}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button type="button" onClick={submit} loading={create.isPending} className="w-full sm:w-auto">
                Send reservation request
              </Button>
              <a href={telHref(contact.phone)} className="eyebrow inline-flex min-h-12 items-center justify-center gap-2 text-forest">
                <Phone className="size-4" aria-hidden /> Or call {contact.phone}
              </a>
            </div>
          </div>
        )}
      </div>

      <aside className="lg:col-span-4 lg:col-start-9">
        <BookingSummaryCard stay={stay} result={selected} />
      </aside>
    </div>
  );
}

function BookingSummaryCard({ stay, result }: { stay: StayState; result: AvailabilityResult }) {
  const q = result.quote!;
  return (
    <div className="border border-forest/15 bg-ivory lg:sticky lg:top-28">
      <ResortImage path={result.room.images[0]?.imagePath} alt={result.room.images[0]?.altText} sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[16/9]" />
      <div className="p-6">
        <p className="eyebrow text-laterite-deep">Your stay</p>
        <h2 className="mt-2 font-display text-3xl text-forest">{result.room.name}</h2>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Arrive</dt>
            <dd>{formatDisplayDate(stay.checkIn!)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Depart</dt>
            <dd>{formatDisplayDate(stay.checkOut!)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Guests</dt>
            <dd>
              {pluralize(stay.adults, 'adult')}
              {stay.children > 0 && `, ${pluralize(stay.children, 'child', 'children')}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-forest/15 pb-4">
            <dt className="text-ink-soft">Rooms</dt>
            <dd>{stay.rooms}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">
              {formatINR(q.nightlyRate)} × {pluralize(q.nights, 'night')} × {pluralize(q.rooms, 'room')}
            </dt>
            <dd className="tabular">{formatINR(q.subtotal)}</dd>
          </div>
          {Number(q.taxes) > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Taxes</dt>
              <dd className="tabular">{formatINR(q.taxes)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 border-t border-forest/15 pt-4">
            <dt className="eyebrow">Estimated total</dt>
            <dd className="tabular font-display text-3xl text-forest">{formatINR(q.total)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          The final amount is calculated by the resort's system when you send the request. Nothing is charged online.
        </p>
      </div>
    </div>
  );
}
