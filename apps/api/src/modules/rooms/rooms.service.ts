import type { z } from 'zod';
import type { roomImageInputSchema, roomTypeInputSchema } from '@eden/shared';
import type { AppContext } from '../../context.js';
import { AppError, fromDbError, notFound } from '../../lib/errors.js';
import { ROOM_SELECT, toAdminRoom, toPublicRoom, type RoomTypeRow } from '../../lib/mappers.js';

type RoomTypeInput = z.infer<typeof roomTypeInputSchema>;
type RoomImageInput = z.infer<typeof roomImageInputSchema>;

export async function listActiveRooms(ctx: AppContext) {
  const { data, error } = await ctx.db
    .from('room_types')
    .select(ROOM_SELECT)
    .eq('is_active', true)
    .order('display_order')
    .order('name');
  if (error) throw fromDbError(error);
  return (data as RoomTypeRow[]).map(toPublicRoom);
}

export async function getActiveRoomBySlug(ctx: AppContext, slug: string) {
  const { data, error } = await ctx.db
    .from('room_types')
    .select(ROOM_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound('Room');
  return toPublicRoom(data as RoomTypeRow);
}

/* --------------------------------- Admin --------------------------------- */

function toRow(input: RoomTypeInput) {
  return {
    name: input.name,
    slug: input.slug,
    short_description: input.shortDescription,
    description: input.description,
    base_price: input.basePrice,
    max_adults: input.maxAdults,
    max_children: input.maxChildren,
    max_occupancy: input.maxOccupancy,
    inventory_count: input.inventoryCount,
    bed_type: input.bedType,
    amenities: input.amenities,
    booking_rules: input.bookingRules,
    is_active: input.isActive,
    display_order: input.displayOrder,
  };
}

async function audit(ctx: AppContext, actor: string, action: string, id: string, details: Record<string, unknown> = {}) {
  await ctx.db.rpc('write_audit', {
    p_actor: actor,
    p_action: action,
    p_entity_type: 'room_type',
    p_entity_id: id,
    p_details: details,
  });
}

export async function listAllRoomTypes(ctx: AppContext) {
  const { data, error } = await ctx.db.from('room_types').select(ROOM_SELECT).order('display_order').order('name');
  if (error) throw fromDbError(error);
  return (data as RoomTypeRow[]).map(toAdminRoom);
}

export async function getRoomType(ctx: AppContext, id: string) {
  const { data, error } = await ctx.db.from('room_types').select(ROOM_SELECT).eq('id', id).maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound('Room type');
  return toAdminRoom(data as RoomTypeRow);
}

export async function createRoomType(ctx: AppContext, input: RoomTypeInput, actor: string) {
  const { data, error } = await ctx.db.from('room_types').insert(toRow(input)).select('id').single();
  if (error) {
    if (error.code === '23505') throw new AppError(409, 'SLUG_TAKEN', 'Another room already uses this URL slug.');
    throw fromDbError(error);
  }
  await audit(ctx, actor, 'room_type.created', data.id, { name: input.name });
  return getRoomType(ctx, data.id);
}

/**
 * Updating inventory_count fires the `room_types_inventory_guard` trigger, which
 * rejects reductions that would leave future nights over-allocated
 * (INVENTORY_CONFLICT). The UPDATE holds the same row lock that bookings take.
 */
export async function updateRoomType(ctx: AppContext, id: string, input: RoomTypeInput, actor: string) {
  const before = await getRoomType(ctx, id);
  const { error } = await ctx.db.from('room_types').update(toRow(input)).eq('id', id);
  if (error) {
    if (error.code === '23505') throw new AppError(409, 'SLUG_TAKEN', 'Another room already uses this URL slug.');
    throw fromDbError(error);
  }
  await audit(ctx, actor, 'room_type.updated', id, {
    priceFrom: before.basePrice,
    priceTo: input.basePrice,
    inventoryFrom: before.inventoryCount,
    inventoryTo: input.inventoryCount,
    activeTo: input.isActive,
  });
  return getRoomType(ctx, id);
}

export async function deleteRoomType(ctx: AppContext, id: string, actor: string) {
  const { count, error: countError } = await ctx.db
    .from('booking_items')
    .select('id', { count: 'exact', head: true })
    .eq('room_type_id', id);
  if (countError) throw fromDbError(countError);
  if ((count ?? 0) > 0) {
    throw new AppError(
      409,
      'ROOM_HAS_BOOKINGS',
      'This room has booking history and cannot be deleted. Unpublish it instead.',
    );
  }
  const { data, error } = await ctx.db.from('room_types').delete().eq('id', id).select('id');
  if (error) throw fromDbError(error);
  if (!data?.length) throw notFound('Room type');
  await audit(ctx, actor, 'room_type.deleted', id);
}

export async function addRoomImage(ctx: AppContext, roomTypeId: string, input: RoomImageInput, actor: string) {
  await getRoomType(ctx, roomTypeId);
  const { error } = await ctx.db.from('room_images').insert({
    room_type_id: roomTypeId,
    image_path: input.imagePath,
    alt_text: input.altText,
    display_order: input.displayOrder,
  });
  if (error) throw fromDbError(error);
  await audit(ctx, actor, 'room_type.image_added', roomTypeId, { imagePath: input.imagePath });
  return getRoomType(ctx, roomTypeId);
}

export async function removeRoomImage(ctx: AppContext, roomTypeId: string, imageId: string, actor: string) {
  const { data, error } = await ctx.db
    .from('room_images')
    .delete()
    .eq('id', imageId)
    .eq('room_type_id', roomTypeId)
    .select('id');
  if (error) throw fromDbError(error);
  if (!data?.length) throw notFound('Image');
  await audit(ctx, actor, 'room_type.image_removed', roomTypeId, { imageId });
  return getRoomType(ctx, roomTypeId);
}
