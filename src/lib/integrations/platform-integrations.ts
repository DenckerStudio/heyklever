import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NextcloudConfig = {
  url: string;
  username: string;
  app_password: string;
  /** Optional base path (e.g. group folder name). If not set, use team slug when listing/uploading. */
  base_path?: string;
};
export type SnipeItConfig = { base_url: string; token: string; company_id?: number };

/**
 * Resolves Nextcloud config: team_settings.settings.nextcloud first, else platform_integrations (nextcloud).
 * Pass the result of team_settings.settings for the team to avoid extra DB call when you already have it.
 */
export async function getNextcloudConfig(
  teamId: string,
  supabase: SupabaseClient,
  teamSettingsJson?: Record<string, unknown> | null
): Promise<NextcloudConfig | null> {
  const nextcloud = teamSettingsJson?.nextcloud as NextcloudConfig | undefined;
  if (nextcloud?.url && nextcloud?.username && nextcloud?.app_password) {
    return {
      url: nextcloud.url.replace(/\/$/, ''),
      username: nextcloud.username,
      app_password: nextcloud.app_password,
      base_path: nextcloud.base_path,
    };
  }
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('platform_integrations').select('config').eq('integration_type', 'nextcloud').maybeSingle();
  const platform = (data?.config as NextcloudConfig | undefined);
  if (platform?.url && platform?.username && platform?.app_password) {
    return {
      url: platform.url.replace(/\/$/, ''),
      username: platform.username,
      app_password: platform.app_password,
      base_path: platform.base_path,
    };
  }
  return null;
}

/**
 * Resolves Snipe-IT config: team_settings.settings.snipe_it first, else platform_integrations (snipe_it).
 */
export async function getSnipeItConfig(
  teamId: string,
  supabase: SupabaseClient,
  teamSettingsJson?: Record<string, unknown> | null
): Promise<SnipeItConfig | null> {
  const snipe = teamSettingsJson?.snipe_it as SnipeItConfig | undefined;
  if (snipe?.base_url && snipe?.token) {
    return {
      base_url: snipe.base_url.replace(/\/$/, ''),
      token: snipe.token,
      company_id: snipe.company_id,
    };
  }
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('platform_integrations').select('config').eq('integration_type', 'snipe_it').maybeSingle();
  const platform = (data?.config as SnipeItConfig | undefined);
  if (platform?.base_url && platform?.token) {
    return {
      base_url: platform.base_url.replace(/\/$/, ''),
      token: platform.token,
      company_id: platform.company_id,
    };
  }
  return null;
}
