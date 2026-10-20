import "server-only";
import { ApiError } from "@/lib/api-error";

type RateLimitBucket = {
  timestamps: number[];
};

const globalForRateLimit = globalThis as unknown as {
  __reaksanRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets =
  globalForRateLimit.__reaksanRateLimitBuckets ??
  new Map<string, RateLimitBucket>();

globalForRateLimit.__reaksanRateLimitBuckets = buckets;

export type RateLimitOptions = {
  namespace: string;
  limit: number;
  windowMs: number;
  identifier?: string;
};

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local";
}

export function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const id = options.identifier ?? clientIpFromRequest(request);
  const key = `${options.namespace}:${id}`;

  // Periodic lightweight cleanup when map grows large
  if (buckets.size > 5000) {
    for (const [k, b] of buckets.entries()) {
      if (b.timestamps.every((t) => now - t > 300_000)) {
        buckets.delete(k);
      }
    }
  }

  const bucket = buckets.get(key) ?? { timestamps: [] };
  const windowStart = now - options.windowMs;
  const active = bucket.timestamps.filter((t) => t > windowStart);

  if (active.length >= options.limit) {
    const oldest = active[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + options.windowMs - now) / 1000),
    );
    bucket.timestamps = active;
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  active.push(now);
  bucket.timestamps = active;
  buckets.set(key, bucket);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, options.limit - active.length),
  };
}

export function isAutomatedTestEnv(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-")) ||
    process.env.BETTER_AUTH_URL === "http://localhost:3101"
  );
}

export function assertRateLimit(request: Request, options: RateLimitOptions) {
  if (isAutomatedTestEnv()) return;
  const result = checkRateLimit(request, options);
  if (!result.allowed) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfterSeconds} detik.`,
    );
  }
}
