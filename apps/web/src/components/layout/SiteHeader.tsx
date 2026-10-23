import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, Phone, X } from 'lucide-react';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { useContact } from '@/hooks/useContact';
import { cn, telHref, whatsappHref } from '@/lib/utils';
import { Logo } from './Logo';

/**
 * `overlay` pages start with a dark photograph: the header is transparent and
 * light until the visitor scrolls, then settles onto ivory paper.
 */
export function SiteHeader({ overlay }: { overlay: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const contact = useContact();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu when the route changes (state adjusted during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const light = overlay && !scrolled && !open;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,color,box-shadow] duration-500',
        light ? 'bg-transparent text-ivory' : 'bg-paper/95 text-forest shadow-[0_1px_0_rgba(23,32,28,0.08)] backdrop-blur-sm',
      )}
    >
      <div className="mx-auto flex h-20 max-w-[90rem] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <Link to="/" aria-label="Eden Falls Resort — home" className="relative z-50 shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn('eyebrow py-2 transition-opacity hover:opacity-100', isActive ? 'opacity-100 link-line' : 'opacity-80')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <a href={telHref(contact.phone)} className="eyebrow flex items-center gap-2 opacity-85 hover:opacity-100">
            <Phone className="size-3.5" aria-hidden />
            <span className="tabular">{contact.phone}</span>
          </a>
          <Link
            to="/book"
            className={cn(
              'eyebrow inline-flex min-h-11 items-center border px-5 transition-colors',
              light ? 'border-ivory/70 hover:bg-ivory hover:text-woodland' : 'border-forest hover:bg-forest hover:text-ivory',
            )}
          >
            Reserve
          </Link>
        </div>

        <button
          type="button"
          className="relative z-50 -mr-2 inline-flex size-12 items-center justify-center lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Portalled to <body>: the header's backdrop-filter would otherwise become the
          containing block for this fixed overlay and squash it into the header bar. */}
      {createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 flex flex-col bg-woodland px-6 pb-10 pt-28 text-ivory lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {[{ to: '/', label: 'Home' }, ...NAV_ITEMS, { to: '/book', label: 'Reserve' }].map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.05, duration: 0.5 }}
                >
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-baseline gap-4 border-b border-ivory/10 py-3 font-display text-[2.1rem] leading-tight',
                        isActive ? 'text-sage' : 'text-ivory',
                      )
                    }
                  >
                    <span className="chapter w-6 text-sm text-sage/70">{String(i + 1).padStart(2, '0')}</span>
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
              <a href={telHref(contact.phone)} className="eyebrow flex min-h-12 items-center justify-center border border-ivory/30">
                Call
              </a>
              <a
                href={whatsappHref(contact.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="eyebrow flex min-h-12 items-center justify-center bg-ivory text-woodland"
              >
                WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}
    </header>
  );
}
