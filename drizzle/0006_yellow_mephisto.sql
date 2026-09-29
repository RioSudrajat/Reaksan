CREATE TYPE "public"."stock_opname_status" AS ENUM('IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "stock_opname_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"material_batch_id" uuid NOT NULL,
	"baseline_quantity" numeric(14, 3) NOT NULL,
	"counted_quantity" numeric(14, 3) NOT NULL,
	"counted_by_id" text NOT NULL,
	"counted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stock_opname_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"status" "stock_opname_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_by_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_by_id" text,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment_asset" ADD COLUMN "image_media_id" uuid;--> statement-breakpoint
ALTER TABLE "equipment_type" ADD COLUMN "image_media_id" uuid;--> statement-breakpoint
ALTER TABLE "material" ADD COLUMN "image_media_id" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_session_id_stock_opname_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stock_opname_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_material_batch_id_material_batch_id_fk" FOREIGN KEY ("material_batch_id") REFERENCES "public"."material_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_counted_by_id_user_id_fk" FOREIGN KEY ("counted_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_session" ADD CONSTRAINT "stock_opname_session_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_session" ADD CONSTRAINT "stock_opname_session_started_by_id_user_id_fk" FOREIGN KEY ("started_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_session" ADD CONSTRAINT "stock_opname_session_completed_by_id_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_opname_entry_session_batch_unique" ON "stock_opname_entry" USING btree ("session_id","material_batch_id");--> statement-breakpoint
CREATE INDEX "stock_opname_entry_session_idx" ON "stock_opname_entry" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "stock_opname_session_room_idx" ON "stock_opname_session" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "stock_opname_session_status_idx" ON "stock_opname_session" USING btree ("status");--> statement-breakpoint
ALTER TABLE "equipment_asset" ADD CONSTRAINT "equipment_asset_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_type" ADD CONSTRAINT "equipment_type_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;