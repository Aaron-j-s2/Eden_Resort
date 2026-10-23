import { Router, type Request } from 'express';
import {
  adminBookingListQuerySchema,
  adminEnquiryListQuerySchema,
  bookingStatusUpdateSchema,
  calendarQuerySchema,
  enquiryNoteSchema,
  enquiryUpdateSchema,
  noteSchema,
  roomImageInputSchema,
  roomTypeInputSchema,
  settingsPatchSchema,
  todayInIST,
} from '@eden/shared';
import type { AppContext } from '../context.js';
import { AppError } from '../lib/errors.js';
import { body, query, send, uuidParam } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';
import {
  addBookingNote,
  changeBookingStatus,
  exportBookingsCsv,
  getBookingDetail,
  listBookings,
} from '../modules/bookings/admin-bookings.service.js';
import { getCalendar, getDashboard } from '../modules/dashboard/dashboard.service.js';
import {
  addEnquiryNote,
  getEnquiry,
  listEnquiries,
  updateEnquiryStatus,
} from '../modules/enquiries/enquiries.service.js';
import { galleryUpdateSchema, listAllGallery, updateGalleryImage } from '../modules/gallery/gallery.service.js';
import { getGuest } from '../modules/guests/guests.service.js';
import {
  addRoomImage,
  createRoomType,
  deleteRoomType,
  getRoomType,
  listAllRoomTypes,
  removeRoomImage,
  updateRoomType,
} from '../modules/rooms/rooms.service.js';
import { getAllSettings, updateSetting } from '../modules/settings/settings.service.js';

const actor = (req: Request) => {
  if (!req.staff) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue');
  return req.staff.id;
};

/**
 * Every route below is behind server-side authentication. Staff may manage
 * bookings, guests and enquiries; content and configuration need the admin role.
 */
export function adminRoutes(ctx: AppContext) {
  const r = Router();
  const staff = requireStaff(ctx, 'staff');
  const admin = requireStaff(ctx, 'admin');

  r.use(staff);
  r.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  r.get('/me', (req, res) => send(res, req.staff));

  r.get('/dashboard', async (_req, res) => send(res, await getDashboard(ctx)));

  /* ------------------------------- Bookings ------------------------------- */
  r.get('/bookings', async (req, res) => send(res, await listBookings(ctx, query(req, adminBookingListQuerySchema))));

  r.get('/reports/bookings.csv', async (req, res) => {
    const csv = await exportBookingsCsv(ctx, query(req, adminBookingListQuerySchema), actor(req));
    res
      .type('text/csv; charset=utf-8')
      .attachment(`eden-falls-bookings-${todayInIST()}.csv`)
      .send(csv);
  });

  r.get('/bookings/:id', async (req, res) => send(res, await getBookingDetail(ctx, uuidParam(req))));

  r.patch('/bookings/:id/status', async (req, res) => {
    const { status, note } = body(req, bookingStatusUpdateSchema);
    send(res, await changeBookingStatus(ctx, uuidParam(req), status, actor(req), note));
  });

  r.post('/bookings/:id/notes', async (req, res) => {
    const { note } = body(req, noteSchema);
    send(res, await addBookingNote(ctx, uuidParam(req), note, actor(req)), 201);
  });

  r.get('/guests/:id', async (req, res) => send(res, await getGuest(ctx, uuidParam(req))));

  r.get('/availability', async (req, res) => {
    const { from, to } = query(req, calendarQuerySchema);
    send(res, await getCalendar(ctx, from, to));
  });

  /* ------------------------------- Enquiries ------------------------------ */
  r.get('/enquiries', async (req, res) => send(res, await listEnquiries(ctx, query(req, adminEnquiryListQuerySchema))));
  r.get('/enquiries/:id', async (req, res) => send(res, await getEnquiry(ctx, uuidParam(req))));
  r.patch('/enquiries/:id', async (req, res) => {
    const { status } = body(req, enquiryUpdateSchema);
    if (!status) throw new AppError(422, 'VALIDATION_ERROR', 'Nothing to update');
    send(res, await updateEnquiryStatus(ctx, uuidParam(req), status, actor(req)));
  });
  r.post('/enquiries/:id/notes', async (req, res) => {
    const { note, kind } = body(req, enquiryNoteSchema);
    send(res, await addEnquiryNote(ctx, uuidParam(req), note, kind, actor(req)), 201);
  });

  /* ------------------------- Rooms (admin role only) ---------------------- */
  r.get('/room-types', async (_req, res) => send(res, await listAllRoomTypes(ctx)));
  r.get('/room-types/:id', async (req, res) => send(res, await getRoomType(ctx, uuidParam(req))));
  r.post('/room-types', admin, async (req, res) =>
    send(res, await createRoomType(ctx, body(req, roomTypeInputSchema), actor(req)), 201),
  );
  r.patch('/room-types/:id', admin, async (req, res) =>
    send(res, await updateRoomType(ctx, uuidParam(req), body(req, roomTypeInputSchema), actor(req))),
  );
  r.delete('/room-types/:id', admin, async (req, res) => {
    await deleteRoomType(ctx, uuidParam(req), actor(req));
    res.status(204).end();
  });
  r.post('/room-types/:id/images', admin, async (req, res) =>
    send(res, await addRoomImage(ctx, uuidParam(req), body(req, roomImageInputSchema), actor(req)), 201),
  );
  r.delete('/room-types/:id/images/:imageId', admin, async (req, res) =>
    send(res, await removeRoomImage(ctx, uuidParam(req), uuidParam(req, 'imageId'), actor(req))),
  );

  /* ----------------------- Settings & gallery (admin) --------------------- */
  r.get('/settings', admin, async (_req, res) => send(res, await getAllSettings(ctx)));
  r.patch('/settings', admin, async (req, res) => {
    const { key, value } = body(req, settingsPatchSchema);
    send(res, { key, value: await updateSetting(ctx, key, value, actor(req)) });
  });

  r.get('/gallery', admin, async (_req, res) => send(res, await listAllGallery(ctx)));
  r.patch('/gallery/:id', admin, async (req, res) =>
    send(res, await updateGalleryImage(ctx, uuidParam(req), body(req, galleryUpdateSchema), actor(req))),
  );

  return r;
}
