import { z } from "zod";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const imageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type ImageMimeType = (typeof imageMimeTypes)[number];

const imageExtensionByMime: Record<ImageMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function isAllowedImageMime(value: string): value is ImageMimeType {
  return (imageMimeTypes as readonly string[]).includes(value);
}

export function imageExtension(mimeType: string) {
  return isAllowedImageMime(mimeType) ? imageExtensionByMime[mimeType] : "bin";
}

// The stored name is metadata only; strip anything that is not a safe
// filesystem/header character and keep it short.
export function sanitizeFileName(value: string, maxLength = 120) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safe = cleaned || "gambar";
  return safe.slice(0, maxLength);
}

export const imageMediaIdSchema = z
  .union([z.string().uuid(), z.null()])
  .optional();
