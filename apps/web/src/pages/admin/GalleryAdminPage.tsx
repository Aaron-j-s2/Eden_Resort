import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import { ResortImage } from '@/components/ui/ResortImage';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useAdminGallery, useAdminSettings, useUpdateGalleryImage } from '@/services/admin';

export default function GalleryAdminPage() {
  const { data, isLoading, isError } = useAdminGallery();
  const { data: settings } = useAdminSettings();
  const update = useUpdateGalleryImage();
  const categories = settings?.gallery_categories?.items ?? [];

  const save = (id: string, body: Parameters<typeof update.mutateAsync>[0]['body']) =>
    update.mutateAsync({ id, body }).catch(() => toast.error('Could not save'));

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Gallery" description="Choose which photographs appear on the public gallery, and how they are grouped." />
      {isError && <ErrorState message="Gallery could not be loaded." />}
      {isLoading && <Skeleton className="h-96" />}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((img) => (
          <li key={img.id} className="rounded-sm border border-stone bg-paper">
            <ResortImage path={img.imagePath} alt={img.altText} sizes="22rem" className="aspect-[4/3]" />
            <div className="space-y-3 p-3 text-sm">
              {img.adminNote && <p className="rounded-sm bg-laterite/10 p-2 text-xs text-laterite-deep">{img.adminNote}</p>}
              <label className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-forest" checked={img.isPublished} onChange={(e) => save(img.id, { isPublished: e.target.checked })} />
                Published
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-soft">Category</span>
                <select
                  className="mt-1 min-h-9 w-full rounded-sm border border-stone bg-paper px-2"
                  value={img.category}
                  onChange={(e) => save(img.id, { category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-soft">Alt text</span>
                <textarea
                  defaultValue={img.altText}
                  rows={2}
                  className="mt-1 w-full rounded-sm border border-stone bg-paper p-2"
                  onBlur={(e) => e.target.value.trim() !== img.altText && e.target.value.trim().length >= 5 && save(img.id, { altText: e.target.value.trim() })}
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-soft">Order</span>
                <input
                  type="number"
                  defaultValue={img.displayOrder}
                  className="min-h-9 w-24 rounded-sm border border-stone bg-paper px-2"
                  onBlur={(e) => Number(e.target.value) !== img.displayOrder && save(img.id, { displayOrder: Number(e.target.value) })}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
