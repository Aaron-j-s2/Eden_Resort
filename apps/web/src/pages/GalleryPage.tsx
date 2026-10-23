import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lightbox } from '@/components/gallery/Lightbox';
import { Container } from '@/components/layout/Section';
import { ResortImage } from '@/components/ui/ResortImage';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Seo } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { useGallery, useSiteSettings } from '@/services/public';

export default function GalleryPage() {
  const { data: images, isLoading, isError, refetch } = useGallery();
  const { data: settings } = useSiteSettings();
  const [filter, setFilter] = useState<string>('all');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const categories = useMemo(() => {
    const present = new Set(images?.map((i) => i.category));
    return (settings?.gallery_categories?.items ?? []).filter((c) => present.has(c.key));
  }, [images, settings]);

  const visible = useMemo(() => (images ?? []).filter((i) => filter === 'all' || i.category === filter), [images, filter]);

  return (
    <>
      <Seo title="Gallery" description="Photographs of Eden Falls Resort: the stream, cottages and rooms, pavilions and gardens, and everyday life at the resort." />
      <section className="bg-paper pb-24 pt-32 sm:pt-40">
        <Container>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow text-laterite-deep">Gallery</p>
              <h1 className="mt-4 text-display-lg text-forest">
                Photographs from <em className="italic">the resort</em>
              </h1>
            </div>
            <p className="text-ink-soft lg:col-span-4 lg:col-start-9">
              Every photograph here was taken at Eden Falls — no stock imagery. Select one to view it larger.
            </p>
          </div>

          {categories.length > 1 && (
            <div role="group" aria-label="Filter photographs" className="no-scrollbar -mx-5 mt-12 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
              {[{ key: 'all', label: 'All' }, ...categories].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={filter === c.key}
                  onClick={() => setFilter(c.key)}
                  className={cn(
                    'eyebrow min-h-11 shrink-0 border px-5 transition-colors',
                    filter === c.key ? 'border-forest bg-forest text-ivory' : 'border-forest/20 text-forest hover:border-forest',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-10">
            {isLoading && (
              <div className="columns-2 gap-4 lg:columns-3">
                {[3, 4, 3, 4, 3, 4].map((h, i) => (
                  <Skeleton key={i} className={cn('mb-4 break-inside-avoid', h === 3 ? 'aspect-[4/3]' : 'aspect-[3/4]')} />
                ))}
              </div>
            )}
            {isError && <ErrorState message="The gallery could not be loaded." action={<button className="eyebrow link-line" onClick={() => refetch()}>Try again</button>} />}
            {images && visible.length === 0 && <EmptyState title="No photographs yet" />}

            {/* Masonry via CSS columns keeps each photograph at its true aspect ratio. */}
            <motion.ul layout className="columns-2 gap-3 sm:gap-5 lg:columns-3">
              <AnimatePresence initial={false}>
                {visible.map((img, i) => (
                  <motion.li
                    key={img.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-3 break-inside-avoid sm:mb-5"
                  >
                    <button
                      type="button"
                      onClick={() => setLightbox(i)}
                      className="group block w-full text-left"
                      aria-label={`View larger: ${img.altText}`}
                    >
                      <ResortImage
                        path={img.imagePath}
                        alt={img.altText}
                        sizes="(min-width: 1024px) 31vw, 48vw"
                        fill={false}
                        imgClassName="transition-transform duration-[1.2s] ease-[var(--ease-calm)] group-hover:scale-[1.03]"
                      />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </div>
        </Container>
      </section>
      <Lightbox images={visible.map((i) => ({ path: i.imagePath, alt: i.altText }))} index={lightbox} onIndexChange={setLightbox} />
    </>
  );
}
