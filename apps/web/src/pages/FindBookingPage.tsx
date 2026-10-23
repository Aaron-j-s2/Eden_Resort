import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BOOKING_REFERENCE_PATTERN, phoneSchema, type PublicBookingSummary } from '@eden/shared';
import { TextField } from '@/components/forms/Field';
import { Container } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { useContact } from '@/hooks/useContact';
import { Seo } from '@/lib/seo';
import { lookupBooking } from '@/services/public';
import { BookingConfirmation } from './BookingSuccessPage';

const lookupFormSchema = z.object({
  reference: z.string().trim().toUpperCase().regex(BOOKING_REFERENCE_PATTERN, 'References look like EF-7KQ2M9XA'),
  phone: phoneSchema,
});
type LookupForm = z.input<typeof lookupFormSchema>;

export function FindBookingForm({ defaultReference = '', onFound }: { defaultReference?: string; onFound?: (b: PublicBookingSummary) => void }) {
  const [found, setFound] = useState<PublicBookingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contact = useContact();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LookupForm>({ resolver: zodResolver(lookupFormSchema), defaultValues: { reference: defaultReference, phone: '' } });

  if (found && !onFound) return <BookingConfirmation booking={found} contact={contact} />;

  return (
    <form
      noValidate
      className="mt-8 space-y-7"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const parsed = lookupFormSchema.parse(values);
          const booking = await lookupBooking(parsed);
          if (onFound) onFound(booking);
          else setFound(booking);
        } catch (e) {
          setError((e as Error).message);
        }
      })}
    >
      <TextField label="Booking reference" autoCapitalize="characters" required error={errors.reference?.message} {...register('reference')} />
      <TextField label="Phone used to book" type="tel" inputMode="tel" required error={errors.phone?.message} {...register('phone')} />
      {error && <ErrorState title="Not found" message={error} />}
      <Button type="submit" loading={isSubmitting}>
        Find booking
      </Button>
    </form>
  );
}

export default function FindBookingPage() {
  const [booking, setBooking] = useState<PublicBookingSummary | null>(null);
  const contact = useContact();
  if (booking) return <BookingConfirmation booking={booking} contact={contact} />;
  return (
    <>
      <Seo title="Find my booking" description="Check the status of your Eden Falls reservation." noindex />
      <Container className="max-w-xl pb-24 pt-32 sm:pt-40">
        <p className="eyebrow text-laterite-deep">Reservations</p>
        <h1 className="mt-4 text-display-md text-forest">Find my booking</h1>
        <p className="mt-3 text-ink-soft">Enter the reference you received and the phone number you booked with.</p>
        <FindBookingForm onFound={setBooking} />
      </Container>
    </>
  );
}
