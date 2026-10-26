import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: "Dashboard | Shrink" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdminPage();
  return <AdminShell email={profile.email}>{children}</AdminShell>;
}
