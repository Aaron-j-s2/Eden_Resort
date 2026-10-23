import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AdminUser } from '@eden/shared';
import type { AppContext } from '../context.js';
import { forbidden, unauthorized } from '../lib/errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    staff?: AdminUser;
  }
}

/**
 * Verifies the Supabase access token server-side (never trusting the browser),
 * then requires a staff profile. `role: 'admin'` routes additionally require
 * the admin role. ADMIN_EMAIL_ALLOWLIST, when set, is enforced as well.
 */
export function requireStaff(ctx: AppContext, role: 'staff' | 'admin' = 'staff'): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw unauthorized();

    const { data, error } = await ctx.db.auth.getUser(token);
    if (error || !data.user) throw unauthorized();
    const user = data.user;

    const email = user.email?.toLowerCase() ?? null;
    if (ctx.env.ADMIN_EMAIL_ALLOWLIST.length > 0 && (!email || !ctx.env.ADMIN_EMAIL_ALLOWLIST.includes(email))) {
      ctx.logger.warn({ userId: user.id }, 'Admin API access denied: email not in allowlist');
      throw forbidden();
    }

    const { data: profile } = await ctx.db
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .maybeSingle<{ role: 'admin' | 'staff'; display_name: string | null }>();
    if (!profile) {
      ctx.logger.warn({ userId: user.id }, 'Admin API access denied: no staff profile');
      throw forbidden();
    }
    if (role === 'admin' && profile.role !== 'admin') throw forbidden();

    req.staff = { id: user.id, email, displayName: profile.display_name, role: profile.role };
    next();
  };
}
