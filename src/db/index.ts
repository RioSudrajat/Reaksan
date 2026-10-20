import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

function connect() {
  const defaultMax = process.env.VERCEL ? 5 : 20;
  const configuredMax = Number(process.env.DB_POOL_MAX ?? defaultMax);
  const max =
    Number.isFinite(configuredMax) && configuredMax >= 2
      ? configuredMax
      : defaultMax;
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", () => {
    console.error(
      "An idle PostgreSQL connection was lost. Check database availability.",
    );
  });
  return drizzle(pool, { schema });
}

// Prevent extra connection pools during development hot reloads and reuse across warm serverless invocations.
const globalDb = globalThis as unknown as {
  starterPostgresDb?: ReturnType<typeof connect>;
};
export const db = globalDb.starterPostgresDb ?? connect();
globalDb.starterPostgresDb = db;
