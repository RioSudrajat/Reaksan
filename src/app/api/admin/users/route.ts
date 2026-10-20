import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
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
        const cleanUsername = input.username.toLowerCase().trim();
        const effectiveEmail =
          input.email && input.email.trim()
            ? input.email.toLowerCase().trim()
            : `${cleanUsername}@mail.unpad.ac.id`;

        const result = await auth.api.createUser({
          body: {
            name: input.name,
            email: effectiveEmail,
            password: input.password,
            role: input.role,
            data: {
              username: cleanUsername,
            },
          },
          headers: request.headers,
        });

        // Ensure username is explicitly persisted in the database
        await db
          .update(user)
          .set({ username: cleanUsername })
          .where(eq(user.id, result.user.id));

        await writeAudit(db, {
          actorId: session.user.id,
          action: "CREATE",
          entityType: "user",
          entityId: result.user.id,
          after: {
            name: result.user.name,
            email: effectiveEmail,
            username: cleanUsername,
            role: result.user.role,
          },
        });

        return Response.json(
          {
            data: {
              ...result.user,
              username: cleanUsername,
            },
          },
          { status: 201 },
        );
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : "";
        if (
          rawMessage.toLowerCase().includes("already exists") ||
          rawMessage.includes("USER_ALREADY_EXISTS") ||
          rawMessage.includes("USERNAME_IS_ALREADY_TAKEN")
        ) {
          throw new ApiError(
            400,
            "BAD_REQUEST",
            "NIM / NIP atau Email sudah terdaftar dalam sistem. Gunakan yang lain.",
          );
        }
        const message = rawMessage || "Gagal membuat akun pengguna baru.";
        throw new ApiError(400, "BAD_REQUEST", message);
      }
    },
  );
}
