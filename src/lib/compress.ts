export type OutputFormat = "image/jpeg" | "image/webp" | "image/png" | "original";

export type CompressSettings = {
  format: OutputFormat;
  // Longest edge in pixels. 0 keeps the original dimensions.
  maxDimension: number;
  mode: "quality" | "target";
  // 0.1 to 1
  quality: number;
  // Used when mode is "target". Ignored for PNG, which has no quality setting.
  targetKb: number;
};

export type CompressResult = {
  blob: Blob;
  type: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  // True when the output would have been larger, so the original file was kept.
  keptOriginal: boolean;
};

export const DEFAULT_SETTINGS: CompressSettings = {
  format: "image/webp",
  maxDimension: 2560,
  mode: "quality",
  quality: 0.8,
  targetKb: 300,
};

export const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
};

const ENCODABLE = new Set(Object.keys(EXTENSIONS));

export function resolveOutputType(settings: CompressSettings, file: File): string {
  if (settings.format !== "original") return settings.format;
  return ENCODABLE.has(file.type) ? file.type : "image/jpeg";
}

export function outputFileName(name: string, type: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}-small.${EXTENSIONS[type] ?? "jpg"}`;
}

function fitWithin(width: number, height: number, max: number) {
  if (!max || (width <= max && height <= max)) return { width, height };
  const scale = max / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This browser could not encode the image."))),
      type,
      quality,
    );
  });
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This file type can not be read by your browser. Try JPEG, PNG, WebP or AVIF.");
  }
}

export async function compressImage(file: File, settings: CompressSettings): Promise<CompressResult> {
  const bitmap = await decode(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const { width, height } = fitWithin(originalWidth, originalHeight, settings.maxDimension);
  const type = resolveOutputType(settings, file);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  // JPEG has no alpha channel, so paint transparent areas white instead of black.
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob;
  if (type === "image/png") {
    blob = await encode(canvas, type);
  } else if (settings.mode === "target") {
    blob = await encodeToTarget(canvas, type, settings.targetKb * 1024);
  } else {
    blob = await encode(canvas, type, settings.quality);
  }

  const resized = width !== originalWidth || height !== originalHeight;
  if (!resized && type === file.type && blob.size >= file.size) {
    return { blob: file, type, width, height, originalWidth, originalHeight, keptOriginal: true };
  }

  return { blob, type, width, height, originalWidth, originalHeight, keptOriginal: false };
}

// Binary search on quality for the largest output that fits under the target size.
async function encodeToTarget(canvas: HTMLCanvasElement, type: string, targetBytes: number): Promise<Blob> {
  let low = 0.05;
  let high = 0.95;
  let best: Blob | null = null;
  let smallest: Blob | null = null;

  for (let i = 0; i < 7; i++) {
    const quality = (low + high) / 2;
    const blob = await encode(canvas, type, quality);
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= targetBytes) {
      best = blob;
      low = quality;
    } else {
      high = quality;
    }
  }

  return best ?? smallest ?? encode(canvas, type, low);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function percentSaved(original: number, compressed: number): number {
  if (!original) return 0;
  return Math.round((1 - compressed / original) * 100);
}
