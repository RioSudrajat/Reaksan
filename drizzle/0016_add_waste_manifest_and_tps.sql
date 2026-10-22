ALTER TYPE "public"."waste_container_status" ADD VALUE IF NOT EXISTS 'IN_TPS';
--> statement-breakpoint
ALTER TYPE "public"."waste_container_status" ADD VALUE IF NOT EXISTS 'DISPOSED';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waste_manifest" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "manifest_number" text NOT NULL,
  "transporter_name" text NOT NULL,
  "driver_name" text,
  "vehicle_plate" text,
  "pic_staff_id" text NOT NULL,
  "handed_over_at" timestamp with time zone DEFAULT now() NOT NULL,
  "notes" text,
  "total_containers" numeric(5, 0) DEFAULT '0' NOT NULL,
  "total_volume_l" numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "total_volume_kg" numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waste_manifest_pic_staff_id_user_id_fk'
  ) THEN
    ALTER TABLE "waste_manifest" ADD CONSTRAINT "waste_manifest_pic_staff_id_user_id_fk" FOREIGN KEY ("pic_staff_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_manifest_code_idx" ON "waste_manifest" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_manifest_handed_over_idx" ON "waste_manifest" USING btree ("handed_over_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_manifest_pic_idx" ON "waste_manifest" USING btree ("pic_staff_id");
--> statement-breakpoint
ALTER TABLE "waste_container" ADD COLUMN IF NOT EXISTS "manifest_id" uuid;
--> statement-breakpoint
ALTER TABLE "waste_container" ADD COLUMN IF NOT EXISTS "tps_moved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "waste_container" ADD COLUMN IF NOT EXISTS "disposed_at" timestamp with time zone;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waste_container_manifest_id_waste_manifest_id_fk'
  ) THEN
    ALTER TABLE "waste_container" ADD CONSTRAINT "waste_container_manifest_id_waste_manifest_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "waste_manifest"("id") ON DELETE no action ON UPDATE no action;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_container_manifest_idx" ON "waste_container" USING btree ("manifest_id");
