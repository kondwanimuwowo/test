import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AppSettings = {
  saving_enabled: boolean;
  max_upload_mb: number;
  retention_days: number | null;
  updated_at?: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = { saving_enabled: true, max_upload_mb: 25, retention_days: null };

export async function getAppSettings(admin: SupabaseClient): Promise<AppSettings> {
  const { data } = await admin.from("app_settings").select("*").eq("id", true).maybeSingle();
  return (data as AppSettings | null) ?? DEFAULT_APP_SETTINGS;
}
