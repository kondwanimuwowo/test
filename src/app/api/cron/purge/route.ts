import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getAppSettings } from "@/lib/settings";
import { purgeOlderThan } from "@/lib/images";

export const dynamic = "force-dynamic";

// Called daily by Vercel Cron (see vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const settings = await getAppSettings(admin);
  if (!settings.retention_days) return NextResponse.json({ deleted: 0, skipped: "No retention period set." });

  const deleted = await purgeOlderThan(admin, settings.retention_days);
  return NextResponse.json({ deleted });
}
