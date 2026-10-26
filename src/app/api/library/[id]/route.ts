import { NextResponse } from "next/server";
import { BUCKET, getSupabaseAdmin } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Saving is not configured on this server." }, { status: 503 });
  }

  const { id } = await params;
  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!isUuid(id) || !isUuid(clientId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const current = await getCurrentUser();
  const base = supabase.from("compressions").select("storage_path").eq("id", id);
  const { data: row } = await (current
    ? base.eq("user_id", current.user.id)
    : base.eq("client_id", clientId).is("user_id", null)
  ).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  await supabase.from("compressions").delete().eq("id", id);

  return new NextResponse(null, { status: 204 });
}
