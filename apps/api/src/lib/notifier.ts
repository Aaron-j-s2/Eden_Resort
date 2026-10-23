import type { Logger } from 'pino';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';

export interface Notification {
  subject: string;
  text: string;
}

export interface Notifier {
  /** Fire-and-forget staff alert. Never throws; never blocks the guest's request. */
  notifyStaff(kind: 'booking' | 'enquiry', message: Notification): void;
}

/**
 * Optional staff email alerts. Delivery happens only when RESEND_API_KEY and
 * NOTIFY_FROM_EMAIL are configured in the API environment *and* the admin has
 * enabled alerts and set a staff email in Admin → Settings → Notifications.
 * Otherwise the event is logged (without guest contact details) and skipped.
 */
export function createNotifier(env: Env, db: SupabaseClient, logger: Logger): Notifier {
  async function deliver(kind: 'booking' | 'enquiry', message: Notification) {
    const { data } = await db.from('site_settings').select('setting_value').eq('setting_key', 'notifications').maybeSingle();
    const settings = (data?.setting_value ?? {}) as {
      emailOnNewBooking?: boolean;
      emailOnNewEnquiry?: boolean;
      staffEmail?: string | null;
    };
    const enabled = kind === 'booking' ? settings.emailOnNewBooking : settings.emailOnNewEnquiry;
    if (!enabled || !settings.staffEmail) return;
    if (!env.RESEND_API_KEY || !env.NOTIFY_FROM_EMAIL) {
      logger.warn({ kind }, 'Staff email alerts are enabled in settings but no email provider is configured');
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.NOTIFY_FROM_EMAIL,
        to: [settings.staffEmail],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) logger.error({ kind, status: res.status }, 'Staff email alert failed');
  }

  return {
    notifyStaff(kind, message) {
      if (env.NODE_ENV === 'test') return;
      deliver(kind, message).catch((err: unknown) => logger.error({ err, kind }, 'Staff notification error'));
    },
  };
}
