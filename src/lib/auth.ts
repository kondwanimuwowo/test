import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin, getSupabaseSession } from "./supabase-server";

export type Profile = {
  id: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  created_at: string;
};

export async function getCurrentUser(): Promise<{ user: User; profile: Profile | null } | null> {
  const supabase = await getSupabaseSession();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { user, profile: profile as Profile | null };
}

// For pages: sends anyone who is not an active admin away.
export async function requireAdminPage(): Promise<{ user: User; profile: Profile }> {
  const current = await getCurrentUser();
  if (!current) redirect("/login?next=/admin");
  if (current.profile?.role !== "admin" || current.profile.status !== "active") redirect("/");
  return { user: current.user, profile: current.profile };
}

// For server actions: throws instead of redirecting, and returns the service role client.
export async function requireAdminAction() {
  const current = await getCurrentUser();
  if (!current || current.profile?.role !== "admin" || current.profile.status !== "active") {
    throw new Error("Only admins can do this.");
  }
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase is not configured.");
  return { user: current.user, admin };
}
