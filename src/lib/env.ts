import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      url.pathname.length > 1 &&
      !url.hash
    );
  }, "Set DATABASE_URL to a PostgreSQL connection string or run npm run setup."),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "Run npm run setup to generate a secret."),
  BETTER_AUTH_URL: z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    }, "Use an origin, e.g. http://localhost:3000.")
    .default("http://localhost:3000"),
  // Extra origins allowed to call the app with cookies. Keep it empty in
  // production; locally it enables the localhost/127.0.0.1 tab trick for
  // testing two roles at once.
  BETTER_AUTH_TRUSTED_ORIGINS: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return [] as string[];
      const entries = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      for (const entry of entries) {
        const parsed = z.url().safeParse(entry);
        if (
          !parsed.success ||
          !["http:", "https:"].includes(new URL(entry).protocol)
        ) {
          ctx.addIssue({
            code: "custom",
            message: `BETTER_AUTH_TRUSTED_ORIGINS has an invalid origin: ${entry}`,
          });
          return z.NEVER;
        }
      }
      return entries;
    }),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
});
