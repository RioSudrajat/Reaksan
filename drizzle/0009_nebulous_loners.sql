CREATE TYPE "public"."opname_entry_source" AS ENUM('SYSTEM_PLANNED', 'GRANT_HIBAH', 'LEFTOVER_RETURN', 'DISCOVERY_FOUND');--> statement-breakpoint
CREATE TYPE "public"."opname_variance_reason" AS ENUM('NORMAL_EVAPORATION', 'SPILL_DAMAGE', 'EXPIRED_SPOILED', 'RETURNED_LEFTOVER', 'GRANT_INTAKE', 'COUNT_CORRECTION', 'OTHER');--> statement-breakpoint
ALTER TABLE "material_batch" ADD COLUMN "storage_location" text;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN "entry_source" "opname_entry_source" DEFAULT 'SYSTEM_PLANNED' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN "variance_reason" "opname_variance_reason";--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN "storage_location" text;--> statement-breakpoint
CREATE INDEX "material_batch_storage_location_idx" ON "material_batch" USING btree ("storage_location");--> statement-breakpoint
CREATE INDEX "stock_opname_entry_source_idx" ON "stock_opname_entry" USING btree ("entry_source");