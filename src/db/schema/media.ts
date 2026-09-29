import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// Binary files live in object storage; this table only keeps the metadata and
// the key needed to fetch the object. Import this file first in catalog tables
// so the foreign key has no circular dependency.
export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageProvider: text("storage_provider").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    // Null for catalog assets prepared by the seed script instead of an upload.
    uploadedById: text("uploaded_by_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("media_uploaded_by_idx").on(table.uploadedById),
    index("media_created_at_idx").on(table.createdAt),
  ],
);
