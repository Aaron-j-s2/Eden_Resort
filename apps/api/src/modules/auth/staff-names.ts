import type { AppContext } from '../../context.js';

/** Resolve staff user ids to display names for history/notes. */
export async function displayNames(ctx: AppContext, ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (unique.length === 0) return new Map();
  const { data } = await ctx.db.from('profiles').select('id, display_name').in('id', unique);
  return new Map((data ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name ?? 'Staff']));
}
