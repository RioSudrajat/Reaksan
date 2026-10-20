-- 1. Create instrument_type and tool_type tables
CREATE TABLE IF NOT EXISTS "instrument_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "description" text,
  "usage_type" "equipment_usage_type" DEFAULT 'USAGE_ONLY' NOT NULL,
  "image_media_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_type_category_idx" ON "instrument_type" USING btree ("category");
--> statement-breakpoint
ALTER TABLE "instrument_type" ADD CONSTRAINT "instrument_type_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "description" text,
  "usage_type" "equipment_usage_type" DEFAULT 'BORROWABLE' NOT NULL,
  "image_media_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_type_category_idx" ON "tool_type" USING btree ("category");
--> statement-breakpoint
ALTER TABLE "tool_type" ADD CONSTRAINT "tool_type_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 2. Create instrument_asset and tool_asset tables
CREATE TABLE IF NOT EXISTS "instrument_asset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_type_id" uuid NOT NULL,
  "room_id" uuid NOT NULL,
  "asset_code" text NOT NULL,
  "serial_number" text,
  "status" "equipment_status" DEFAULT 'AVAILABLE' NOT NULL,
  "condition" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
  "acquisition_date" timestamp with time zone,
  "notes" text,
  "image_media_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "instrument_asset_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_asset_type_idx" ON "instrument_asset" USING btree ("instrument_type_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_asset_room_idx" ON "instrument_asset" USING btree ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_asset_status_idx" ON "instrument_asset" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_asset_room_status_idx" ON "instrument_asset" USING btree ("room_id", "status");
