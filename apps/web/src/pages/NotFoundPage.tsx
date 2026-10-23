import { Link } from 'react-router';
import { Container } from '@/components/layout/Section';
import { ResortImage } from '@/components/ui/ResortImage';
import { Seo } from '@/lib/seo';

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="This page could not be found." noindex />
      <section className="bg-paper pb-24 pt-32 sm:pt-40">
        <Container className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow text-laterite-deep">404</p>
            <h1 className="mt-4 text-display-lg text-forest">
              This path leads <em className="italic">nowhere</em>
            </h1>
            <p className="mt-6 max-w-md text-ink-soft">The page you were looking for has moved or never existed. These will take you somewhere lovely instead:</p>
            <ul className="mt-8 border-t border-forest/15">
              {[
                ['/', 'Home'],
                ['/stay', 'Accommodation'],
                ['/gallery', 'Gallery'],
                ['/contact', 'Contact & directions'],
              ].map(([to, label]) => (
                <li key={to} className="border-b border-forest/15">
                  <Link to={to!} className="flex min-h-14 items-center justify-between font-display text-2xl text-forest hover:text-laterite-deep">
                    {label} <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ResortImage slug="pond-pavilion-path" sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-[4/3] lg:col-span-5 lg:col-start-8" />
        </Container>
      </section>
    </>
  );
}
