import type { ContactSettings } from '@eden/shared/core';
import { useSiteSettings } from '@/services/public';
import { DEFAULT_CONTACT } from '@/lib/utils';

/** Contact details from site settings, falling back to the owner-supplied defaults. */
export function useContact(): ContactSettings {
  const { data } = useSiteSettings();
  return data?.contact ?? DEFAULT_CONTACT;
}
