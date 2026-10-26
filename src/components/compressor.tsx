"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownTrayIcon, CloudArrowUpIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/20/solid";
import {
  DEFAULT_SETTINGS,
  compressImage,
  formatBytes,
  outputFileName,
  percentSaved,
  type CompressResult,
  type CompressSettings,
  type OutputFormat,
} from "@/lib/compress";
import { downloadBlob } from "@/lib/download";
import { getClientId } from "@/lib/client-id";
import { getSupabaseBrowser, storageEnabled } from "@/lib/supabase-browser";

type SaveState = "idle" | "saving" | "saved" | "error";

type Item = {
  id: string;
  file: File;
  status: "working" | "done" | "error";
  result?: CompressResult;
  previewUrl?: string;
  error?: string;
  save: SaveState;
  saveError?: string;
};

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: "image/webp", label: "WebP" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "original", label: "Same as file" },
];

const SIZES = [0, 3840, 2560, 1920, 1280, 800];

export function Compressor() {
  const [settings, setSettings] = useState<CompressSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  const versions = useRef(new Map<string, number>());
  const settingsRef = useRef(settings);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = useCallback((id: string, update: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...update } : item)));
  }, []);

  const process = useCallback(
    async (id: string, file: File, current: CompressSettings) => {
      const version = (versions.current.get(id) ?? 0) + 1;
      versions.current.set(id, version);
      patch(id, { status: "working", error: undefined });

      try {
        const result = await compressImage(file, current);
        // A newer run for this file started while this one was encoding.
        if (versions.current.get(id) !== version) return;
        setItems((list) =>
          list.map((item) => {
            if (item.id !== id) return item;
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            return {
              ...item,
              status: "done",
              result,
              previewUrl: URL.createObjectURL(result.blob),
              save: "idle",
              saveError: undefined,
            };
          }),
        );
      } catch (err) {
        if (versions.current.get(id) !== version) return;
        patch(id, { status: "error", error: err instanceof Error ? err.message : "Compression failed." });
      }
    },
    [patch],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (!images.length) return;
      const added: Item[] = images.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "working",
        save: "idle",
      }));
      setItems((current) => [...added, ...current]);
      added.forEach((item) => process(item.id, item.file, settingsRef.current));
    },
    [process],
  );

  // Re-run every file when a setting changes, after a short pause so sliders stay smooth.
  useEffect(() => {
    if (settingsRef.current === settings) return;
    settingsRef.current = settings;
    const timer = setTimeout(() => {
      itemsRef.current.forEach((item) => process(item.id, item.file, settings));
    }, 300);
    return () => clearTimeout(timer);
  }, [settings, process]);

  // Allow pasting images from the clipboard anywhere on the page.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files?.length) addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  useEffect(() => {
    return () => itemsRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
  }, []);

  const remove = (id: string) => {
    versions.current.delete(id);
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    versions.current.clear();
    setItems([]);
  };

  const download = (item: Item) => {
    if (item.result) downloadBlob(item.result.blob, outputFileName(item.file.name, item.result.type));
  };

  const save = async (item: Item) => {
    const supabase = getSupabaseBrowser();
    const result = item.result;
    if (!supabase || !result) return;
    patch(item.id, { save: "saving", saveError: undefined });

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: getClientId(),
          fileName: outputFileName(item.file.name, result.type),
          format: result.type,
          originalSize: item.file.size,
          compressedSize: result.blob.size,
          originalWidth: result.originalWidth,
          originalHeight: result.originalHeight,
          width: result.width,
          height: result.height,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save.");

      const { error } = await supabase.storage
        .from(data.bucket)
        .uploadToSignedUrl(data.path, data.token, result.blob, { contentType: result.type });
      if (error) throw new Error(error.message);

      patch(item.id, { save: "saved" });
    } catch (err) {
      patch(item.id, { save: "error", saveError: err instanceof Error ? err.message : "Could not save." });
    }
  };

  const done = items.filter((item) => item.status === "done" && item.result);
  const totalBefore = done.reduce((sum, item) => sum + item.file.size, 0);
  const totalAfter = done.reduce((sum, item) => sum + (item.result?.blob.size ?? 0), 0);
  const pngSelected = settings.format === "image/png";

  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-16">
      <div className="space-y-8">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-6 rounded-card px-8 py-16 text-center transition-colors duration-200 ${
            dragging ? "bg-accent-soft" : "bg-surface"
          }`}
        >
          <PhotoIcon className="size-8 text-accent" aria-hidden />
          <div className="space-y-2">
            <p className="text-lg font-semibold text-ink">Drop images here</p>
            <p className="text-sm text-muted">JPEG, PNG, WebP or AVIF. You can also paste from the clipboard.</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            Choose images
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-4 rounded-card bg-ink px-8 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              {done.length} of {items.length} ready.{" "}
              {totalBefore > 0 && (
                <span className="font-semibold">
                  {formatBytes(totalBefore)} to {formatBytes(totalAfter)}, {percentSaved(totalBefore, totalAfter)}% smaller
                </span>
              )}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => done.forEach(download)}
                disabled={!done.length}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface-strong disabled:cursor-not-allowed disabled:bg-surface-strong"
              >
                Download all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full bg-ink-soft px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink-softer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-6">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col gap-6 rounded-card bg-white p-6 shadow-sm sm:flex-row sm:items-center"
              >
                <ResultCard item={item} onDownload={download} onSave={save} onRemove={remove} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <aside className="h-fit space-y-8 rounded-card bg-surface p-8 xl:sticky xl:top-24">
        <Field label="Format">
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((format) => (
              <Choice
                key={format.value}
                active={settings.format === format.value}
                onClick={() => setSettings((s) => ({ ...s, format: format.value }))}
              >
                {format.label}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label="Longest edge">
          <div className="flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <Choice
                key={size}
                active={settings.maxDimension === size}
                onClick={() => setSettings((s) => ({ ...s, maxDimension: size }))}
              >
                {size === 0 ? "Original" : `${size}px`}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label="Compression">
          <div className="flex flex-wrap gap-2">
            <Choice active={settings.mode === "quality"} onClick={() => setSettings((s) => ({ ...s, mode: "quality" }))}>
              Quality
            </Choice>
            <Choice
              active={settings.mode === "target"}
              disabled={pngSelected}
              onClick={() => setSettings((s) => ({ ...s, mode: "target" }))}
            >
              Target size
            </Choice>
          </div>

          {pngSelected ? (
            <p className="text-sm leading-relaxed text-muted">
              PNG is lossless, so only the longest edge changes its size. Pick WebP or JPEG for smaller photos.
            </p>
          ) : settings.mode === "quality" ? (
            <label className="block space-y-2">
              <span className="flex justify-between text-sm text-muted">
                <span>Quality</span>
                <span className="font-semibold text-ink">{Math.round(settings.quality * 100)}</span>
              </span>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={Math.round(settings.quality * 100)}
                onChange={(event) => setSettings((s) => ({ ...s, quality: Number(event.target.value) / 100 }))}
                className="w-full accent-accent"
              />
            </label>
          ) : (
            <label className="block space-y-2">
              <span className="text-sm text-muted">Largest file size in KB</span>
              <input
                type="number"
                min={10}
                step={10}
                value={settings.targetKb}
                onChange={(event) =>
                  setSettings((s) => ({ ...s, targetKb: Math.max(10, Number(event.target.value) || 10) }))
                }
                className="w-full rounded-card bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          )}
        </Field>

        {!storageEnabled && (
          <p className="text-sm leading-relaxed text-muted">
            Saving to a library is off until Supabase keys are added. Downloads work without it.
          </p>
        )}
      </aside>
    </div>
  );
}

function ResultCard({
  item,
  onDownload,
  onSave,
  onRemove,
}: {
  item: Item;
  onDownload: (item: Item) => void;
  onSave: (item: Item) => void;
  onRemove: (id: string) => void;
}) {
  const { result } = item;
  const saved = result ? percentSaved(item.file.size, result.blob.size) : 0;

  return (
    <>
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card bg-surface sm:w-40">
        {item.previewUrl && (
          <Image src={item.previewUrl} alt={item.file.name} fill unoptimized className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate font-semibold text-ink">{item.file.name}</p>
        {item.status === "working" && <p className="text-sm text-muted">Compressing...</p>}
        {item.status === "error" && <p className="text-sm text-danger">{item.error}</p>}
        {item.status === "done" && result && (
          <>
            <p className="text-sm text-muted">
              {formatBytes(item.file.size)} to <span className="font-semibold text-ink">{formatBytes(result.blob.size)}</span>
              {saved > 0 && <span className="font-semibold text-success">, {saved}% smaller</span>}
            </p>
            <p className="text-sm text-muted">
              {result.originalWidth} x {result.originalHeight} to {result.width} x {result.height}
            </p>
            {result.keptOriginal && (
              <p className="text-sm text-muted">This file was already smaller, so the original is kept.</p>
            )}
            {item.saveError && <p className="text-sm text-danger">{item.saveError}</p>}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onDownload(item)}
          disabled={item.status !== "done"}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-strong disabled:text-muted"
        >
          <ArrowDownTrayIcon className="size-5" aria-hidden />
          Download
        </button>
        {storageEnabled && (
          <button
            type="button"
            onClick={() => onSave(item)}
            disabled={item.status !== "done" || item.save === "saving" || item.save === "saved"}
            className="flex items-center gap-2 rounded-full bg-surface px-5 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface-strong disabled:cursor-not-allowed disabled:text-muted"
          >
            <CloudArrowUpIcon className="size-5" aria-hidden />
            {item.save === "saving" ? "Saving" : item.save === "saved" ? "Saved" : "Save"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.file.name}`}
          className="rounded-full p-2 text-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
        >
          <XMarkIcon className="size-5" aria-hidden />
        </button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-ink">{label}</p>
      {children}
    </div>
  );
}

function Choice({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-surface-strong disabled:text-muted disabled:shadow-none ${
        active ? "bg-ink text-white" : "bg-white text-ink shadow-sm hover:bg-surface-strong"
      }`}
    >
      {children}
    </button>
  );
}
