import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, MapPin, MessageCircle, Phone } from 'lucide-react';
import { ENQUIRY_TYPE_LABELS, ENQUIRY_TYPES, enquirySchema, type EnquiryInput, type EnquiryType } from '@eden/shared';
import { SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { Container } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { useContact } from '@/hooks/useContact';
import { ApiError } from '@/lib/api';
import { Seo } from '@/lib/seo';
import { mapsDirectionsHref, mapsEmbedSrc, telHref, whatsappHref } from '@/lib/utils';
import { useSendEnquiry, useSiteSettings } from '@/services/public';

export default function ContactPage() {
  const contact = useContact();
  const { data: settings } = useSiteSettings();
  const faqs = settings?.faq?.items ?? [];
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      <Seo
        title="Contact & directions"
        description="Call +91 95974 45838, message us on WhatsApp or send an enquiry. Eden Falls Resort, Koodal, near Nandhimangalam, Thirparappu, Kanyakumari District 629161."
      />
      <section className="bg-paper pb-20 pt-32 sm:pt-40">
        <Container className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow text-laterite-deep">Contact</p>
            <h1 className="mt-4 text-display-lg text-forest">
              Talk to <em className="italic">the resort</em>
            </h1>
            <p className="mt-6 max-w-md text-ink-soft">
              The quickest way to plan a stay is a call or a WhatsApp message. You can also leave an enquiry below and we'll get back to you.
            </p>

            <div className="mt-10 space-y-px bg-forest/10">
              <a href={telHref(contact.phone)} className="flex items-center gap-5 bg-paper py-5 transition-colors hover:text-laterite-deep">
                <Phone className="size-5 text-laterite-deep" aria-hidden />
                <span>
                  <span className="eyebrow block text-ink-soft">Call</span>
                  <span className="tabular font-display text-3xl">{contact.phone}</span>
                </span>
              </a>
              <a
                href={whatsappHref(contact.whatsappNumber, 'Hello Eden Falls Resort, I would like to enquire about a stay. My dates are: ')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-5 bg-paper py-5 transition-colors hover:text-laterite-deep"
              >
                <MessageCircle className="size-5 text-laterite-deep" aria-hidden />
                <span>
                  <span className="eyebrow block text-ink-soft">WhatsApp</span>
                  <span className="font-display text-3xl">Send a message</span>
                </span>
              </a>
              <div className="flex items-start gap-5 bg-paper py-5">
                <MapPin className="mt-1 size-5 shrink-0 text-laterite-deep" aria-hidden />
                <address className="not-italic">
                  <span className="eyebrow block text-ink-soft">Address</span>
                  <span className="mt-1 block leading-relaxed">
                    {contact.resortName}
                    {contact.addressLines.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                    {contact.postalCode}
                  </span>
                  <a
                    href={mapsDirectionsHref(contact.mapsQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyebrow link-line mt-3 inline-block text-forest"
                  >
                    Directions in Google Maps
                  </a>
                </address>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <EnquiryForm />
          </div>
        </Container>
      </section>

      <section className="bg-ivory" aria-label="Map">
        {showMap ? (
          <iframe
            title="Map showing Eden Falls Resort"
            src={mapsEmbedSrc(contact.mapsQuery)}
            className="block h-[26rem] w-full border-0 grayscale-[30%]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-[18rem] flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-md text-sm text-ink-soft">The map is provided by Google and loads only when you ask for it.</p>
            <button type="button" onClick={() => setShowMap(true)} className="eyebrow min-h-12 border border-forest px-6 text-forest hover:bg-forest hover:text-ivory">
              Show map
            </button>
          </div>
        )}
      </section>

      {faqs.length > 0 && (
        <section className="bg-paper py-24" aria-labelledby="faq-title">
          <Container className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow text-laterite-deep">Questions</p>
              <h2 id="faq-title" className="mt-4 text-display-md text-forest">
                Before you visit
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              {faqs.map((f) => (
                <details key={f.question} className="group border-b border-forest/15 py-2 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 font-display text-2xl text-forest">
                    {f.question}
                    <span aria-hidden className="text-laterite-deep transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 leading-relaxed text-ink-soft">{f.answer}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

function EnquiryForm() {
  const [params] = useSearchParams();
  const initialType = (ENQUIRY_TYPES as readonly string[]).includes(params.get('type') ?? '') ? (params.get('type') as EnquiryType) : 'stay';
  const send = useSendEnquiry();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: '', phone: '', email: '', enquiryType: initialType, message: '', website: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await send.mutateAsync(values);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        for (const d of err.details) setError(d.path as keyof EnquiryInput, { message: d.message });
      }
    }
  });

  if (send.isSuccess) {
    return (
      <div className="border border-forest/20 bg-ivory p-8 sm:p-12" role="status">
        <CheckCircle2 className="size-8 text-moss" aria-hidden />
        <h2 className="mt-5 font-display text-4xl text-forest">Thank you — we've received your message.</h2>
        <p className="mt-4 text-ink-soft">The resort will contact you on the phone number you provided. For anything urgent, please call.</p>
        <button type="button" className="eyebrow link-line mt-8 text-forest" onClick={() => send.reset()}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="bg-ivory p-6 sm:p-10" aria-labelledby="enquiry-title">
      <h2 id="enquiry-title" className="font-display text-4xl text-forest">
        Send an enquiry
      </h2>
      <div className="mt-8 grid gap-7 sm:grid-cols-2">
        <TextField label="Your name" autoComplete="name" required error={errors.name?.message} {...register('name')} />
        <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" required error={errors.phone?.message} {...register('phone')} />
        <TextField label="Email (optional)" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <SelectField label="About" required error={errors.enquiryType?.message} {...register('enquiryType')}>
          {ENQUIRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ENQUIRY_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Message"
          required
          wrapperClassName="sm:col-span-2"
          placeholder="Dates, number of guests, anything we should know…"
          error={errors.message?.message}
          {...register('message')}
        />
        {/* Honeypot — hidden from people and assistive tech. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" {...register('website')} />
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm text-ink-soft sm:col-span-2">
          <input type="checkbox" className="mt-1 size-4 accent-forest" aria-invalid={Boolean(errors.consent)} {...register('consent')} />
          <span>
            I agree that Eden Falls Resort may store these details to respond to my enquiry, as described in the{' '}
            <Link to="/privacy" className="link-line text-forest">
              privacy notice
            </Link>
            .
          </span>
        </label>
        {errors.consent && (
          <p className="-mt-4 text-sm text-danger sm:col-span-2" role="alert">
            {errors.consent.message}
          </p>
        )}
      </div>
      {send.isError && !(send.error instanceof ApiError && send.error.details) && (
        <ErrorState className="mt-6" title="Your message was not sent" message={(send.error as Error).message} />
      )}
      <Button type="submit" className="mt-8 w-full sm:w-auto" loading={send.isPending}>
        Send enquiry
      </Button>
    </form>
  );
}
