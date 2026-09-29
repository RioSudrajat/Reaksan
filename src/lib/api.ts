import "server-only";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { trustedOrigins } from "@/lib/origins";
import { ApiError } from "@/lib/api-error";
import type { Permissions } from "@/lib/permissions";
import { userHasPermission } from "@/services/permissions.service";

export { ApiError };

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

// Shared HTTP concerns only. Domain rules and Drizzle queries live in services.
export async function withApiSession(
  request: Request,
  handler: (session: Session) => Promise<Response>,
) {
  let response: Response;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
      query: { disableCookieCache: true },
    });
    if (!session)
      throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");

    // Better Auth protects its own endpoints. Custom cookie-authenticated mutations need this check too.
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (
        !origin ||
        !trustedOrigins().includes(origin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new ApiError(
          403,
          "FORBIDDEN_ORIGIN",
          "Send this request from the app's configured origin.",
        );
    }
    response = await handler(session);
  } catch (error) {
    if (error instanceof ApiError) {
      response = Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    } else if (error instanceof ZodError) {
      response = Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the supplied fields.",
            details: error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 422 },
      );
    } else {
      // Do not return database errors, connection strings, or private values to clients.
      console.error(
        "Unexpected API failure:",
        error instanceof Error ? error.name : "UnknownError",
      );
      response = Response.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Something went wrong. Try again.",
          },
        },
        { status: 500 },
      );
    }
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// Same contract as withApiSession, plus a role check before the handler runs.
// Endpoints that reach across accounts must use this, not a UI-only check.
export function withApiPermission(
  request: Request,
  permissions: Permissions,
  handler: (session: Session) => Promise<Response>,
) {
  return withApiSession(request, async (session) => {
    if (!(await userHasPermission(session.user.id, permissions)))
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Your account cannot perform this action.",
      );
    return handler(session);
  });
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json")
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send an application/json body.",
    );
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Send valid JSON.");
  }
}
