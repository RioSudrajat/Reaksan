DO $$ BEGIN
  CREATE TYPE "public"."waste_physical_state" AS ENUM('LIQUID', 'SOLID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."waste_container_status" AS ENUM('ACTIVE', 'FULL', 'SEALED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."waste_log_status" AS ENUM('LOGGED', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waste_category" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "physical_state" "waste_physical_state" DEFAULT 'LIQUID' NOT NULL,
  "description" text,
  "hazard_badge" text,
  "color_hex" text DEFAULT '#e11d48',
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waste_container" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "room_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "name" text NOT NULL,
  "max_capacity" numeric(10, 2) NOT NULL,
  "current_volume" numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "unit" text DEFAULT 'L' NOT NULL,
  "status" "waste_container_status" DEFAULT 'ACTIVE' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "qr_code" text UNIQUE,
  "location_notes" text,
  "opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waste_disposal_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "container_id" uuid NOT NULL,
  "request_id" uuid,
  "student_id" text NOT NULL,
  "verified_by_id" text,
  "quantity" numeric(10, 2) NOT NULL,
  "unit" text DEFAULT 'L' NOT NULL,
  "chemical_description" text NOT NULL,
  "notes" text,
  "status" "waste_log_status" DEFAULT 'LOGGED' NOT NULL,
  "disposed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "waste_container" ADD CONSTRAINT "waste_container_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "waste_container" ADD CONSTRAINT "waste_container_category_id_waste_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."waste_category"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "waste_disposal_log" ADD CONSTRAINT "waste_disposal_log_container_id_waste_container_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."waste_container"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "waste_disposal_log" ADD CONSTRAINT "waste_disposal_log_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "waste_disposal_log" ADD CONSTRAINT "waste_disposal_log_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "waste_disposal_log" ADD CONSTRAINT "waste_disposal_log_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_category_code_idx" ON "waste_category" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_category_active_idx" ON "waste_category" USING btree ("active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_container_room_idx" ON "waste_container" USING btree ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_container_category_idx" ON "waste_container" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_container_status_idx" ON "waste_container" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_container_active_idx" ON "waste_container" USING btree ("active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_container_code_idx" ON "waste_container" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_container_qr_code_idx" ON "waste_container" USING btree ("qr_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_disposal_log_container_idx" ON "waste_disposal_log" USING btree ("container_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_disposal_log_request_idx" ON "waste_disposal_log" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_disposal_log_student_idx" ON "waste_disposal_log" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_disposal_log_status_idx" ON "waste_disposal_log" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_disposal_log_disposed_idx" ON "waste_disposal_log" USING btree ("disposed_at");
