import { NextResponse } from "next/server";
import { BUCKET, getSupabaseAdmin } from "@/lib/supabase-server";
import { isUuid } from "@/lib/validation";
import type { LibraryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Saving is not configured on this server." }, { status: 503 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!isUuid(clientId)) return NextResponse.json({ error: "Invalid client id." }, { status: 400 });

  const { data: rows, error } = await supabase
    .from("compressions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return NextResponse.json({ error: "Could not load your library." }, { status: 500 });
  if (!rows.length) return NextResponse.json({ items: [] });

  const { data: urls } = await supabase.storage.from(BUCKET).createSignedUrls(
    rows.map((row) => row.storage_path),
    60 * 60,
  );
  const urlByPath = new Map((urls ?? []).filter((u) => u.signedUrl && !u.error).map((u) => [u.path, u.signedUrl]));

  // Rows whose upload never finished have no object in storage, so they are left out.
  const items: LibraryItem[] = rows
    .filter((row) => urlByPath.has(row.storage_path))
    .map((row) => ({
      id: row.id,
      created_at: row.created_at,
      file_name: row.file_name,
      format: row.format,
      original_size: row.original_size,
      compressed_size: row.compressed_size,
      original_width: row.original_width,
      original_height: row.original_height,
      width: row.width,
      height: row.height,
      url: urlByPath.get(row.storage_path)!,
    }));

  return NextResponse.json({ items });
}
