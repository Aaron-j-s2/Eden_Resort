import type { CSSProperties } from 'react';
import { fallbackSrc, photo, photoByPath, srcSet, type ManifestImage } from '@/lib/images';
import { cn } from '@/lib/utils';

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
  if (!img) return <ImageMissing className={className} label={alt} />;

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

/** Honest placeholder used where the resort has not supplied a photograph yet. */
export function ImageMissing({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      role="img"
      aria-label={label ? `${label} — photograph coming soon` : 'Photograph coming soon'}
      className={cn(
        'relative flex items-end overflow-hidden bg-forest p-6 text-ivory',
        "before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgba(245,241,232,0.06)_14px_15px)] before:content-['']",
        className,
      )}
    >
      <span className="eyebrow relative text-sage">Photograph to come</span>
    </div>
  );
}
