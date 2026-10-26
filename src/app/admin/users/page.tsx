import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdminPage } from "@/lib/auth";
import { UsersView, type UserRow } from "@/components/admin/users";

const PAGE_SIZE = 25;

type Params = { q?: string; role?: string; status?: string; page?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { user: me } = await requireAdminPage();
  const admin = getSupabaseAdmin();
  if (!admin) return <p className="text-danger">SUPABASE_SERVICE_ROLE_KEY is not set.</p>;

  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q ?? "").trim().slice(0, 100);
  const role = params.role === "admin" || params.role === "user" ? params.role : "";
  const status = params.status === "active" || params.status === "suspended" ? params.status : "";

  let query = admin.from("profiles").select("*", { count: "exact" });
  // Escape the LIKE wildcards so a search for "a_b" matches literally.
  if (q) query = query.ilike("email", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);

  const from = (page - 1) * PAGE_SIZE;
  const { data: profiles, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) return <p className="text-danger">Could not load users. Check that both migrations have been run.</p>;

  const ids = (profiles ?? []).map((p) => p.id);
  const [{ data: images }, authUsers] = await Promise.all([
    ids.length
      ? admin.from("compressions").select("user_id").in("user_id", ids).limit(10000)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
    Promise.all(ids.map((id) => admin.auth.admin.getUserById(id))),
  ]);

  const imageCounts = new Map<string, number>();
  (images ?? []).forEach((row) => imageCounts.set(row.user_id, (imageCounts.get(row.user_id) ?? 0) + 1));
  const lastSignIn = new Map(authUsers.map((r, i) => [ids[i], r.data.user?.last_sign_in_at ?? null]));

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    role: p.role,
    status: p.status,
    created_at: p.created_at,
    last_sign_in_at: lastSignIn.get(p.id) ?? null,
    images: imageCounts.get(p.id) ?? 0,
    isSelf: p.id === me.id,
  }));

  return (
    <UsersView
      rows={rows}
      total={count ?? 0}
      page={page}
      hasNext={from + PAGE_SIZE < (count ?? 0)}
      filters={{ q, role, status }}
    />
  );
}
