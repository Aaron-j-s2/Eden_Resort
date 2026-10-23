import { z } from 'zod';
import type { GalleryImage } from '@eden/shared';
import type { AppContext } from '../../context.js';
import { fromDbError, notFound } from '../../lib/errors.js';

interface GalleryRow {
  id: string;
  image_path: string;
  category: string;
  alt_text: string;
  width: number;
  height: number;
  display_order: number;
  is_published: boolean;
  admin_note: string | null;
}

const toImage = (r: GalleryRow): GalleryImage => ({
  id: r.id,
  imagePath: r.image_path,
  category: r.category,
  altText: r.alt_text,
  width: r.width,
  height: r.height,
  displayOrder: r.display_order,
});

export async function listPublishedGallery(ctx: AppContext): Promise<GalleryImage[]> {
  const { data, error } = await ctx.db
    .from('gallery_images')
    .select('*')
    .eq('is_published', true)
    .order('display_order');
  if (error) throw fromDbError(error);
  return (data as GalleryRow[]).map(toImage);
}

export async function listAllGallery(ctx: AppContext) {
  const { data, error } = await ctx.db.from('gallery_images').select('*').order('display_order');
  if (error) throw fromDbError(error);
  return (data as GalleryRow[]).map((r) => ({ ...toImage(r), isPublished: r.is_published, adminNote: r.admin_note }));
}

export const galleryUpdateSchema = z.object({
  category: z.string().regex(/^[a-z0-9-]+$/).optional(),
  altText: z.string().trim().min(5).max(300).optional(),
  displayOrder: z.coerce.number().int().min(0).max(10_000).optional(),
  isPublished: z.boolean().optional(),
});

export async function updateGalleryImage(
  ctx: AppContext,
  id: string,
  input: z.infer<typeof galleryUpdateSchema>,
  actorId: string,
) {
  const patch: Record<string, unknown> = {};
  if (input.category !== undefined) patch.category = input.category;
  if (input.altText !== undefined) patch.alt_text = input.altText;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.isPublished !== undefined) patch.is_published = input.isPublished;
  const { data, error } = await ctx.db.from('gallery_images').update(patch).eq('id', id).select('*');
  if (error) throw fromDbError(error);
  if (!data?.length) throw notFound('Image');
  await ctx.db.rpc('write_audit', {
    p_actor: actorId,
    p_action: 'gallery.updated',
    p_entity_type: 'gallery_image',
    p_entity_id: id,
    p_details: input,
  });
  const r = data[0] as GalleryRow;
  return { ...toImage(r), isPublished: r.is_published, adminNote: r.admin_note };
}
