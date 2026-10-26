"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purgeOldImages, updateSettings, type ActionResult } from "@/app/admin/actions";
import { Panel, buttonClass, inputClass } from "./ui";

type Settings = { saving_enabled: boolean; max_upload_mb: number; retention_days: number | null; updated_at?: string };

export function SettingsView({ settings, cronConfigured }: { settings: Settings; cronConfigured: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(settings.saving_enabled);
  const [maxMb, setMaxMb] = useState(String(settings.max_upload_mb));
  const [retention, setRetention] = useState(settings.retention_days ? String(settings.retention_days) : "");
  const [purgeDays, setPurgeDays] = useState(settings.retention_days ? String(settings.retention_days) : "90");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [purgeResult, setPurgeResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [purging, startPurge] = useTransition();

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const res = await updateSettings({
        saving_enabled: saving,
        max_upload_mb: Number(maxMb),
        retention_days: retention.trim() ? Number(retention) : null,
      });
      setResult(res);
      router.refresh();
    });
  };

  const purge = () => {
    const days = Number(purgeDays);
    if (!window.confirm(`Delete every saved image older than ${days} days? This can not be undone.`)) return;
    startPurge(async () => {
      setPurgeResult(await purgeOldImages(days));
      router.refresh();
    });
  };

  return (
    <div className="space-y-12">
      <Panel title="Saving">
        <form onSubmit={save} className="space-y-8">
          <div className="flex items-start justify-between gap-8">
            <div className="space-y-1">
              <p className="font-semibold text-ink">Allow saving to the library</p>
              <p className="text-sm leading-relaxed text-muted">
                When off, people can still compress and download. Existing saved images stay available.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={saving}
              aria-label="Allow saving to the library"
              onClick={() => setSaving((v) => !v)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ${
                saving ? "bg-accent" : "bg-surface-strong"
              }`}
            >
              <span
                className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  saving ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="font-semibold text-ink">Largest saved file in MB</span>
              <input
                type="number"
                min={1}
                max={25}
                required
                value={maxMb}
                onChange={(e) => setMaxMb(e.target.value)}
                className={`${inputClass} w-full`}
              />
              <span className="block text-sm text-muted">Between 1 and 25. Applies to the compressed file.</span>
            </label>
            <label className="block space-y-2">
              <span className="font-semibold text-ink">Keep images for this many days</span>
              <input
                type="number"
                min={1}
                value={retention}
                placeholder="Forever"
                onChange={(e) => setRetention(e.target.value)}
                className={`${inputClass} w-full`}
              />
              <span className="block text-sm text-muted">
                {cronConfigured
                  ? "Older images are deleted once a day. Leave empty to keep them."
                  : "Set CRON_SECRET in Vercel to delete older images once a day. Leave empty to keep them."}
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={pending} className={buttonClass.primary}>
              {pending ? "Saving" : "Save settings"}
            </button>
            {result && (
              <p className={`text-sm ${result.ok ? "text-success" : "text-danger"}`}>{result.ok ? result.message : result.error}</p>
            )}
            {settings.updated_at && !result && (
              <p className="text-sm text-muted">Last changed {new Date(settings.updated_at).toLocaleString()}</p>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Clean up storage">
        <p className="leading-relaxed text-muted">Delete saved images older than a number of days, right now.</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <label className="flex items-center gap-4">
            <span className="text-sm font-semibold text-ink">Older than</span>
            <input
              type="number"
              min={1}
              value={purgeDays}
              onChange={(e) => setPurgeDays(e.target.value)}
              aria-label="Days"
              className={`${inputClass} w-28`}
            />
            <span className="text-sm text-muted">days</span>
          </label>
          <button type="button" onClick={purge} disabled={purging || !(Number(purgeDays) >= 1)} className={buttonClass.danger}>
            {purging ? "Deleting" : "Delete old images"}
          </button>
        </div>
        {purgeResult && (
          <p className={`text-sm ${purgeResult.ok ? "text-success" : "text-danger"}`}>
            {purgeResult.ok ? purgeResult.message : purgeResult.error}
          </p>
        )}
      </Panel>
    </div>
  );
}
