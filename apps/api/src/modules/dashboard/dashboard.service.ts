import type { CalendarResponse, DashboardMetrics } from '@eden/shared';
import type { AppContext } from '../../context.js';
import { fromDbError } from '../../lib/errors.js';
import { money, toAdminBookingRow, type BookingOverviewRow } from '../../lib/mappers.js';
import { getSetting } from '../settings/settings.service.js';

interface MetricsRow {
  today: string;
  total_bookings: number;
  pending_requests: number;
  confirmed_upcoming: number;
  check_ins_today: number;
  check_outs_today: number;
  in_house_tonight: number;
  rooms_occupied_tonight: number;
  total_inventory: number;
  open_enquiries: number;
  verified_payments: number;
  revenue_collected: number | string;
}

/** Every number here is computed from database records — nothing is estimated. */
export async function getDashboard(ctx: AppContext): Promise<DashboardMetrics> {
  const metrics = await ctx.db.rpc('admin_dashboard_metrics');
  if (metrics.error) throw fromDbError(metrics.error);
  const m = metrics.data as MetricsRow;

  const [arrivals, requests] = await Promise.all([
    ctx.db
      .from('booking_overview')
      .select('*')
      .gte('check_in', m.today)
      .in('booking_status', ['confirmed', 'pending'])
      .order('check_in')
      .limit(8),
    ctx.db.from('booking_overview').select('*').eq('booking_status', 'pending').order('created_at', { ascending: false }).limit(8),
  ]);
  if (arrivals.error) throw fromDbError(arrivals.error);
  if (requests.error) throw fromDbError(requests.error);

  return {
    today: m.today,
    totalBookings: m.total_bookings,
    pendingRequests: m.pending_requests,
    confirmedUpcoming: m.confirmed_upcoming,
    checkInsToday: m.check_ins_today,
    checkOutsToday: m.check_outs_today,
    inHouseTonight: m.in_house_tonight,
    roomsOccupiedTonight: m.rooms_occupied_tonight,
    totalInventory: m.total_inventory,
    openEnquiries: m.open_enquiries,
    // Revenue is only reported when verified payment records exist.
    revenueCollected: m.verified_payments > 0 ? money(m.revenue_collected) : null,
    upcomingArrivals: (arrivals.data as BookingOverviewRow[]).map(toAdminBookingRow),
    recentRequests: (requests.data as BookingOverviewRow[]).map(toAdminBookingRow),
  };
}

export async function getCalendar(ctx: AppContext, from: string, to: string): Promise<CalendarResponse> {
  const [days, rooms, bookings, policy] = await Promise.all([
    ctx.db.rpc('admin_calendar', { p_from: from, p_to: to }),
    ctx.db.from('room_types').select('id, name, inventory_count, is_active').order('display_order').order('name'),
    ctx.db
      .from('booking_overview')
      .select('*')
      .lt('check_in', to)
      .gte('check_out', from)
      .in('booking_status', ['pending', 'confirmed', 'checked_in', 'checked_out'])
      .order('check_in')
      .limit(500),
    getSetting(ctx, 'booking_policy'),
  ]);
  if (days.error) throw fromDbError(days.error);
  if (rooms.error) throw fromDbError(rooms.error);
  if (bookings.error) throw fromDbError(bookings.error);

  return {
    from,
    to,
    pendingHoldsInventory: policy?.pendingHoldsInventory ?? true,
    roomTypes: (rooms.data as { id: string; name: string; inventory_count: number; is_active: boolean }[]).map((r) => ({
      id: r.id,
      name: r.name,
      inventoryCount: r.inventory_count,
      isActive: r.is_active,
    })),
    days: (
      days.data as {
        night: string;
        room_type_id: string;
        inventory: number;
        confirmed_rooms: number;
        pending_rooms: number;
        check_ins: number;
        check_outs: number;
      }[]
    ).map((d) => ({
      date: d.night,
      roomTypeId: d.room_type_id,
      inventory: d.inventory,
      confirmedRooms: d.confirmed_rooms,
      pendingRooms: d.pending_rooms,
      checkIns: d.check_ins,
      checkOuts: d.check_outs,
    })),
    bookings: (bookings.data as BookingOverviewRow[]).map(toAdminBookingRow),
  };
}
