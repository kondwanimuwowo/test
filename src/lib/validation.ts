const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ALLOWED_TYPES = ["image/jpeg", "image/webp", "image/png"] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isPositiveInt(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= max;
}

export function cleanFileName(value: unknown): string {
  if (typeof value !== "string") return "image";
  const cleaned = value.replace(/[^\w.\- ]+/g, "").trim().slice(0, 120);
  return cleaned || "image";
}
