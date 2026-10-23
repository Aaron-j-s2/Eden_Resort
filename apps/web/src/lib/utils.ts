import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { ContactSettings } from '@eden/shared/core';

// Teach tailwind-merge about our custom type scale, otherwise `text-display-md`
// and a colour such as `text-forest` are treated as conflicting and one is dropped.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['display-xl', 'display-lg', 'display-md', 'display-sm'] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fallback contact details (owner-supplied) used until settings load. */
export const DEFAULT_CONTACT: ContactSettings = {
  resortName: 'Eden Falls Resort',
  phone: '+91 95974 45838',
  whatsappNumber: '919597445838',
  email: null,
  addressLines: ['Koodal, near Nandhimangalam, Thirparappu', 'Kulasekharam Post, Kanyakumari District', 'Tamil Nadu, India'],
  postalCode: '629161',
  mapsQuery: 'Eden Falls Resort, Koodal, Nandhimangalam, Kulasekharam, Kanyakumari, Tamil Nadu 629161',
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export function whatsappHref(number: string, message = 'Hello Eden Falls Resort, I would like to enquire about a stay.') {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export const mapsDirectionsHref = (query: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

export const mapsEmbedSrc = (query: string) => `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? 'http://localhost:5173').replace(/\/$/, '');

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Client-side idempotency key, one per booking attempt. */
export const newIdempotencyKey = () => crypto.randomUUID();
