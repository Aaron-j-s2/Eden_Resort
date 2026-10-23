import { Link, NavLink, Outlet } from 'react-router';
import { CalendarRange, ExternalLink, Image, Inbox, LayoutDashboard, LogOut, NotebookTabs, Settings, BedDouble } from 'lucide-react';
import { useAuth } from '@/app/auth';
import { LogoMark } from '@/components/layout/Logo';
import { cn } from '@/lib/utils';
import { useMe } from '@/services/admin';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: NotebookTabs },
  { to: '/admin/calendar', label: 'Calendar', icon: CalendarRange },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/rooms', label: 'Rooms', icon: BedDouble, adminOnly: true },
  { to: '/admin/gallery', label: 'Gallery', icon: Image, adminOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export function AdminLayout() {
  const { signOut } = useAuth();
  const { data: me } = useMe(true);
  const items = NAV.filter((n) => !n.adminOnly || me?.role === 'admin');

  return (
    <div className="min-h-svh bg-ivory text-ink lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 z-30 bg-woodland text-ivory lg:h-svh">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-start lg:px-6 lg:py-7">
          <Link to="/admin" className="flex items-center gap-3">
            <LogoMark className="h-8 text-sage" />
            <span className="leading-tight">
              <span className="block font-display text-xl">Eden Falls</span>
              <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-sage">Operations</span>
            </span>
          </Link>
          <button type="button" onClick={() => signOut()} className="inline-flex min-h-10 items-center gap-2 text-sm text-ivory/70 hover:text-ivory lg:hidden">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
        <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto border-t border-ivory/10 px-2 py-2 lg:flex-col lg:border-0 lg:px-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 shrink-0 items-center gap-3 rounded-sm px-3 text-sm transition-colors',
                  isActive ? 'bg-ivory/12 text-ivory' : 'text-ivory/65 hover:bg-ivory/5 hover:text-ivory',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 hidden w-full space-y-1 border-t border-ivory/10 p-4 text-sm lg:block">
          <p className="truncate px-2 text-xs text-ivory/50">
            {me?.displayName ?? me?.email} · {me?.role}
          </p>
          <a href="/" target="_blank" rel="noreferrer" className="flex min-h-9 items-center gap-2 rounded-sm px-2 text-ivory/65 hover:text-ivory">
            <ExternalLink className="size-4" /> View website
          </a>
          <button type="button" onClick={() => signOut()} className="flex min-h-9 w-full items-center gap-2 rounded-sm px-2 text-ivory/65 hover:text-ivory">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
