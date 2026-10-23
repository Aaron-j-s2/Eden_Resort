import { Suspense } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router';
import { CalendarDays, Phone } from 'lucide-react';
import { useContact } from '@/hooks/useContact';
import { telHref } from '@/lib/utils';
import { Spinner } from '@/components/ui/States';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export interface RouteHandle {
  /** The page opens with a dark photograph under a transparent header. */
  overlayHeader?: boolean;
}

export function PublicLayout() {
  const matches = useMatches();
  const overlay = matches.some((m) => (m.handle as RouteHandle | undefined)?.overlayHeader);
  const { pathname } = useLocation();
  const contact = useContact();
  const showMobileBar = !pathname.startsWith('/book');

  return (
    <>
      <a
        href="#main"
        className="eyebrow fixed left-4 top-4 z-[60] -translate-y-24 bg-forest px-4 py-3 text-ivory transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader overlay={overlay} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Suspense fallback={<Spinner className="min-h-[60vh] justify-center" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />

      {showMobileBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-[auto_1fr] border-t border-forest/15 bg-paper/95 backdrop-blur-sm lg:hidden">
          <a href={telHref(contact.phone)} aria-label={`Call ${contact.phone}`} className="flex min-h-14 items-center px-5 text-forest">
            <Phone className="size-5" />
          </a>
          <Link to="/book" className="eyebrow flex min-h-14 items-center justify-center gap-2 bg-forest text-ivory">
            <CalendarDays className="size-4" aria-hidden />
            Check availability
          </Link>
        </div>
      )}
      {showMobileBar && <div className="h-14 lg:hidden" aria-hidden />}
      <ScrollRestoration />
    </>
  );
}
