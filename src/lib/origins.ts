import "server-only";
import { env } from "@/lib/env";

// Every origin allowed to send cookie-authenticated mutations. The configured
// app origin always counts. Add more with BETTER_AUTH_TRUSTED_ORIGINS (for
// example a staging domain). In development, the localhost and 127.0.0.1
// aliases of the same port are both accepted, which lets one browser hold two
// separate sessions in two tabs because cookies are host-scoped.
export function trustedOrigins(): string[] {
  const base = new URL(env.BETTER_AUTH_URL);
  const origins = new Set<string>([base.origin, ...env.BETTER_AUTH_TRUSTED_ORIGINS]);
  if (process.env.NODE_ENV !== "production") {
    const port = base.port ? `:${base.port}` : "";
    origins.add(`${base.protocol}//127.0.0.1${port}`);
    origins.add(`${base.protocol}//localhost${port}`);
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://localhost:3001");
    origins.add("http://127.0.0.1:3001");
  }
  return [...origins];
}
