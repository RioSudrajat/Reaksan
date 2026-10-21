import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { checkRateLimit, isAutomatedTestEnv } from "@/lib/rate-limit";

export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
  if (!isAutomatedTestEnv()) {
    const isSignOut = request.url.includes("/sign-out");
    if (!isSignOut) {
      const isSignInAttempt =
        request.url.includes("/sign-in/email") ||
        request.url.includes("/sign-in/username");
      const limit = isSignInAttempt ? 10 : 20;
      const namespace = isSignInAttempt ? "auth:sign-in" : "auth:post";

      const rl = checkRateLimit(request, {
        namespace,
        limit,
        windowMs: 60_000,
      });

      if (!rl.allowed) {
        return Response.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: `Terlalu banyak percobaan autentikasi. Coba lagi dalam ${rl.retryAfterSeconds} detik.`,
            },
          },
          {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSeconds) },
          },
        );
      }
    }
  }
  return handler.POST(request);
}
