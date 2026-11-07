import type { Logger } from 'pino';
import type { SupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { parseEmailList } from '@eden/shared';
import type { Env } from '../config/env.js';

export interface Notification {
  subject: string;
  text: string;
  /** Guest email, so staff can reply straight from their inbox. */
  replyTo?: string;
}

export interface Notifier {
  /** Fire-and-forget staff alert. Never throws; never blocks the guest's request. */
  notifyStaff(kind: 'booking' | 'enquiry', message: Notification): void;
}

type Send = (to: string[], message: Notification) => Promise<void>;

/**
 * Picks the email transport from the API environment: SMTP (e.g. Gmail with an
 * app password — free, ~500 messages/day) when SMTP_* is set, otherwise Resend.
 * Returns null when neither is configured.
 */
function createTransport(env: Env): Send | null {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    const from = env.NOTIFY_FROM_EMAIL || `Eden Falls Resort <${env.SMTP_USER}>`;
    return async (to, message) => {
      await transporter.sendMail({ from, to, subject: message.subject, text: message.text, replyTo: message.replyTo });
    };
  }

  if (env.RESEND_API_KEY && env.NOTIFY_FROM_EMAIL) {
    const { RESEND_API_KEY: apiKey, NOTIFY_FROM_EMAIL: from } = env;
    return async (to, message) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          subject: message.subject,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    };
  }

  return null;
}

/**
 * Optional staff email alerts. Delivery happens only when an email transport is
 * configured in the API environment (SMTP_* or RESEND_API_KEY) *and* the admin
 * has enabled alerts and set one or more staff emails in Admin → Settings →
 * Notifications. Otherwise the event is logged (without guest contact details)
 * and skipped.
 */
export function createNotifier(
  env: Env,
  db: SupabaseClient,
  logger: Logger,
  /** Keeps fire-and-forget work alive after the response (Cloudflare Workers' waitUntil). */
  background: (task: Promise<unknown>) => void = () => {},
): Notifier {
  const send = createTransport(env);

  async function deliver(kind: 'booking' | 'enquiry', message: Notification) {
    const { data } = await db.from('site_settings').select('setting_value').eq('setting_key', 'notifications').maybeSingle();
    const settings = (data?.setting_value ?? {}) as {
      emailOnNewBooking?: boolean;
      emailOnNewEnquiry?: boolean;
      staffEmail?: string | null;
    };
    const enabled = kind === 'booking' ? settings.emailOnNewBooking : settings.emailOnNewEnquiry;
    const recipients = parseEmailList(settings.staffEmail);
    if (!enabled || recipients.length === 0) return;
    if (!send) {
      logger.warn({ kind }, 'Staff email alerts are enabled in settings but no email provider is configured');
      return;
    }
    await send(recipients, message);
    logger.info({ kind, recipients: recipients.length }, 'Staff email alert sent');
  }

  return {
    notifyStaff(kind, message) {
      if (env.NODE_ENV === 'test') return;
      background(deliver(kind, message).catch((err: unknown) => logger.error({ err, kind }, 'Staff email alert failed')));
    },
  };
}
