import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { writeAudit } from "@/services/audit.service";
import { userCreateInputSchema } from "@/validators/admin";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { configuration: ["manage-any"] },
    async (session) => {
      const input = userCreateInputSchema.parse(await readJson(request));

      try {
        const result = await auth.api.createUser({
          body: {
            name: input.name,
            email: input.email.toLowerCase().trim(),
            password: input.password,
            role: input.role,
          },
          headers: request.headers,
        });

        await writeAudit(db, {
          actorId: session.user.id,
          action: "CREATE",
          entityType: "user",
          entityId: result.user.id,
          after: {
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          },
        });

        return Response.json({ data: result.user }, { status: 201 });
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : "";
        if (
          rawMessage.toLowerCase().includes("already exists") ||
          rawMessage.includes("USER_ALREADY_EXISTS")
        ) {
          throw new ApiError(
            400,
            "BAD_REQUEST",
            "Email sudah terdaftar dalam sistem. Gunakan email lain.",
          );
        }
        const message = rawMessage || "Gagal membuat akun pengguna baru.";
        throw new ApiError(400, "BAD_REQUEST", message);
      }
    },
  );
}
