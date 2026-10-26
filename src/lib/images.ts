import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase-server";

type Match = { id?: string; userId?: string; before?: string };

// Deletes matching rows and their storage objects in batches. Returns how many rows were removed.
export async function deleteImages(admin: SupabaseClient, match: Match): Promise<number> {
  if (!match.id && !match.userId && !match.before) throw new Error("Refusing to delete without a filter.");

  let total = 0;
  for (let round = 0; round < 50; round++) {
    let query = admin.from("compressions").select("id, storage_path");
    if (match.id) query = query.eq("id", match.id);
    if (match.userId) query = query.eq("user_id", match.userId);
    if (match.before) query = query.lt("created_at", match.before);

    const { data: rows, error } = await query.limit(100);
    if (error) throw new Error(error.message);
    if (!rows?.length) break;

    const { error: storageError } = await admin.storage.from(BUCKET).remove(rows.map((row) => row.storage_path));
    if (storageError) throw new Error(storageError.message);
    const { error: deleteError } = await admin
      .from("compressions")
      .delete()
      .in(
        "id",
        rows.map((row) => row.id),
      );
    if (deleteError) throw new Error(deleteError.message);

    total += rows.length;
    if (rows.length < 100) break;
  }
  return total;
}

export function purgeOlderThan(admin: SupabaseClient, days: number): Promise<number> {
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return deleteImages(admin, { before });
}
