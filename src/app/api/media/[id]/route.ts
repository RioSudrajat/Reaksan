import { ApiError, withApiSession } from "@/lib/api";
import { getObject } from "@/lib/storage";
import { getMediaRecord } from "@/services/media.service";
import { sanitizeFileName } from "@/validators/media";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const response = await withApiSession(request, async () => {
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const record = await getMediaRecord(id);
    if (!record)
      throw new ApiError(404, "NOT_FOUND", "Gambar tidak ditemukan.");
    const bytes = await getObject(record.storageKey);
    if (!bytes)
      throw new ApiError(404, "NOT_FOUND", "Berkas gambar tidak ditemukan.");
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${sanitizeFileName(record.fileName)}"`,
      },
    });
  });
  if (response.status === 200)
    response.headers.set("Cache-Control", "private, max-age=3600, immutable");
  return response;
}
