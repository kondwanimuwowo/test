import Link from "next/link";
import { formatBytes, percentSaved } from "@/lib/compress";
import { DailyChart, type DailyPoint } from "./daily-chart";
import { Panel, StatTile } from "./ui";

export type Stats = {
  total_images: number;
  bytes_before: number;
  bytes_after: number;
  images_in_period: number;
  total_users: number;
  admins: number;
  suspended: number;
  new_users_in_period: number;
  anonymous_images: number;
  daily: DailyPoint[];
  formats: { format: string; images: number; bytes_before: number; bytes_after: number }[];
};

export type RecentUser = { id: string; email: string; created_at: string };

export const PERIODS = [7, 30, 90];

const FORMAT_NAMES: Record<string, string> = { "image/webp": "WebP", "image/jpeg": "JPEG", "image/png": "PNG" };

export function Overview({ stats, days, recentUsers }: { stats: Stats; days: number; recentUsers: RecentUser[] }) {
  const saved = stats.bytes_before - stats.bytes_after;
  const maxFormat = Math.max(1, ...stats.formats.map((f) => f.images));

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin?days=${p}`}
            aria-current={p === days ? "true" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              p === days ? "bg-ink text-white" : "bg-white text-ink shadow-sm hover:bg-surface-strong"
            }`}
          >
            Last {p} days
          </Link>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Images saved"
          value={stats.total_images.toLocaleString()}
          detail={`${stats.images_in_period.toLocaleString()} in the last ${days} days`}
        />
        <StatTile
          label="Data saved"
          value={formatBytes(Math.max(0, saved))}
          detail={`${percentSaved(stats.bytes_before, stats.bytes_after)}% smaller on average`}
        />
        <StatTile
          label="Users"
          value={stats.total_users.toLocaleString()}
          detail={`${stats.new_users_in_period.toLocaleString()} joined in the last ${days} days`}
        />
        <StatTile
          label="Suspended"
          value={stats.suspended.toLocaleString()}
          detail={`${stats.admins.toLocaleString()} admin${stats.admins === 1 ? "" : "s"}`}
        />
      </div>

      <Panel title="Activity">
        <DailyChart data={stats.daily} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Formats">
          {stats.formats.length === 0 ? (
            <p className="text-muted">No saved images yet.</p>
          ) : (
            <ul className="space-y-6">
              {stats.formats.map((f) => (
                <li key={f.format} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-semibold text-ink">{FORMAT_NAMES[f.format] ?? f.format}</span>
                    <span className="text-muted">
                      {f.images.toLocaleString()} images, {percentSaved(f.bytes_before, f.bytes_after)}% smaller
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface">
                    <div className="h-2 rounded-full bg-accent" style={{ width: `${(f.images / maxFormat) * 100}%` }} />
                  </div>
                </li>
              ))}
              <li className="text-sm text-muted">
                {stats.anonymous_images.toLocaleString()} of {stats.total_images.toLocaleString()} images were saved
                without an account.
              </li>
            </ul>
          )}
        </Panel>

        <Panel
          title="New users"
          action={
            <Link href="/admin/users" className="text-sm font-semibold text-accent hover:text-accent-hover">
              All users
            </Link>
          }
        >
          {recentUsers.length === 0 ? (
            <p className="text-muted">No accounts yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentUsers.map((user, i) => (
                <li
                  key={user.id}
                  className={`flex items-center justify-between gap-4 rounded-card px-4 py-3 text-sm ${
                    i % 2 ? "bg-white" : "bg-surface"
                  }`}
                >
                  <span className="truncate font-medium text-ink">{user.email}</span>
                  <span className="shrink-0 text-muted">{new Date(user.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
