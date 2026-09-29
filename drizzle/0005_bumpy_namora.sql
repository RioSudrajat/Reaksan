ALTER TYPE "public"."audit_action" ADD VALUE 'PREPARE' BEFORE 'ISSUE';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'COMPLETE' BEFORE 'INSPECT';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'REQUEST_READY' BEFORE 'REQUEST_CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'REQUEST_COMPLETED' BEFORE 'REQUEST_CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'REQUEST_OVERDUE' BEFORE 'REQUEST_CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'REQUEST_REMINDER' BEFORE 'REQUEST_CANCELLED';--> statement-breakpoint
CREATE TABLE "assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text NOT NULL,
	"assignment_type" text NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_setting" ADD CONSTRAINT "app_setting_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_user_idx" ON "assignment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assignment_scope_idx" ON "assignment" USING btree ("scope_type","scope_id");