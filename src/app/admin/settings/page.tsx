import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getAppSettings } from "@/lib/settings";
import { SettingsView } from "@/components/admin/settings";

export default async function AdminSettingsPage() {
  const admin = getSupabaseAdmin();
  if (!admin) return <p className="text-danger">SUPABASE_SERVICE_ROLE_KEY is not set.</p>;
  const settings = await getAppSettings(admin);
  return <SettingsView settings={settings} cronConfigured={Boolean(process.env.CRON_SECRET)} />;
}
