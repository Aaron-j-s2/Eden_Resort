import { Container } from '@/components/layout/Section';
import { useContact } from '@/hooks/useContact';
import { Seo } from '@/lib/seo';

/**
 * Plain-language privacy notice describing what this website actually does.
 * The resort should have it reviewed before launch (see docs/admin-guide.md).
 */
export default function PrivacyPage() {
  const contact = useContact();
  return (
    <>
      <Seo title="Privacy notice" description="How Eden Falls Resort uses the details you share through this website." />
      <section className="bg-paper pb-24 pt-32 sm:pt-40">
        <Container className="max-w-3xl">
          <p className="eyebrow text-laterite-deep">Privacy notice</p>
          <h1 className="mt-4 text-display-md text-forest">How we use your details</h1>
          <div className="mt-10 space-y-8 leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-forest">
            <section>
              <h2>What we collect</h2>
              <p className="mt-2">
                When you send a reservation request or an enquiry, we collect the details you enter: your name, phone number, email
                address (if given), stay dates, number of guests and any message or special request.
              </p>
            </section>
            <section>
              <h2>Why we use it</h2>
              <p className="mt-2">
                Only to respond to you, confirm and manage your reservation, and contact you about your stay. We do not sell your details
                or use them for advertising.
              </p>
            </section>
            <section>
              <h2>Who can see it</h2>
              <p className="mt-2">
                Your details are stored in a secured database and are visible only to authorised resort staff. Our website and database
                providers process the data on our behalf.
              </p>
            </section>
            <section>
              <h2>Payments</h2>
              <p className="mt-2">This website does not take payments and never asks for card details.</p>
            </section>
            <section>
              <h2>Cookies</h2>
              <p className="mt-2">
                The public website does not use advertising or analytics cookies. Staff sign-in stores a session in the browser. The
                optional Google map on the contact page loads only if you choose to show it.
              </p>
            </section>
            <section>
              <h2>Your choices</h2>
              <p className="mt-2">
                To see, correct or delete the details we hold about you, call us on{' '}
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="link-line text-forest">
                  {contact.phone}
                </a>
                {contact.email ? (
                  <>
                    {' '}
                    or email{' '}
                    <a href={`mailto:${contact.email}`} className="link-line text-forest">
                      {contact.email}
                    </a>
                  </>
                ) : null}
                .
              </p>
            </section>
          </div>
        </Container>
      </section>
    </>
  );
}
