import Link from "next/link";

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-8 rounded-card bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="space-y-2 rounded-card bg-white p-6 shadow-sm md:p-8">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="text-4xl font-bold tracking-tight text-ink">{value}</p>
      {detail && <p className="text-sm text-muted">{detail}</p>}
    </div>
  );
}

export function Pagination({
  page,
  hasNext,
  hrefFor,
}: {
  page: number;
  hasNext: boolean;
  hrefFor: (page: number) => string;
}) {
  if (page <= 1 && !hasNext) return null;
  const pill = "rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-150";
  return (
    <div className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${pill} bg-white text-ink shadow-sm hover:bg-surface-strong`}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">Page {page}</span>
      {hasNext ? (
        <Link href={hrefFor(page + 1)} className={`${pill} bg-white text-ink shadow-sm hover:bg-surface-strong`}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

export const inputClass =
  "rounded-card bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors duration-150 focus:bg-white focus:ring-2 focus:ring-accent";

export const buttonClass = {
  primary:
    "rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover disabled:bg-surface-strong disabled:text-muted",
  secondary:
    "rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-sm transition-colors duration-150 hover:bg-surface-strong disabled:text-muted",
  danger:
    "rounded-full bg-danger-soft px-5 py-2 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger-softer disabled:text-muted",
};
