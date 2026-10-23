import { Link } from 'react-router';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { useContact } from '@/hooks/useContact';
import { useSiteSettings } from '@/services/public';
import { mapsDirectionsHref, telHref, whatsappHref } from '@/lib/utils';
import { LogoMark } from './Logo';

export function SiteFooter() {
  const contact = useContact();
  const { data: settings } = useSiteSettings();
  const social = settings?.social;
  const socialLinks = [
    { label: 'Instagram', href: social?.instagram },
    { label: 'Facebook', href: social?.facebook },
    { label: 'YouTube', href: social?.youtube },
    { label: 'Google', href: social?.googleBusiness },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="relative overflow-hidden bg-woodland text-ivory">
      <div className="mx-auto max-w-[90rem] px-5 pb-10 pt-20 sm:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <LogoMark className="h-14 text-sage" />
            <p className="mt-8 max-w-sm font-display text-3xl leading-tight text-ivory/90">
              A private sanctuary where water meets the forest.
            </p>
            <Link
              to="/book"
              className="eyebrow mt-8 inline-flex min-h-12 items-center border border-ivory/40 px-6 transition-colors hover:bg-ivory hover:text-woodland"
            >
              Check availability
            </Link>
          </div>

          <nav aria-label="Footer" className="lg:col-span-2">
            <p className="eyebrow text-sage">Explore</p>
            <ul className="mt-5 space-y-3 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-ivory/80 hover:text-ivory">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/booking/find" className="text-ivory/80 hover:text-ivory">
                  Find my booking
                </Link>
              </li>
            </ul>
          </nav>

          <address className="not-italic lg:col-span-3">
            <p className="eyebrow text-sage">Visit</p>
            <p className="mt-5 text-sm leading-relaxed text-ivory/80">
              {contact.resortName}
              <br />
              {contact.addressLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
              {contact.postalCode}
            </p>
            <a
              href={mapsDirectionsHref(contact.mapsQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow link-line mt-4 inline-block text-ivory"
            >
              Get directions
            </a>
          </address>

          <div className="lg:col-span-2">
            <p className="eyebrow text-sage">Talk to us</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href={telHref(contact.phone)} className="tabular text-ivory/80 hover:text-ivory">
                  {contact.phone}
                </a>
              </li>
              <li>
                <a href={whatsappHref(contact.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="text-ivory/80 hover:text-ivory">
                  WhatsApp
                </a>
              </li>
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="break-all text-ivory/80 hover:text-ivory">
                    {contact.email}
                  </a>
                </li>
              )}
              {socialLinks.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-ivory/80 hover:text-ivory">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p
          aria-hidden
          className="pointer-events-none mt-20 select-none whitespace-nowrap font-display text-[19vw] leading-[0.8] tracking-tight text-transparent [-webkit-text-stroke:1px_rgba(167,180,154,0.35)] lg:text-[13.5rem]"
        >
          Eden Falls
        </p>

        <div className="mt-8 flex flex-col gap-4 border-t border-ivory/10 pt-6 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {contact.resortName}. Koodal, Kanyakumari District.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-ivory">
              Privacy notice
            </Link>
            {/* Full page load so the staff session is restored on entry. */}
            <a href="/admin" className="hover:text-ivory" rel="nofollow">
              Staff
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
