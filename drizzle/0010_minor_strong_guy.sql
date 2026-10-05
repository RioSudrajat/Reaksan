CREATE TYPE "public"."equipment_classification" AS ENUM('INSTRUMENT', 'TOOL');--> statement-breakpoint
CREATE TYPE "public"."stock_opname_item_type" AS ENUM('MATERIAL', 'TOOL', 'INSTRUMENT');--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ALTER COLUMN "material_batch_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment_type" ADD COLUMN "classification" "equipment_classification" DEFAULT 'INSTRUMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment_unit" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "equipment_unit" ADD COLUMN "storage_location" text;--> statement-breakpoint
ALTER TABLE "material_batch" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN "item_type" "stock_opname_item_type" DEFAULT 'MATERIAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN "equipment_unit_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN "condition" "equipment_condition";--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_equipment_unit_id_equipment_unit_id_fk" FOREIGN KEY ("equipment_unit_id") REFERENCES "public"."equipment_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_type_classification_idx" ON "equipment_type" USING btree ("classification");--> statement-breakpoint
CREATE INDEX "equipment_unit_qr_code_idx" ON "equipment_unit" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "equipment_unit_storage_location_idx" ON "equipment_unit" USING btree ("storage_location");--> statement-breakpoint
CREATE INDEX "material_batch_qr_code_idx" ON "material_batch" USING btree ("qr_code");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_opname_entry_session_unit_unique" ON "stock_opname_entry" USING btree ("session_id","equipment_unit_id");--> statement-breakpoint
CREATE INDEX "stock_opname_entry_item_type_idx" ON "stock_opname_entry" USING btree ("item_type");--> statement-breakpoint
ALTER TABLE "equipment_unit" ADD CONSTRAINT "equipment_unit_qr_code_unique" UNIQUE("qr_code");--> statement-breakpoint
ALTER TABLE "material_batch" ADD CONSTRAINT "material_batch_qr_code_unique" UNIQUE("qr_code");