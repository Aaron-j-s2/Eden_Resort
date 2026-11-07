import type { CSSProperties } from 'react';
import { fallbackSrc, photo, photoByPath, srcSet, type ManifestImage } from '@/lib/images';
import { cn } from '@/lib/utils';

/** Resort photo shown wherever a specific photograph is missing, so no area is left blank. */
const FALLBACK_SLUG = 'pond-pavilion-path';

interface ResortImageProps {
  /** Photo slug from the manifest, or a stored base path such as /images/resort/stay/cottage-evening */
  slug?: string;
  path?: string;
  alt?: string;
  /** CSS sizes attribute — describe the rendered width so the browser picks the right file. */
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** Above-the-fold images load eagerly with high priority. */
  priority?: boolean;
  /** Allow the clearly labelled upscaled hero variant on very wide screens. */
  allowEnhanced?: boolean;
  /** Fill the parent (object-fit: cover) rather than keeping intrinsic ratio. */
  fill?: boolean;
  style?: CSSProperties;
}

/**
 * Responsive <picture> for the resort's own photographs (AVIF → WebP), with
 * focal-point aware cropping and lazy loading below the fold.
 */
export function ResortImage({
  slug,
  path,
  alt,
  sizes,
  className,
  imgClassName,
  priority,
  allowEnhanced,
  fill = true,
  style,
}: ResortImageProps) {
  const img: ManifestImage | undefined = slug ? photo(slug) : photoByPath(path);
  if (!img) return slug === FALLBACK_SLUG ? null : <ImageMissing className={className} label={alt} />;

  return (
    <picture className={cn('block overflow-hidden bg-stone/60', fill && 'relative', className)} style={style}>
      <source type="image/avif" srcSet={srcSet(img, 'avif', allowEnhanced)} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(img, 'webp', allowEnhanced)} sizes={sizes} />
      <img
        src={fallbackSrc(img)}
        alt={alt ?? img.alt}
        width={img.width}
        height={img.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        style={{ objectPosition: img.focal }}
        className={cn(fill ? 'absolute inset-0 h-full w-full object-cover' : 'h-auto w-full', imgClassName)}
      />
    </picture>
  );
}

/**
 * Used where no photograph has been chosen (or a stored path no longer exists):
 * shows a general view of the resort grounds instead of an empty block.
 */
export function ImageMissing({ className, label }: { className?: string; label?: string }) {
  const img = photo(FALLBACK_SLUG);
  if (!img) return <div className={cn('bg-forest', className)} aria-hidden />;
  return <ResortImage slug={FALLBACK_SLUG} alt={label ? `${label} — ${img.alt}` : img.alt} sizes="(min-width: 1024px) 50vw, 100vw" className={className} />;
}
