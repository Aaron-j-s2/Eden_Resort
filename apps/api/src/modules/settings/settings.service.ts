import {
  PUBLIC_SETTING_KEYS,
  SETTINGS_SCHEMAS,
  type PublicSiteSettings,
  type SettingKey,
  type SiteSettings,
} from '@eden/shared';
import type { AppContext } from '../../context.js';
import { fromDbError } from '../../lib/errors.js';

async function readSettings(ctx: AppContext, keys?: readonly SettingKey[]) {
  let q = ctx.db.from('site_settings').select('setting_key, setting_value');
  if (keys) q = q.in('setting_key', keys as SettingKey[]);
  const { data, error } = await q;
  if (error) throw fromDbError(error);
  const out: Partial<Record<SettingKey, unknown>> = {};
  for (const row of data as { setting_key: SettingKey; setting_value: unknown }[]) {
    // Ignore rows that do not match the current schema rather than leaking malformed data.
    const schema = SETTINGS_SCHEMAS[row.setting_key];
    if (!schema) continue;
    const parsed = schema.safeParse(row.setting_value);
    if (parsed.success) out[row.setting_key] = parsed.data;
    else ctx.logger.error({ key: row.setting_key }, 'Stored site setting does not match schema');
  }
  return out;
}

export async function getPublicSettings(ctx: AppContext): Promise<Partial<PublicSiteSettings>> {
  return (await readSettings(ctx, PUBLIC_SETTING_KEYS)) as Partial<PublicSiteSettings>;
}

export async function getAllSettings(ctx: AppContext): Promise<Partial<SiteSettings>> {
  return (await readSettings(ctx)) as Partial<SiteSettings>;
}

export async function getSetting<K extends SettingKey>(ctx: AppContext, key: K): Promise<SiteSettings[K] | null> {
  const all = await readSettings(ctx, [key]);
  return (all[key] as SiteSettings[K] | undefined) ?? null;
}

export async function updateSetting(ctx: AppContext, key: SettingKey, value: unknown, actorId: string) {
  const { error } = await ctx.db.from('site_settings').upsert({
    setting_key: key,
    setting_value: value,
    is_public: PUBLIC_SETTING_KEYS.includes(key),
    updated_by: actorId,
  });
  if (error) throw fromDbError(error);
  await ctx.db.rpc('write_audit', {
    p_actor: actorId,
    p_action: 'settings.updated',
    p_entity_type: 'site_settings',
    p_entity_id: key,
    p_details: {},
  });
  return getSetting(ctx, key);
}
