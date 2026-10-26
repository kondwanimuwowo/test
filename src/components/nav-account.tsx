"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, storageEnabled } from "@/lib/supabase-browser";

type Account = { email: string; isAdmin: boolean } | null;

export function NavAccount() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setAccount(null);
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setAccount({ email: user.email ?? "", isAdmin: data?.role === "admin" });
    };

    load();
    const { data } = supabase.auth.onAuthStateChange(() => load());
    return () => data.subscription.unsubscribe();
  }, []);

  if (!storageEnabled || account === undefined) return null;

  const link = "text-muted transition-colors duration-150 hover:text-ink";

  if (!account) {
    return (
      <Link href="/login" className={link}>
        Sign in
      </Link>
    );
  }

  return (
    <>
      {account.isAdmin && (
        <Link href="/admin" className={link}>
          Dashboard
        </Link>
      )}
      <button
        type="button"
        className={link}
        onClick={async () => {
          await getSupabaseBrowser()?.auth.signOut();
          router.push("/");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </>
  );
}
