import { BUCKET, getSupabaseAdmin } from "@/lib/supabase-server";
import { ContentView, type ContentItem } from "@/components/admin/content";

const PAGE_SIZE = 24;
const FORMATS = ["image/webp", "image/jpeg", "image/png"];

type Params = { q?: string; format?: string; owner?: string; page?: string };

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const admin = getSupabaseAdmin();
  if (!admin) return <p className="text-danger">SUPABASE_SERVICE_ROLE_KEY is not set.</p>;

  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q ?? "").trim().slice(0, 100);
  const format = FORMATS.includes(params.format ?? "") ? params.format! : "";
  const owner = params.owner === "accounts" || params.owner === "anonymous" ? params.owner : "";

  let query = admin.from("compressions").select("*", { count: "exact" });
  if (q) query = query.ilike("file_name", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  if (format) query = query.eq("format", format);
  if (owner === "accounts") query = query.not("user_id", "is", null);
  if (owner === "anonymous") query = query.is("user_id", null);

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) return <p className="text-danger">Could not load images.</p>;

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))];
  const [{ data: urls }, { data: owners }] = await Promise.all([
    rows?.length
      ? admin.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 60 * 60)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? admin.from("profiles").select("id, email").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);

  const urlByPath = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
  const emailById = new Map((owners ?? []).map((o) => [o.id, o.email]));

  const items: ContentItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    file_name: r.file_name,
    format: r.format,
    original_size: r.original_size,
    compressed_size: r.compressed_size,
    width: r.width,
    height: r.height,
    created_at: r.created_at,
    owner: r.user_id ? (emailById.get(r.user_id) ?? "Deleted account") : null,
    url: urlByPath.get(r.storage_path) ?? null,
  }));

  return (
    <ContentView
      items={items}
      total={count ?? 0}
      page={page}
      hasNext={from + PAGE_SIZE < (count ?? 0)}
      filters={{ q, format, owner }}
    />
  );
}
