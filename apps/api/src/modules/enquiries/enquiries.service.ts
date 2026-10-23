import type { z } from 'zod';
import {
  ENQUIRY_TYPE_LABELS,
  type adminEnquiryListQuerySchema,
  type Enquiry,
  type EnquiryStatus,
  type EnquiryType,
  type Paginated,
  type enquirySchema,
} from '@eden/shared';
import type { AppContext } from '../../context.js';
import { fromDbError, notFound } from '../../lib/errors.js';
import { sanitizeSearch } from '../../lib/http.js';
import { displayNames } from '../auth/staff-names.js';

type EnquiryInput = z.infer<typeof enquirySchema>;
type ListQuery = z.infer<typeof adminEnquiryListQuerySchema>;

interface EnquiryRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  enquiry_type: EnquiryType;
  message: string;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
  enquiry_notes?: { id: string; note: string; kind: 'note' | 'follow_up'; author_id: string | null; created_at: string }[];
}

export async function createEnquiry(ctx: AppContext, input: EnquiryInput): Promise<{ id: string }> {
  const { data, error } = await ctx.db
    .from('enquiries')
    .insert({
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      enquiry_type: input.enquiryType,
      message: input.message,
      consent_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw fromDbError(error, 'We could not send your message. Please try again or call us.');
  ctx.notifier.notifyStaff('enquiry', {
    subject: `New enquiry: ${ENQUIRY_TYPE_LABELS[input.enquiryType]}`,
    text: 'A new enquiry has arrived. Open the admin dashboard to read it and reply.',
  });
  // Only an opaque id is returned to the public client.
  return { id: data.id as string };
}

async function toEnquiry(ctx: AppContext, row: EnquiryRow): Promise<Enquiry> {
  const notes = row.enquiry_notes ?? [];
  const names = await displayNames(ctx, notes.map((n) => n.author_id));
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    enquiryType: row.enquiry_type,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: notes
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((n) => ({
        id: n.id,
        note: n.note,
        kind: n.kind,
        authorName: n.author_id ? (names.get(n.author_id) ?? 'Staff') : null,
        createdAt: n.created_at,
      })),
  };
}

export async function listEnquiries(ctx: AppContext, q: ListQuery): Promise<Paginated<Enquiry>> {
  let query = ctx.db.from('enquiries').select('*', { count: 'exact' });
  const search = sanitizeSearch(q.q);
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search.replace(/\s+/g, '')}%,email.ilike.%${search}%,message.ilike.%${search}%`);
  if (q.status) query = query.eq('status', q.status);
  if (q.type) query = query.eq('enquiry_type', q.type);
  const from = (q.page - 1) * q.pageSize;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + q.pageSize - 1);
  if (error) throw fromDbError(error);
  return {
    // Notes are loaded on the detail view only.
    items: await Promise.all((data as EnquiryRow[]).map((r) => toEnquiry(ctx, { ...r, enquiry_notes: [] }))),
    page: q.page,
    pageSize: q.pageSize,
    total: count ?? 0,
  };
}

export async function getEnquiry(ctx: AppContext, id: string): Promise<Enquiry> {
  const { data, error } = await ctx.db
    .from('enquiries')
    .select('*, enquiry_notes ( id, note, kind, author_id, created_at )')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound('Enquiry');
  return toEnquiry(ctx, data as EnquiryRow);
}

export async function updateEnquiryStatus(ctx: AppContext, id: string, status: EnquiryStatus, actorId: string) {
  const { data, error } = await ctx.db.from('enquiries').update({ status }).eq('id', id).select('id');
  if (error) throw fromDbError(error);
  if (!data?.length) throw notFound('Enquiry');
  await ctx.db.rpc('write_audit', {
    p_actor: actorId,
    p_action: 'enquiry.status_changed',
    p_entity_type: 'enquiry',
    p_entity_id: id,
    p_details: { to: status },
  });
  return getEnquiry(ctx, id);
}

export async function addEnquiryNote(ctx: AppContext, id: string, note: string, kind: 'note' | 'follow_up', actorId: string) {
  const { error } = await ctx.db.from('enquiry_notes').insert({ enquiry_id: id, note, kind, author_id: actorId });
  if (error) {
    if (error.code === '23503') throw notFound('Enquiry');
    throw fromDbError(error);
  }
  // Recording a follow-up moves a new enquiry to "in progress".
  await ctx.db.from('enquiries').update({ status: 'in_progress' }).eq('id', id).eq('status', 'new');
  return getEnquiry(ctx, id);
}