--> statement-breakpoint
ALTER TABLE "instrument_asset" ADD CONSTRAINT "instrument_asset_instrument_type_id_instrument_type_id_fk" FOREIGN KEY ("instrument_type_id") REFERENCES "public"."instrument_type"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "instrument_asset" ADD CONSTRAINT "instrument_asset_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "instrument_asset" ADD CONSTRAINT "instrument_asset_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_asset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tool_type_id" uuid NOT NULL,
  "room_id" uuid NOT NULL,
  "asset_code" text NOT NULL,
  "serial_number" text,
  "status" "equipment_status" DEFAULT 'AVAILABLE' NOT NULL,
  "condition" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
  "acquisition_date" timestamp with time zone,
  "notes" text,
  "image_media_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tool_asset_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_asset_type_idx" ON "tool_asset" USING btree ("tool_type_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_asset_room_idx" ON "tool_asset" USING btree ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_asset_status_idx" ON "tool_asset" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_asset_room_status_idx" ON "tool_asset" USING btree ("room_id", "status");
--> statement-breakpoint
ALTER TABLE "tool_asset" ADD CONSTRAINT "tool_asset_tool_type_id_tool_type_id_fk" FOREIGN KEY ("tool_type_id") REFERENCES "public"."tool_type"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_asset" ADD CONSTRAINT "tool_asset_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_asset" ADD CONSTRAINT "tool_asset_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 3. Create instrument_unit and tool_unit tables
CREATE TABLE IF NOT EXISTS "instrument_unit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_asset_id" uuid NOT NULL,
  "code" text NOT NULL,
  "label" text NOT NULL,
  "qr_code" text,
  "storage_location" text,
  "status" "equipment_status" DEFAULT 'AVAILABLE' NOT NULL,
  "condition" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
  "notes" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "instrument_unit_code_unique" UNIQUE("code"),
  CONSTRAINT "instrument_unit_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_unit_asset_idx" ON "instrument_unit" USING btree ("instrument_asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_unit_status_idx" ON "instrument_unit" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_unit_qr_code_idx" ON "instrument_unit" USING btree ("qr_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_unit_storage_location_idx" ON "instrument_unit" USING btree ("storage_location");
--> statement-breakpoint
ALTER TABLE "instrument_unit" ADD CONSTRAINT "instrument_unit_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_unit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tool_asset_id" uuid NOT NULL,
  "code" text NOT NULL,
  "label" text NOT NULL,
  "qr_code" text,
  "storage_location" text,
  "status" "equipment_status" DEFAULT 'AVAILABLE' NOT NULL,
  "condition" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
  "notes" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tool_unit_code_unique" UNIQUE("code"),
  CONSTRAINT "tool_unit_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_unit_asset_idx" ON "tool_unit" USING btree ("tool_asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_unit_status_idx" ON "tool_unit" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_unit_qr_code_idx" ON "tool_unit" USING btree ("qr_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_unit_storage_location_idx" ON "tool_unit" USING btree ("storage_location");
--> statement-breakpoint
ALTER TABLE "tool_unit" ADD CONSTRAINT "tool_unit_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 4. Create instrument_condition_history and tool_condition_history
CREATE TABLE IF NOT EXISTS "instrument_condition_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_asset_id" uuid NOT NULL,
  "instrument_unit_id" uuid,
  "condition" "equipment_condition" NOT NULL,
  "source" text NOT NULL,
  "recorded_by_id" text NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_condition_history_asset_created_idx" ON "instrument_condition_history" USING btree ("instrument_asset_id", "created_at");
--> statement-breakpoint
ALTER TABLE "instrument_condition_history" ADD CONSTRAINT "instrument_condition_history_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "instrument_condition_history" ADD CONSTRAINT "instrument_condition_history_instrument_unit_id_instrument_unit_id_fk" FOREIGN KEY ("instrument_unit_id") REFERENCES "public"."instrument_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "instrument_condition_history" ADD CONSTRAINT "instrument_condition_history_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_condition_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tool_asset_id" uuid NOT NULL,
  "tool_unit_id" uuid,
  "condition" "equipment_condition" NOT NULL,
  "source" text NOT NULL,
  "recorded_by_id" text NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_condition_history_asset_created_idx" ON "tool_condition_history" USING btree ("tool_asset_id", "created_at");
--> statement-breakpoint
ALTER TABLE "tool_condition_history" ADD CONSTRAINT "tool_condition_history_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_condition_history" ADD CONSTRAINT "tool_condition_history_tool_unit_id_tool_unit_id_fk" FOREIGN KEY ("tool_unit_id") REFERENCES "public"."tool_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_condition_history" ADD CONSTRAINT "tool_condition_history_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 5. Create instrument_request_item and tool_request_item
CREATE TABLE IF NOT EXISTS "instrument_request_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL,
  "instrument_asset_id" uuid NOT NULL,
  "instrument_unit_id" uuid NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "allow_shared_usage" boolean DEFAULT false NOT NULL,
  "purpose" text,
  "usage_plan" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_request_item_request_idx" ON "instrument_request_item" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instrument_request_item_unit_period_idx" ON "instrument_request_item" USING btree ("instrument_unit_id", "start_at", "end_at");
--> statement-breakpoint
ALTER TABLE "instrument_request_item" ADD CONSTRAINT "instrument_request_item_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "instrument_request_item" ADD CONSTRAINT "instrument_request_item_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "instrument_request_item" ADD CONSTRAINT "instrument_request_item_instrument_unit_id_instrument_unit_id_fk" FOREIGN KEY ("instrument_unit_id") REFERENCES "public"."instrument_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_request_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL,
  "tool_asset_id" uuid NOT NULL,
  "tool_unit_id" uuid NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "purpose" text,
  "usage_plan" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_request_item_request_idx" ON "tool_request_item" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_request_item_unit_period_idx" ON "tool_request_item" USING btree ("tool_unit_id", "start_at", "end_at");
--> statement-breakpoint
ALTER TABLE "tool_request_item" ADD CONSTRAINT "tool_request_item_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_request_item" ADD CONSTRAINT "tool_request_item_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_request_item" ADD CONSTRAINT "tool_request_item_tool_unit_id_tool_unit_id_fk" FOREIGN KEY ("tool_unit_id") REFERENCES "public"."tool_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 6. Migrate existing data from equipment_* into instrument_* and tool_* (only if equipment_type exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_type') THEN
    -- Types
    INSERT INTO "instrument_type" ("id", "name", "category", "description", "usage_type", "image_media_id", "active", "created_at", "updated_at")
    SELECT "id", "name", "category", "description", "usage_type", "image_media_id", "active", "created_at", "updated_at"
    FROM "equipment_type" WHERE "classification" = 'INSTRUMENT'
    ON CONFLICT ("id") DO NOTHING;

    INSERT INTO "tool_type" ("id", "name", "category", "description", "usage_type", "image_media_id", "active", "created_at", "updated_at")
    SELECT "id", "name", "category", "description", "usage_type", "image_media_id", "active", "created_at", "updated_at"
    FROM "equipment_type" WHERE "classification" = 'TOOL'
    ON CONFLICT ("id") DO NOTHING;

    -- Assets
    INSERT INTO "instrument_asset" ("id", "instrument_type_id", "room_id", "asset_code", "serial_number", "status", "condition", "acquisition_date", "notes", "image_media_id", "active", "created_at", "updated_at")
    SELECT ea."id", ea."equipment_type_id", ea."room_id", ea."asset_code", ea."serial_number", ea."status", ea."condition", ea."acquisition_date", ea."notes", ea."image_media_id", ea."active", ea."created_at", ea."updated_at"
    FROM "equipment_asset" ea
    JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
    WHERE et."classification" = 'INSTRUMENT'
    ON CONFLICT ("id") DO NOTHING;

    INSERT INTO "tool_asset" ("id", "tool_type_id", "room_id", "asset_code", "serial_number", "status", "condition", "acquisition_date", "notes", "image_media_id", "active", "created_at", "updated_at")
    SELECT ea."id", ea."equipment_type_id", ea."room_id", ea."asset_code", ea."serial_number", ea."status", ea."condition", ea."acquisition_date", ea."notes", ea."image_media_id", ea."active", ea."created_at", ea."updated_at"
    FROM "equipment_asset" ea
    JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
    WHERE et."classification" = 'TOOL'
    ON CONFLICT ("id") DO NOTHING;

    -- Units
    INSERT INTO "instrument_unit" ("id", "instrument_asset_id", "code", "label", "qr_code", "storage_location", "status", "condition", "notes", "active", "created_at", "updated_at")
    SELECT eu."id", eu."equipment_asset_id", eu."code", eu."label", eu."qr_code", eu."storage_location", eu."status", eu."condition", eu."notes", eu."active", eu."created_at", eu."updated_at"
    FROM "equipment_unit" eu
    JOIN "equipment_asset" ea ON ea."id" = eu."equipment_asset_id"
    JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
    WHERE et."classification" = 'INSTRUMENT'
    ON CONFLICT ("id") DO NOTHING;

    INSERT INTO "tool_unit" ("id", "tool_asset_id", "code", "label", "qr_code", "storage_location", "status", "condition", "notes", "active", "created_at", "updated_at")
    SELECT eu."id", eu."equipment_asset_id", eu."code", eu."label", eu."qr_code", eu."storage_location", eu."status", eu."condition", eu."notes", eu."active", eu."created_at", eu."updated_at"
    FROM "equipment_unit" eu
    JOIN "equipment_asset" ea ON ea."id" = eu."equipment_asset_id"
    JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
    WHERE et."classification" = 'TOOL'
    ON CONFLICT ("id") DO NOTHING;

    -- Condition History
    INSERT INTO "instrument_condition_history" ("id", "instrument_asset_id", "instrument_unit_id", "condition", "source", "recorded_by_id", "notes", "created_at")
    SELECT ech."id", ech."equipment_asset_id", ech."equipment_unit_id", ech."condition", ech."source", ech."recorded_by_id", ech."notes", ech."created_at"
    FROM "equipment_condition_history" ech
    JOIN "equipment_asset" ea ON ea."id" = ech."equipment_asset_id"
    JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
    WHERE et."classification" = 'INSTRUMENT'
    ON CONFLICT ("id") DO NOTHING;

    INSERT INTO "tool_condition_history" ("id", "tool_asset_id", "tool_unit_id", "condition", "source", "recorded_by_id", "notes", "created_at")
    SELECT ech."id", ech."equipment_asset_id", ech."equipment_unit_id", ech."condition", ech."source", ech."recorded_by_id", ech."notes", ech."created_at"
    FROM "equipment_condition_history" ech
    JOIN "equipment_asset" ea ON ea."id" = ech."equipment_asset_id"
    JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
    WHERE et."classification" = 'TOOL'
    ON CONFLICT ("id") DO NOTHING;

    -- Request items
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_request_item') THEN
      INSERT INTO "instrument_request_item" ("id", "request_id", "instrument_asset_id", "instrument_unit_id", "start_at", "end_at", "allow_shared_usage", "purpose", "usage_plan")
      SELECT eri."id", eri."request_id", eri."equipment_asset_id", eri."equipment_unit_id", eri."start_at", eri."end_at", false, eri."purpose", eri."usage_plan"
      FROM "equipment_request_item" eri
      JOIN "equipment_asset" ea ON ea."id" = eri."equipment_asset_id"
      JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
      WHERE et."classification" = 'INSTRUMENT'
      ON CONFLICT ("id") DO NOTHING;

      INSERT INTO "tool_request_item" ("id", "request_id", "tool_asset_id", "tool_unit_id", "start_at", "end_at", "purpose", "usage_plan")
      SELECT eri."id", eri."request_id", eri."equipment_asset_id", eri."equipment_unit_id", eri."start_at", eri."end_at", eri."purpose", eri."usage_plan"
      FROM "equipment_request_item" eri
      JOIN "equipment_asset" ea ON ea."id" = eri."equipment_asset_id"
      JOIN "equipment_type" et ON et."id" = ea."equipment_type_id"
      WHERE et."classification" = 'TOOL'
      ON CONFLICT ("id") DO NOTHING;
    END IF;
  END IF;
END $$;
--> statement-breakpoint

-- 7. Add columns and migrate reservation
ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "instrument_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "instrument_unit_id" uuid;
--> statement-breakpoint
ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "tool_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "tool_unit_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reservation' AND column_name = 'equipment_asset_id') THEN
    UPDATE "reservation" r
    SET "instrument_asset_id" = r."equipment_asset_id",
        "instrument_unit_id" = r."equipment_unit_id"
    FROM "instrument_asset" ia
    WHERE r."equipment_asset_id" = ia."id";

    UPDATE "reservation" r
    SET "tool_asset_id" = r."equipment_asset_id",
        "tool_unit_id" = r."equipment_unit_id"
    FROM "tool_asset" ta
    WHERE r."equipment_asset_id" = ta."id";

    ALTER TABLE "reservation" ALTER COLUMN "equipment_asset_id" DROP NOT NULL;
    ALTER TABLE "reservation" ALTER COLUMN "equipment_unit_id" DROP NOT NULL;
    ALTER TABLE "reservation" DROP COLUMN "equipment_asset_id";
    ALTER TABLE "reservation" DROP COLUMN "equipment_unit_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_instrument_unit_id_instrument_unit_id_fk" FOREIGN KEY ("instrument_unit_id") REFERENCES "public"."instrument_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_tool_unit_id_tool_unit_id_fk" FOREIGN KEY ("tool_unit_id") REFERENCES "public"."tool_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_instrument_unit_period_idx" ON "reservation" USING btree ("instrument_unit_id", "start_at", "end_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_tool_unit_period_idx" ON "reservation" USING btree ("tool_unit_id", "start_at", "end_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_instrument_asset_period_idx" ON "reservation" USING btree ("instrument_asset_id", "start_at", "end_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_tool_asset_period_idx" ON "reservation" USING btree ("tool_asset_id", "start_at", "end_at");
--> statement-breakpoint

-- 8. Add columns and migrate issue_transaction
ALTER TABLE "issue_transaction" ADD COLUMN IF NOT EXISTS "instrument_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD COLUMN IF NOT EXISTS "instrument_unit_id" uuid;
--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD COLUMN IF NOT EXISTS "tool_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD COLUMN IF NOT EXISTS "tool_unit_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'issue_transaction' AND column_name = 'equipment_asset_id') THEN
    UPDATE "issue_transaction" it
    SET "instrument_asset_id" = it."equipment_asset_id",
        "instrument_unit_id" = it."equipment_unit_id"
    FROM "instrument_asset" ia
    WHERE it."equipment_asset_id" = ia."id";

    UPDATE "issue_transaction" it
    SET "tool_asset_id" = it."equipment_asset_id",
        "tool_unit_id" = it."equipment_unit_id"
    FROM "tool_asset" ta
    WHERE it."equipment_asset_id" = ta."id";

    ALTER TABLE "issue_transaction" DROP COLUMN "equipment_asset_id";
    ALTER TABLE "issue_transaction" DROP COLUMN "equipment_unit_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_instrument_unit_id_instrument_unit_id_fk" FOREIGN KEY ("instrument_unit_id") REFERENCES "public"."instrument_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_tool_unit_id_tool_unit_id_fk" FOREIGN KEY ("tool_unit_id") REFERENCES "public"."tool_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_transaction_instrument_asset_idx" ON "issue_transaction" USING btree ("instrument_asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_transaction_tool_asset_idx" ON "issue_transaction" USING btree ("tool_asset_id");
--> statement-breakpoint

-- 9. Add columns and migrate return_transaction
ALTER TABLE "return_transaction" ADD COLUMN IF NOT EXISTS "instrument_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "return_transaction" ADD COLUMN IF NOT EXISTS "instrument_unit_id" uuid;
--> statement-breakpoint
ALTER TABLE "return_transaction" ADD COLUMN IF NOT EXISTS "tool_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "return_transaction" ADD COLUMN IF NOT EXISTS "tool_unit_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'return_transaction' AND column_name = 'equipment_asset_id') THEN
    UPDATE "return_transaction" rt
    SET "instrument_asset_id" = rt."equipment_asset_id"
    FROM "instrument_asset" ia
    WHERE rt."equipment_asset_id" = ia."id";

    UPDATE "return_transaction" rt
    SET "tool_asset_id" = rt."equipment_asset_id"
    FROM "tool_asset" ta
    WHERE rt."equipment_asset_id" = ta."id";

    ALTER TABLE "return_transaction" ALTER COLUMN "equipment_asset_id" DROP NOT NULL;
    ALTER TABLE "return_transaction" DROP COLUMN "equipment_asset_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_instrument_unit_id_instrument_unit_id_fk" FOREIGN KEY ("instrument_unit_id") REFERENCES "public"."instrument_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_tool_unit_id_tool_unit_id_fk" FOREIGN KEY ("tool_unit_id") REFERENCES "public"."tool_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_transaction_instrument_asset_idx" ON "return_transaction" USING btree ("instrument_asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_transaction_tool_asset_idx" ON "return_transaction" USING btree ("tool_asset_id");
--> statement-breakpoint

-- 10. Add columns and migrate incident
ALTER TABLE "incident" ADD COLUMN IF NOT EXISTS "instrument_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN IF NOT EXISTS "tool_asset_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'incident' AND column_name = 'equipment_asset_id') THEN
    UPDATE "incident" inc
    SET "instrument_asset_id" = inc."equipment_asset_id"
    FROM "instrument_asset" ia
    WHERE inc."equipment_asset_id" = ia."id";

    UPDATE "incident" inc
    SET "tool_asset_id" = inc."equipment_asset_id"
    FROM "tool_asset" ta
    WHERE inc."equipment_asset_id" = ta."id";

    ALTER TABLE "incident" DROP COLUMN "equipment_asset_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_instrument_asset_idx" ON "incident" USING btree ("instrument_asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_tool_asset_idx" ON "incident" USING btree ("tool_asset_id");
--> statement-breakpoint

-- 11. Add columns and migrate stock_opname_entry
ALTER TABLE "stock_opname_entry" ADD COLUMN IF NOT EXISTS "instrument_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN IF NOT EXISTS "instrument_unit_id" uuid;
--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN IF NOT EXISTS "tool_asset_id" uuid;
--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD COLUMN IF NOT EXISTS "tool_unit_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_opname_entry' AND column_name = 'equipment_asset_id') THEN
    UPDATE "stock_opname_entry" soe
    SET "instrument_asset_id" = soe."equipment_asset_id",
        "instrument_unit_id" = soe."equipment_unit_id"
    WHERE soe."item_type" = 'INSTRUMENT';

    UPDATE "stock_opname_entry" soe
    SET "tool_asset_id" = soe."equipment_asset_id",
        "tool_unit_id" = soe."equipment_unit_id"
    WHERE soe."item_type" = 'TOOL';

    DROP INDEX IF EXISTS "stock_opname_entry_session_asset_unique";
    DROP INDEX IF EXISTS "stock_opname_entry_session_unit_unique";
    ALTER TABLE "stock_opname_entry" DROP COLUMN "equipment_asset_id";
    ALTER TABLE "stock_opname_entry" DROP COLUMN "equipment_unit_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_instrument_asset_id_instrument_asset_id_fk" FOREIGN KEY ("instrument_asset_id") REFERENCES "public"."instrument_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_instrument_unit_id_instrument_unit_id_fk" FOREIGN KEY ("instrument_unit_id") REFERENCES "public"."instrument_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_tool_asset_id_tool_asset_id_fk" FOREIGN KEY ("tool_asset_id") REFERENCES "public"."tool_asset"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_opname_entry" ADD CONSTRAINT "stock_opname_entry_tool_unit_id_tool_unit_id_fk" FOREIGN KEY ("tool_unit_id") REFERENCES "public"."tool_unit"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_opname_entry_session_instrument_unit_unique" ON "stock_opname_entry" USING btree ("session_id", "instrument_unit_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_opname_entry_session_tool_unit_unique" ON "stock_opname_entry" USING btree ("session_id", "tool_unit_id");
--> statement-breakpoint

-- 12. Drop old equipment_* tables and enum
DROP TABLE IF EXISTS "equipment_request_item" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "equipment_condition_history" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "equipment_unit" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "equipment_asset" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "equipment_type" CASCADE;