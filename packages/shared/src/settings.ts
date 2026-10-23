import { z } from 'zod';

/**
 * Editable site content. Secrets and API credentials never live here — only
 * public-facing copy, contact details and operational policies.
 *
 * `null` means "not yet confirmed by the resort"; the website then shows a
 * neutral "please confirm with the resort" message instead of inventing a value.
 */

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const url = z.url().max(500).nullable();

export const contactSettingsSchema = z.object({
  resortName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  whatsappNumber: z.string().trim().regex(/^\d{10,15}$/, 'Digits only, with country code, e.g. 919597445838'),
  email: z.email().nullable(),
  addressLines: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
  postalCode: z.string().trim().max(12),
  mapsQuery: z.string().trim().min(3).max(300),
});

export const bookingPolicySchema = z.object({
  checkInTime: nullableText(40),
  checkOutTime: nullableText(40),
  cancellationPolicy: nullableText(3000),
  childPolicy: nullableText(1000),
  idPolicy: nullableText(1000),
  houseRules: z.array(z.string().trim().min(1).max(300)).max(20),
  /** Whether pending (unconfirmed) requests hold room inventory. */
  pendingHoldsInventory: z.boolean(),
  taxRatePercent: z.number().min(0).max(40),
  taxLabel: z.string().trim().max(40),
  paymentInstructions: nullableText(2000),
});

export const homepageSettingsSchema = z.object({
  heroEyebrow: z.string().trim().max(120),
  heroHeadline: z.string().trim().min(5).max(160),
  heroIntro: z.string().trim().max(600),
  storyHeading: z.string().trim().max(200),
  storyBody: z.array(z.string().trim().max(1200)).max(6),
  bookingInvitation: z.string().trim().max(400),
});

export const socialSettingsSchema = z.object({
  instagram: url,
  facebook: url,
  youtube: url,
  googleBusiness: url,
});

export const experienceSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(400),
  body: z.string().trim().max(2000),
  /** Shown publicly only when confirmed by the owner. */
  confirmed: z.boolean(),
  /** Base path of an optimised image (without size/extension), or null when no photo exists yet. */
  image: z.string().nullable(),
  imageAlt: z.string().trim().max(300).nullable(),
});
export const experiencesSettingsSchema = z.object({ items: z.array(experienceSchema).max(20) });

export const nearbyAttractionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600),
  /** Free text, e.g. "about 6 km". `distanceVerified=false` renders it as approximate. */
  distance: nullableText(60),
  distanceVerified: z.boolean(),
});
export const nearbySettingsSchema = z.object({ items: z.array(nearbyAttractionSchema).max(12) });

export const sustainabilitySettingsSchema = z.object({
  /** Only practices the owner has confirmed and can substantiate. Empty hides the section. */
  practices: z.array(z.object({ title: z.string().max(120), body: z.string().max(600) })).max(12),
});

export const galleryCategoriesSchema = z.object({
  items: z
    .array(z.object({ key: z.string().regex(/^[a-z0-9-]+$/), label: z.string().trim().min(2).max(60) }))
    .min(1)
    .max(12),
});

export const faqSettingsSchema = z.object({
  items: z.array(z.object({ question: z.string().max(300), answer: z.string().max(1500) })).max(30),
});

export const notificationSettingsSchema = z.object({
  emailOnNewBooking: z.boolean(),
  emailOnNewEnquiry: z.boolean(),
  /** Staff inbox for alerts; delivery requires provider credentials in the API environment. */
  staffEmail: z.email().nullable(),
  whatsappAlerts: z.boolean(),
});

export const SETTINGS_SCHEMAS = {
  contact: contactSettingsSchema,
  booking_policy: bookingPolicySchema,
  homepage: homepageSettingsSchema,
  social: socialSettingsSchema,
  experiences: experiencesSettingsSchema,
  nearby: nearbySettingsSchema,
  sustainability: sustainabilitySettingsSchema,
  gallery_categories: galleryCategoriesSchema,
  faq: faqSettingsSchema,
  notifications: notificationSettingsSchema,
} as const;

export type SettingKey = keyof typeof SETTINGS_SCHEMAS;
export const SETTING_KEYS = Object.keys(SETTINGS_SCHEMAS) as SettingKey[];
/** Keys returned by the public API. Everything else is admin-only. */
export const PUBLIC_SETTING_KEYS: readonly SettingKey[] = [
  'contact',
  'booking_policy',
  'homepage',
  'social',
  'experiences',
  'nearby',
  'sustainability',
  'gallery_categories',
  'faq',
];

export type SiteSettings = { [K in SettingKey]: z.infer<(typeof SETTINGS_SCHEMAS)[K]> };
export type PublicSiteSettings = Omit<SiteSettings, 'notifications'>;
export type ContactSettings = SiteSettings['contact'];
export type BookingPolicy = SiteSettings['booking_policy'];
export type Experience = z.infer<typeof experienceSchema>;

export const settingsPatchSchema = z
  .object({
    key: z.enum(SETTING_KEYS as [SettingKey, ...SettingKey[]]),
    value: z.unknown(),
  })
  .transform((v, ctx) => {
    const parsed = SETTINGS_SCHEMAS[v.key].safeParse(v.value);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) ctx.addIssue({ ...issue, path: ['value', ...issue.path] } as never);
      return z.NEVER;
    }
    return { key: v.key, value: parsed.data };
  });
