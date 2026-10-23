import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fallbackSrc, photoByPath, srcSet } from '@/lib/images';

export interface LightboxImage {
  path: string;
  alt: string;
}

/** Accessible full-screen viewer: focus trap, Esc to close, ← → to navigate, swipe on touch. */
export function Lightbox({
  images,
  index,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
}) {
  const open = index !== null && images.length > 0;
  const current = open ? images[index] : undefined;
  const img = photoByPath(current?.path);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndexChange(((index ?? 0) + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndexChange(((index ?? 0) - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, images.length, onIndexChange]);

  const go = (delta: number) => onIndexChange(((index ?? 0) + delta + images.length) % images.length);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-woodland/95" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col text-ivory outline-none">
          <div className="flex items-center justify-between px-4 py-3 sm:px-8">
            <Dialog.Title className="eyebrow tabular text-sage">
              {(index ?? 0) + 1} / {images.length}
            </Dialog.Title>
            <Dialog.Description className="sr-only">Use the arrow keys to move between photographs.</Dialog.Description>
            <Dialog.Close aria-label="Close" className="inline-flex size-12 items-center justify-center hover:text-sage">
              <X className="size-6" />
            </Dialog.Close>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20">
            <AnimatePresence mode="wait" initial={false}>
              {img && current && (
                <motion.figure
                  key={current.path}
                  className="flex max-h-full flex-col items-center"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_e, info) => {
                    if (info.offset.x < -60) go(1);
                    else if (info.offset.x > 60) go(-1);
                  }}
                >
                  <picture>
                    <source type="image/avif" srcSet={srcSet(img, 'avif')} sizes="90vw" />
                    <source type="image/webp" srcSet={srcSet(img, 'webp')} sizes="90vw" />
                    <img
                      src={fallbackSrc(img)}
                      alt={current.alt}
                      width={img.width}
                      height={img.height}
                      className="max-h-[calc(100svh-9rem)] w-auto max-w-full object-contain"
                      draggable={false}
                    />
                  </picture>
                  <figcaption className="mt-3 max-w-2xl px-4 text-center font-display text-lg italic text-ivory/80">{current.alt}</figcaption>
                </motion.figure>
              )}
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous photograph" className="absolute left-1 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center hover:text-sage sm:left-6">
                  <ChevronLeft className="size-7" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next photograph" className="absolute right-1 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center hover:text-sage sm:right-6">
                  <ChevronRight className="size-7" />
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
