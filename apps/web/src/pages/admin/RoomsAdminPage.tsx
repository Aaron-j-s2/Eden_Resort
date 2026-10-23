import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { formatINR } from '@eden/shared/core';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import { ResortImage } from '@/components/ui/ResortImage';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useAdminRooms } from '@/services/admin';

export default function RoomsAdminPage() {
  const { data, isLoading, isError } = useAdminRooms();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Rooms"
        description="Room categories, prices, capacity and inventory shown on the website."
        actions={
          <Link to="/admin/rooms/new" className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-forest px-4 text-sm font-semibold text-ivory hover:bg-woodland">
            <Plus className="size-4" /> New room type
          </Link>
        }
      />
      {data?.some((r) => r.isSample) && (
        <p className="rounded-sm border border-laterite/40 bg-laterite/5 p-4 text-sm text-laterite-deep">
          Sample listings are placeholders for development. Replace them with the resort's confirmed room categories, prices and room counts — or unpublish them — before launch.
        </p>
      )}
      {isError && <ErrorState message="Rooms could not be loaded." />}
      {isLoading && <Skeleton className="h-64" />}
      {data && data.length === 0 && <EmptyState title="No room types yet">Create the first one to start taking reservation requests.</EmptyState>}
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {data?.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/rooms/${r.id}`} className="flex gap-4 rounded-sm border border-stone bg-paper p-3 hover:border-forest">
              <ResortImage path={r.images[0]?.imagePath} alt="" sizes="8rem" className="aspect-square w-28 shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="font-display text-xl text-forest">{r.name}</p>
                <p className="mt-1 text-ink-soft">
                  {formatINR(r.basePrice)} / night · sleeps {r.maxOccupancy} · {r.inventoryCount} room{r.inventoryCount === 1 ? '' : 's'}
                </p>
                <p className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className={r.isActive ? 'font-semibold text-moss' : 'text-ink-soft'}>{r.isActive ? 'Published' : 'Unpublished'}</span>
                  {r.isSample && <span className="font-semibold text-laterite-deep">Sample data</span>}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
