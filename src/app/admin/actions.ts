"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth";
import { deleteImages, purgeOlderThan } from "@/lib/images";
import { isUuid } from "@/lib/validation";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// Long enough to act as permanent. Supabase takes a Go style duration.
const SUSPEND_DURATION = "876000h";

async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function setUserRole(userId: string, role: "user" | "admin"): Promise<ActionResult> {
  return run(async () => {
    const { user, admin } = await requireAdminAction();
    if (!isUuid(userId) || (role !== "user" && role !== "admin")) return { ok: false, error: "Invalid request." };
    if (userId === user.id) return { ok: false, error: "You can not change your own role." };

    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<ActionResult> {
  return run(async () => {
    const { user, admin } = await requireAdminAction();
    if (!isUuid(userId)) return { ok: false, error: "Invalid request." };
    if (userId === user.id) return { ok: false, error: "You can not suspend your own account." };

    // The ban stops new sign-ins and token refreshes. The profile status blocks saving straight away.
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: suspended ? SUSPEND_DURATION : "none",
    });
    if (banError) return { ok: false, error: banError.message };

    const { error } = await admin
      .from("profiles")
      .update({ status: suspended ? "suspended" : "active" })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  return run(async () => {
    const { user, admin } = await requireAdminAction();
    if (!isUuid(userId)) return { ok: false, error: "Invalid request." };
    if (userId === user.id) return { ok: false, error: "You can not delete your own account." };

    // Remove their files first. The auth delete cascades to the profile.
    await deleteImages(admin, { userId });
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

export async function inviteUser(email: string): Promise<ActionResult> {
  return run(async () => {
    const { admin } = await requireAdminAction();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { ok: false, error: "Enter a valid email address." };

    const { error } = await admin.auth.admin.inviteUserByEmail(trimmed);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/users");
    return { ok: true, message: `Invite sent to ${trimmed}.` };
  });
}

export async function deleteImage(imageId: string): Promise<ActionResult> {
  return run(async () => {
    const { admin } = await requireAdminAction();
    if (!isUuid(imageId)) return { ok: false, error: "Invalid request." };
    const removed = await deleteImages(admin, { id: imageId });
    if (!removed) return { ok: false, error: "Image not found." };
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

export async function updateSettings(input: {
  saving_enabled: boolean;
  max_upload_mb: number;
  retention_days: number | null;
}): Promise<ActionResult> {
  return run(async () => {
    const { admin } = await requireAdminAction();
    const maxMb = Math.round(input.max_upload_mb);
    const retention = input.retention_days === null ? null : Math.round(input.retention_days);
    if (!Number.isFinite(maxMb) || maxMb < 1 || maxMb > 25) {
      return { ok: false, error: "Upload limit must be between 1 and 25 MB." };
    }
    if (retention !== null && (!Number.isFinite(retention) || retention < 1)) {
      return { ok: false, error: "Retention must be at least 1 day, or empty to keep images forever." };
    }

    const { error } = await admin.from("app_settings").upsert({
      id: true,
      saving_enabled: Boolean(input.saving_enabled),
      max_upload_mb: maxMb,
      retention_days: retention,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/settings");
    return { ok: true, message: "Settings saved." };
  });
}

export async function purgeOldImages(days: number): Promise<ActionResult> {
  return run(async () => {
    const { admin } = await requireAdminAction();
    if (!Number.isInteger(days) || days < 1) return { ok: false, error: "Enter a number of days." };
    const removed = await purgeOlderThan(admin, days);
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Deleted ${removed} image${removed === 1 ? "" : "s"}.` };
  });
}
