import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { roomTypeInputSchema, type AdminRoomType, type RoomTypeInput } from '@eden/shared';
import { AdminButton, AdminPageHeader, ConfirmDialog, Panel } from '@/components/admin/AdminUi';
import { TextAreaField, TextField } from '@/components/forms/Field';
import { ResortImage } from '@/components/ui/ResortImage';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { ApiError } from '@/lib/api';
import { publicPhotos } from '@/lib/images';
import { useAdminRoom, useRoomMutations } from '@/services/admin';

const toForm = (r?: AdminRoomType): RoomTypeInput => ({
  name: r?.name ?? '',
  slug: r?.slug ?? '',
  shortDescription: r?.shortDescription ?? '',
  description: r?.description ?? '',
  basePrice: r?.basePrice ?? '',
  maxAdults: r?.maxAdults ?? 2,
  maxChildren: r?.maxChildren ?? 0,
  maxOccupancy: r?.maxOccupancy ?? 2,
  inventoryCount: r?.inventoryCount ?? 1,
  bedType: r?.bedType ?? null,
  amenities: r?.amenities ?? [],
  bookingRules: r?.bookingRules ?? '',
  isActive: r?.isActive ?? false,
  displayOrder: r?.displayOrder ?? 0,
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function RoomEditPage() {
  const { id } = useParams();
  const { data: room, isLoading, isError } = useAdminRoom(id);
  if (id && isLoading) return <Skeleton className="h-[70vh]" />;
  if (id && (isError || !room)) return <ErrorState message="Room not found." />;
  // Keyed so the form initialises from the loaded room without syncing state in an effect.
  return <RoomForm key={room?.id ?? 'new'} room={room} />;
}

function RoomForm({ room }: { room?: AdminRoomType }) {
  const id = room?.id;
  const isNew = !room;
  const m = useRoomMutations();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<RoomTypeInput>({ resolver: zodResolver(roomTypeInputSchema) as never, defaultValues: toForm(room) });
  const errors = form.formState.errors;
  const [amenitiesText, setAmenitiesText] = useState(() => (room?.amenities ?? []).join('\n'));

  const onSubmit = form.handleSubmit(async (values) => {
    const body = {
      ...values,
      bedType: values.bedType?.toString().trim() || null,
      amenities: amenitiesText.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (isNew) {
        const created = await m.create.mutateAsync(body);
        toast.success('Room type created');
        navigate(`/admin/rooms/${created.id}`, { replace: true });
      } else {
        await m.update.mutateAsync({ id: id!, body });
        toast.success('Changes saved');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) for (const d of err.details) form.setError(d.path as keyof RoomTypeInput, { message: d.message });
        if (err.code === 'SLUG_TAKEN') form.setError('slug', { message: err.message });
        toast.error(err.code === 'INVENTORY_CONFLICT' ? `${err.message} ${(err.details as { detail?: string } | undefined)?.detail ?? ''}` : err.message);
      } else toast.error('Could not save');
    }
  });

  return (
    <div className="space-y-6">
      <Link to="/admin/rooms" className="inline-flex items-center gap-2 text-sm text-forest hover:underline">
        <ArrowLeft className="size-4" /> Rooms
      </Link>
      <AdminPageHeader
        title={isNew ? 'New room type' : room!.name}
        description={room?.isSample ? 'This is a sample listing. Replace every field with confirmed details before launch.' : undefined}
        actions={
          !isNew && (
            <AdminButton variant="secondary" className="text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </AdminButton>
          )
        }
      />

      <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                tone="admin"
                label="Name"
                required
                error={errors.name?.message}
                {...form.register('name', {
                  onChange: (e) => isNew && !form.formState.dirtyFields.slug && form.setValue('slug', slugify(e.target.value)),
                })}
              />
              <TextField tone="admin" label="URL slug" required hint="Used in /stay/your-slug" error={errors.slug?.message} {...form.register('slug')} />
              <TextField tone="admin" label="Short description" wrapperClassName="sm:col-span-2" error={errors.shortDescription?.message} {...form.register('shortDescription')} />
              <TextAreaField tone="admin" label="Full description" rows={6} wrapperClassName="sm:col-span-2" hint="Separate paragraphs with a blank line" error={errors.description?.message} {...form.register('description')} />
              <TextField tone="admin" label="Bed type" hint="Leave blank until confirmed" error={errors.bedType?.message} {...form.register('bedType')} />
              <TextField tone="admin" label="Display order" type="number" min={0} error={errors.displayOrder?.message} {...form.register('displayOrder')} />
              <TextAreaField
                tone="admin"
                label="Amenities (one per line)"
                rows={5}
                value={amenitiesText}
                onChange={(e) => setAmenitiesText(e.target.value)}
                hint="List only facilities confirmed for this room"
              />
              <TextAreaField tone="admin" label="Booking rules" rows={5} error={errors.bookingRules?.message} {...form.register('bookingRules')} />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Price & capacity">
            <div className="grid grid-cols-2 gap-4">
              <TextField tone="admin" label="Price per night (₹)" inputMode="decimal" required wrapperClassName="col-span-2" error={errors.basePrice?.message} {...form.register('basePrice')} />
              <TextField tone="admin" label="Max adults" type="number" min={1} error={errors.maxAdults?.message} {...form.register('maxAdults')} />
              <TextField tone="admin" label="Max children" type="number" min={0} error={errors.maxChildren?.message} {...form.register('maxChildren')} />
              <TextField tone="admin" label="Max guests" type="number" min={1} error={errors.maxOccupancy?.message} {...form.register('maxOccupancy')} />
              <TextField
                tone="admin"
                label="Rooms of this type"
                type="number"
                min={0}
                hint="Cannot go below rooms already reserved"
                error={errors.inventoryCount?.message}
                {...form.register('inventoryCount')}
              />
            </div>
            <p className="mt-3 text-xs text-ink-soft">Price changes apply to new requests only; existing bookings keep their quoted rate.</p>
          </Panel>
          <Panel title="Visibility">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="size-4 accent-forest" {...form.register('isActive')} />
              Published on the website and bookable
            </label>
          </Panel>
          <AdminButton type="submit" className="w-full" disabled={m.create.isPending || m.update.isPending}>
            {isNew ? 'Create room type' : 'Save changes'}
          </AdminButton>
        </div>
      </form>

      {!isNew && room && <RoomImages room={room} />}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this room type?"
        description="Rooms with booking history cannot be deleted — unpublish them instead. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={m.remove.isPending}
        onConfirm={async () => {
          try {
            await m.remove.mutateAsync(id!);
            toast.success('Room type deleted');
            navigate('/admin/rooms', { replace: true });
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Could not delete');
            setConfirmDelete(false);
          }
        }}
      />
    </div>
  );
}

function RoomImages({ room }: { room: AdminRoomType }) {
  const m = useRoomMutations();
  const [adding, setAdding] = useState(false);
  const used = new Set(room.images.map((i) => i.imagePath));
  return (
    <Panel title="Photographs" actions={<AdminButton variant="secondary" onClick={() => setAdding((v) => !v)}>{adding ? 'Done' : 'Add photograph'}</AdminButton>}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {room.images.map((img, i) => (
          <li key={img.id} className="relative">
            <ResortImage path={img.imagePath} alt={img.altText} sizes="12rem" className="aspect-[4/3]" />
            {i === 0 && <span className="absolute left-1 top-1 bg-forest px-1.5 py-0.5 text-[0.65rem] font-semibold text-ivory">Main</span>}
            <button
              type="button"
              aria-label={`Remove ${img.altText}`}
              onClick={() => m.removeImage.mutateAsync({ id: room.id, imageId: img.id }).catch(() => toast.error('Could not remove'))}
              className="absolute right-1 top-1 inline-flex size-8 items-center justify-center bg-paper/90 text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {room.images.length === 0 && <p className="text-sm text-ink-soft">No photographs yet. The first one becomes the main image.</p>}
      {adding && (
        <div className="mt-6 border-t border-stone pt-4">
          <p className="text-xs text-ink-soft">Choose from the resort's own photographs (run <code>npm run images</code> after adding new originals).</p>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {publicPhotos
              .filter((p) => !used.has(p.src))
              .map((p) => (
                <li key={p.slug}>
                  <button
                    type="button"
                    className="block w-full hover:outline hover:outline-2 hover:outline-forest"
                    onClick={() =>
                      m.addImage
                        .mutateAsync({ id: room.id, body: { imagePath: p.src, altText: p.alt, displayOrder: (room.images.length + 1) * 10 } })
                        .catch(() => toast.error('Could not add'))
                    }
                    aria-label={`Add ${p.alt}`}
                  >
                    <ResortImage slug={p.slug} sizes="8rem" className="aspect-square" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
