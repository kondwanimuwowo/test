import { getSupabaseAdmin } from "@/lib/supabase-server";
import { Overview, PERIODS, type Stats } from "@/components/admin/overview";

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = PERIODS.includes(Number(daysParam)) ? Number(daysParam) : 30;
  const admin = getSupabaseAdmin();
  if (!admin) return <p className="text-danger">SUPABASE_SERVICE_ROLE_KEY is not set.</p>;

  const [{ data: stats, error }, { data: recentUsers }] = await Promise.all([
    admin.rpc("admin_stats", { period_days: days }),
    admin.from("profiles").select("id, email, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  if (error || !stats) {
    return <p className="text-danger">Could not load statistics. Check that both migrations have been run.</p>;
  }

  return <Overview stats={stats as Stats} days={days} recentUsers={recentUsers ?? []} />;
}
