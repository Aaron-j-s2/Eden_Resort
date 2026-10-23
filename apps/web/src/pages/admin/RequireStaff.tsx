import { Navigate, Outlet, useLocation } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/auth';
import { Spinner } from '@/components/ui/States';
import { ApiError } from '@/lib/api';
import { useMe } from '@/services/admin';
import { AdminButton } from '@/components/admin/AdminUi';

/**
 * Client-side guard for a good experience only. The real enforcement is the
 * API, which re-checks the token, staff profile, role and allowlist on every call.
 */
export function RequireStaff({ role = 'staff' }: { role?: 'staff' | 'admin' }) {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();
  const me = useMe(Boolean(session));

  if (loading || (session && me.isLoading)) return <Spinner className="min-h-svh justify-center" label="Checking access" />;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  if (me.isError || !me.data) {
    const forbidden = me.error instanceof ApiError && me.error.status === 403;
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-ivory px-6 text-center">
        <ShieldAlert className="size-8 text-danger" aria-hidden />
        <h1 className="font-display text-3xl text-forest">{forbidden ? 'No staff access' : 'Could not verify access'}</h1>
        <p className="max-w-md text-sm text-ink-soft">
          {forbidden
            ? 'This account is signed in but has not been given staff access. Ask the resort administrator to add you.'
            : 'Please check your connection and try again.'}
        </p>
        <AdminButton variant="secondary" onClick={() => signOut()}>
          Sign out
        </AdminButton>
      </div>
    );
  }

  if (role === 'admin' && me.data.role !== 'admin') {
    return (
      <div className="p-8">
        <h1 className="font-display text-3xl text-forest">Administrators only</h1>
        <p className="mt-2 text-sm text-ink-soft">Your staff account can manage bookings and enquiries, but not this section.</p>
      </div>
    );
  }
  return <Outlet />;
}
