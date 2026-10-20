import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { writeAudit } from "@/services/audit.service";
import { userResetPasswordSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { user: ["set-password"] },
    async (session) => {
      const id = z
        .string()
        .min(1)
        .parse((await context.params).id);
      const input = userResetPasswordSchema.parse(await readJson(request));

      try {
        await auth.api.setUserPassword({
          body: {
            userId: id,
            newPassword: input.password,
          },
          headers: request.headers,
        });

        await writeAudit(db, {
          actorId: session.user.id,
          action: "UPDATE",
          entityType: "user",
          entityId: id,
          reason: "Admin mereset kata sandi pengguna",
        });

        return Response.json({
          data: {
            success: true,
            message: "Kata sandi pengguna berhasil diperbarui.",
          },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Gagal memperbarui kata sandi pengguna.";
        throw new ApiError(400, "BAD_REQUEST", message);
      }
    },
  );
}
