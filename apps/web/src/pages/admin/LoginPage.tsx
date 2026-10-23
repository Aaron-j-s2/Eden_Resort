import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/app/auth';
import { TextField } from '@/components/forms/Field';
import { LogoMark } from '@/components/layout/Logo';
import { AdminButton } from '@/components/admin/AdminUi';
import { ResortImage } from '@/components/ui/ResortImage';

const schema = z.object({ email: z.email('Enter your email'), password: z.string().min(1, 'Enter your password') });
type Values = z.infer<typeof schema>;

/** Sign-in only. There is intentionally no public registration. */
export default function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  if (!loading && session) return <Navigate to={from} replace />;

  return (
    <div className="grid min-h-svh bg-ivory lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <form
          noValidate
          className="w-full max-w-sm"
          onSubmit={handleSubmit(async (v) => {
            setError(null);
            try {
              await signIn(v.email, v.password);
              navigate(from, { replace: true });
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <LogoMark className="h-12 text-forest" />
          <h1 className="mt-6 font-display text-4xl text-forest">Staff sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">Eden Falls Resort — reservations & operations</p>
          <div className="mt-8 space-y-5">
            <TextField tone="admin" label="Email" type="email" autoComplete="username" error={formState.errors.email?.message} {...register('email')} />
            <TextField tone="admin" label="Password" type="password" autoComplete="current-password" error={formState.errors.password?.message} {...register('password')} />
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
          <AdminButton type="submit" className="mt-6 w-full" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </AdminButton>
          <p className="mt-6 text-xs text-ink-soft">Accounts are created by the resort administrator. Forgotten your password? Ask them to reset it.</p>
        </form>
      </div>
      <ResortImage slug="arched-window-seats" sizes="50vw" className="hidden lg:block" />
    </div>
  );
}
