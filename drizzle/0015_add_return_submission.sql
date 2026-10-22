ALTER TABLE "resource_request" ADD COLUMN IF NOT EXISTS "return_submission" jsonb;
--> statement-breakpoint
ALTER TABLE "resource_request" ADD COLUMN IF NOT EXISTS "return_submitted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "resource_request" ADD COLUMN IF NOT EXISTS "return_confirmed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "resource_request" ADD COLUMN IF NOT EXISTS "return_confirmed_by_id" text;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resource_request_return_confirmed_by_id_user_id_fk'
  ) THEN
    ALTER TABLE "resource_request" ADD CONSTRAINT "resource_request_return_confirmed_by_id_user_id_fk" FOREIGN KEY ("return_confirmed_by_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "resource_request" ADD COLUMN IF NOT EXISTS "return_rejection_reason" text;
