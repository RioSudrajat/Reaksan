import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { checkRateLimit, isAutomatedTestEnv } from "@/lib/rate-limit";

export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
  if (!isAutomatedTestEnv()) {
    const rl = checkRateLimit(request, {
      namespace: "auth:post",
      limit: 20,
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
  return handler.POST(request);
}
