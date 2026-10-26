import { NextResponse } from "next/server";
import { BUCKET, getSupabaseAdmin } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, cleanFileName, isPositiveInt, isUuid } from "@/lib/validation";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };
const MAX_SIDE = 20000;

// Creates the database record and returns a signed upload URL.
// The browser uploads straight to Supabase Storage, which keeps large files
// away from the Vercel function body size limit.
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Saving is not configured on this server." }, { status: 503 });
  }

  const settings = await getAppSettings(supabase);
  if (!settings.saving_enabled) {
    return NextResponse.json({ error: "Saving is turned off right now." }, { status: 403 });
  }

  const current = await getCurrentUser();
  if (current?.profile?.status === "suspended") {
    return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { clientId, format, originalSize, compressedSize, originalWidth, originalHeight, width, height } = body;

  if (!isUuid(clientId)) return NextResponse.json({ error: "Invalid client id." }, { status: 400 });
  if (typeof format !== "string" || !ALLOWED_TYPES.includes(format as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json({ error: "Unsupported format." }, { status: 400 });
  }
  const maxBytes = Math.min(settings.max_upload_mb * 1024 * 1024, MAX_UPLOAD_BYTES);
  if (!isPositiveInt(originalSize) || !isPositiveInt(compressedSize, maxBytes)) {
    return NextResponse.json(
      { error: `Invalid file size. The limit is ${settings.max_upload_mb} MB.` },
      { status: 400 },
    );
  }
  if (![originalWidth, originalHeight, width, height].every((n) => isPositiveInt(n, MAX_SIDE))) {
    return NextResponse.json({ error: "Invalid dimensions." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const path = `${clientId}/${id}.${EXT[format]}`;

  const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signError || !signed) {
    return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("compressions").insert({
    id,
    client_id: clientId,
    user_id: current?.user.id ?? null,
    file_name: cleanFileName(body.fileName),
    format,
    original_size: originalSize,
    compressed_size: compressedSize,
    original_width: originalWidth,
    original_height: originalHeight,
    width,
    height,
    storage_path: path,
  });
  if (insertError) {
    return NextResponse.json({ error: "Could not save the record." }, { status: 500 });
  }

  return NextResponse.json({ id, path: signed.path, token: signed.token, bucket: BUCKET });
}
