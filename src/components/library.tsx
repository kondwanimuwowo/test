"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownTrayIcon, TrashIcon } from "@heroicons/react/20/solid";
import { formatBytes, percentSaved } from "@/lib/compress";
import { downloadBlob } from "@/lib/download";
import { getClientId } from "@/lib/client-id";
import { storageEnabled } from "@/lib/supabase-browser";
import type { LibraryItem } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: LibraryItem[] };

export function Library() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!storageEnabled) return;
    fetch(`/api/library?clientId=${getClientId()}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load your library.");
        setState({ status: "ready", items: data.items });
      })
      .catch((err: Error) => setState({ status: "error", message: err.message }));
  }, []);

  if (!storageEnabled) {
    return (
      <Message
        title="Saving is not set up"
        body="Add your Supabase URL and keys to the environment to turn on the library. Compressing and downloading work without it."
      />
    );
  }
  if (state.status === "loading") return <p className="text-muted">Loading your library...</p>;
  if (state.status === "error") return <Message title="Something went wrong" body={state.message} />;
  if (!state.items.length) {
    return <Message title="Nothing saved yet" body="Compress an image and press Save to keep it here." />;
  }

  const remove = async (id: string) => {
    const response = await fetch(`/api/library/${id}?clientId=${getClientId()}`, { method: "DELETE" });
    if (response.ok || response.status === 404) {
      setState((current) =>
        current.status === "ready" ? { ...current, items: current.items.filter((item) => item.id !== id) } : current,
      );
    }
  };

  const download = async (item: LibraryItem) => {
    const response = await fetch(item.url);
    if (response.ok) downloadBlob(await response.blob(), item.file_name);
  };

  return (
    <ul className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {state.items.map((item) => (
          <motion.li
            key={item.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden rounded-card bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] w-full bg-surface">
              <Image src={item.url} alt={item.file_name} fill unoptimized className="object-cover" />
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-2">
                <p className="truncate font-semibold text-ink">{item.file_name}</p>
                <p className="text-sm text-muted">
                  {formatBytes(item.original_size)} to{" "}
                  <span className="font-semibold text-ink">{formatBytes(item.compressed_size)}</span>
                  <span className="font-semibold text-success">
                    , {percentSaved(item.original_size, item.compressed_size)}% smaller
                  </span>
                </p>
                <p className="text-sm text-muted">
                  {item.width} x {item.height}, saved {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => download(item)}
                  className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
                >
                  <ArrowDownTrayIcon className="size-5" aria-hidden />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="flex items-center gap-2 rounded-full bg-surface px-5 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface-strong"
                >
                  <TrashIcon className="size-5" aria-hidden />
                  Delete
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="overflow-hidden rounded-card bg-surface md:flex md:items-center">
      <div className="relative aspect-[2/1] w-full md:w-1/2">
        <Image src="/illustrations/empty.svg" alt="" fill unoptimized className="object-cover" />
      </div>
      <div className="space-y-4 p-8 md:w-1/2 md:p-12">
        <h2 className="text-3xl font-bold tracking-tight text-ink">{title}</h2>
        <p className="leading-relaxed text-muted">{body}</p>
        <Link
          href="/#compress"
          className="inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          Compress images
        </Link>
      </div>
    </div>
  );
}
