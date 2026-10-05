import { randomUUID } from "node:crypto";
import { ApiError, withApiSession } from "@/lib/api";
import { hasPermission } from "@/lib/session";
import { currentStorageProvider, deleteObject, putObject } from "@/lib/storage";
import { createMedia } from "@/services/media.service";
import {
  MAX_IMAGE_BYTES,
  imageExtension,
  isAllowedImageMime,
  sanitizeFileName,
} from "@/validators/media";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const userRoles = session.user.role ? session.user.role.split(",").map((r) => r.trim()) : [];
    const allowed =
      (await hasPermission(session.user.id, { equipment: ["manage-any"] })) ||
      (await hasPermission(session.user.id, { materials: ["manage-any"] })) ||
      (await hasPermission(session.user.id, { configuration: ["manage-any"] })) ||
      (await hasPermission(session.user.id, { inventory: ["manage-any"] })) ||
      (await hasPermission(session.user.id, { plp: ["view"] })) ||
      userRoles.includes("admin") ||
      userRoles.includes("plp");
    if (!allowed)
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Akun ini tidak memiliki hak akses untuk mengunggah gambar katalog.",
      );
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(
        400,
        "INVALID_FORM",
        "Kirim gambar sebagai form data.",
      );
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0)
      throw new ApiError(400, "NO_FILE", "Pilih file gambar dulu.");
    if (!isAllowedImageMime(file.type))
      throw new ApiError(
        400,
        "UNSUPPORTED_TYPE",
        "Format gambar harus PNG, JPEG, atau WebP.",
      );
    if (file.size > MAX_IMAGE_BYTES)
      throw new ApiError(413, "FILE_TOO_LARGE", "Ukuran gambar maksimal 5 MB.");

    const key = `media/${randomUUID()}.${imageExtension(file.type)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await putObject(key, bytes, file.type);
    try {
      const record = await createMedia(session.user.id, {
        storageProvider: currentStorageProvider(),
        storageKey: key,
        fileName: sanitizeFileName(file.name),
        mimeType: file.type,
        sizeBytes: file.size,
      });
      return Response.json(
        { id: record.id, url: `/api/media/${record.id}` },
        { status: 201 },
      );
    } catch (error) {
      await deleteObject(key).catch(() => undefined);
      throw error;
    }
  });
}
