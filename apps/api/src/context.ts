import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from 'pino';
import type { Env } from './config/env.js';
import type { Notifier } from './lib/notifier.js';

/** Dependencies shared by every module. Built once in createApp(). */
export interface AppContext {
  env: Env;
  db: SupabaseClient;
  logger: Logger;
  notifier: Notifier;
}
