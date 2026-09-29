import "server-only";
import { db } from "@/db";

// Services accept either the shared pool connection or an open transaction so
// callers can compose multi-step domain operations atomically.
export type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];
