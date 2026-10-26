"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowTopRightOnSquareIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/20/solid";
import { formatBytes, percentSaved } from "@/lib/compress";
import { deleteImage } from "@/app/admin/actions";
import { Pagination, Panel, buttonClass, inputClass } from "./ui";

export type ContentItem = {
  id: string;
  file_name: string;
  format: string;
  original_size: number;
  compressed_size: number;
  width: number;
  height: number;
  created_at: string;
  owner: string | null;
  url: string | null;
};

type Filters = { q: string; format: string; owner: string };

export function ContentView({
  items,
  total,
  page,
  hasNext,
  filters,
}: {
  items: ContentItem[];
  total: number;
  page: number;
  hasNext: boolean;
  filters: Filters;
}) {
  const hrefFor = (p: number) => {
    const params = new URLSearchParams({ ...filters, page: String(p) });
    [...params.entries()].forEach(([k, v]) => !v && params.delete(k));
    return `/admin/content?${params}`;
  };

  return (
    <Panel title={`Saved images (${total.toLocaleString()})`}>
      <form method="get" className="flex flex-col gap-4 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search by file name</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={filters.q} placeholder="Search by file name" className={`${inputClass} w-full pl-12`} />
        </label>
        <select name="format" defaultValue={filters.format} aria-label="Format" className={`${inputClass}`}>
          <option value="">All formats</option>
          <option value="image/webp">WebP</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
        </select>
        <select name="owner" defaultValue={filters.owner} aria-label="Owner" className={`${inputClass}`}>
          <option value="">Everyone</option>
          <option value="accounts">Signed in</option>
          <option value="anonymous">Anonymous</option>
        </select>
        <button type="submit" className={buttonClass.primary}>
          Filter
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted">No images match these filters.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </ul>
      )}

      <Pagination page={page} hasNext={hasNext} hrefFor={hrefFor} />
    </Panel>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    if (!window.confirm(`Delete ${item.file_name}? This can not be undone.`)) return;
    startTransition(async () => {
      const result = await deleteImage(item.id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  };

  return (
    <li className="overflow-hidden rounded-card bg-surface" aria-busy={pending}>
      <div className="relative aspect-[4/3] w-full bg-surface-strong">
        {item.url ? (
          <Image src={item.url} alt={item.file_name} fill unoptimized className="object-cover" />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">File missing</p>
        )}
      </div>
      <div className="space-y-4 p-6">
        <div className="space-y-1">
          <p className="truncate font-semibold text-ink">{item.file_name}</p>
          <p className="text-sm text-muted">
            {formatBytes(item.original_size)} to {formatBytes(item.compressed_size)},{" "}
            {percentSaved(item.original_size, item.compressed_size)}% smaller
          </p>
          <p className="text-sm text-muted">
            {item.width} x {item.height}, {new Date(item.created_at).toLocaleDateString()}
          </p>
          <p className="truncate text-sm text-muted">{item.owner ?? "Anonymous visitor"}</p>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-sm transition-colors duration-150 hover:bg-surface-strong">
              <ArrowTopRightOnSquareIcon className="size-5" aria-hidden />
              Open
            </a>
          )}
          <button type="button" onClick={remove} disabled={pending} className={`${buttonClass.danger} flex items-center gap-2`}>
            <TrashIcon className="size-5" aria-hidden />
            {pending ? "Deleting" : "Delete"}
          </button>
        </div>
      </div>
    </li>
  );
}
