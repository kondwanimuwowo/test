"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser, storageEnabled } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  // Only allow redirects to paths on this site.
  const next = params.get("next")?.startsWith("/") && !params.get("next")?.startsWith("//") ? params.get("next")! : "/";

  if (!storageEnabled) {
    return <p className="leading-relaxed text-muted">Accounts are off until Supabase keys are added to the environment.</p>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ kind: "error", text: error.message });
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: error.message });
    } else if (!data.session) {
      setMessage({ kind: "info", text: "Check your email for a link to confirm your account." });
    } else {
      router.push(next);
      router.refresh();
    }
  };

  const input =
    "w-full rounded-card bg-surface px-4 py-3 text-ink outline-none transition-shadow duration-150 focus:bg-white focus:shadow-sm focus:ring-2 focus:ring-accent";

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex gap-2">
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setMessage(null);
            }}
            aria-pressed={mode === value}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              mode === value ? "bg-ink text-white" : "bg-surface text-ink hover:bg-surface-strong"
            }`}
          >
            {value === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-ink">Email</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-ink">Password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
      </label>

      {message && (
        <p className={`text-sm leading-relaxed ${message.kind === "error" ? "text-danger" : "text-muted"}`}>{message.text}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-white transition-colors duration-150 hover:bg-accent-hover disabled:bg-surface-strong disabled:text-muted"
      >
        {busy ? "Please wait" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
