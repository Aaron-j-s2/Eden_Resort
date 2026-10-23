import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  /** True until the stored session (if any) has been restored. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

const loadSupabase = () => import('@/lib/supabase').then((m) => m.getSupabase());

/**
 * Staff session via Supabase Auth. Holding a session proves identity only —
 * every admin API call is authorised again on the server (role + allowlist).
 * The Supabase client is imported dynamically, so public pages never download it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Public visitors never touch Supabase, so there is nothing to restore for them.
  const [loading, setLoading] = useState(() => window.location.pathname.startsWith('/admin'));
  const clientRef = useRef<Promise<SupabaseClient> | null>(null);

  const client = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = loadSupabase().then((supabase) => {
        supabase.auth.onAuthStateChange((_event, s) => setSession(s));
        return supabase;
      });
    }
    return clientRef.current;
  }, []);

  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin')) return;
    client()
      .then((supabase) => supabase.auth.getSession())
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
  }, [client]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = await client();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message);
      setSession(data.session);
    },
    [client],
  );

  const signOut = useCallback(async () => {
    await (await client()).auth.signOut();
    setSession(null);
  }, [client]);

  const getToken = useCallback(async () => {
    const { data } = await (await client()).auth.getSession();
    return data.session?.access_token ?? null;
  }, [client]);

  const value = useMemo(() => ({ session, loading, signIn, signOut, getToken }), [session, loading, signIn, signOut, getToken]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
