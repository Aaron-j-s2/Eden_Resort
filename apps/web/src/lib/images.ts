import manifestJson from '@/content/image-manifest.json';

export interface ManifestImage {
  src: string;
  category: string;
  width: number;
  height: number;
  widths: number[];
  enhanced: { width: number; method: string } | null;
  alt: string;
  focal: string;
  people: boolean;
  source: string;
}

interface Manifest {
  categories: { key: string; label: string }[];
  images: Record<string, ManifestImage>;
}

export const manifest = manifestJson as Manifest;

const byPath = new Map(Object.values(manifest.images).map((img) => [img.src, img]));

/** Look up a photo by its slug (e.g. "pavilion-bridge"). Throws in dev if missing. */
export function photo(slug: string): ManifestImage {
  const img = manifest.images[slug];
  if (!img) throw new Error(`Unknown photo slug: ${slug}`);
  return img;
}

/** Resolve a stored base path (e.g. "/images/resort/stay/cottage-evening") to its manifest entry. */
export function photoByPath(path: string | null | undefined): ManifestImage | undefined {
  return path ? byPath.get(path) : undefined;
}

export function srcSet(img: ManifestImage, format: 'avif' | 'webp', allowEnhanced = false): string {
  const entries = img.widths.map((w) => `${img.src}-${w}.${format} ${w}w`);
  if (allowEnhanced && img.enhanced) entries.push(`${img.src}-enhanced-${img.enhanced.width}.${format} ${img.enhanced.width}w`);
  return entries.join(', ');
}

export function fallbackSrc(img: ManifestImage): string {
  const w = img.widths.includes(768) ? 768 : img.widths[img.widths.length - 1];
  return `${img.src}-${w}.webp`;
}

/** Publishable photographs only (excludes images showing identifiable people). */
export const publicPhotos = Object.entries(manifest.images)
  .filter(([, img]) => !img.people)
  .map(([slug, img]) => ({ slug, ...img }));
