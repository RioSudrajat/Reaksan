CREATE TYPE "public"."activity_status" AS ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('THESIS_RESEARCH', 'PRACTICUM', 'COURSE_PROJECT', 'GENERAL_RESEARCH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_REVISION', 'CANCEL', 'RESERVE', 'RELEASE', 'ISSUE', 'RETURN', 'INSPECT', 'REPORT_INCIDENT', 'ASSESS_INCIDENT', 'RESOLVE_INCIDENT', 'ADJUST_STOCK');--> statement-breakpoint
CREATE TYPE "public"."equipment_condition" AS ENUM('GOOD', 'MINOR_ISSUE', 'DAMAGED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'DAMAGED', 'UNDER_INSPECTION', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."equipment_usage_type" AS ENUM('BORROWABLE', 'USAGE_ONLY');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('REPORTED', 'UNDER_ASSESSMENT', 'IN_MAINTENANCE', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_REVISION', 'REQUEST_CANCELLED', 'SHARED_USAGE_REQUESTED', 'SHARED_USAGE_ACCEPTED', 'SHARED_USAGE_DECLINED', 'EQUIPMENT_ISSUED', 'EQUIPMENT_RETURNED', 'INCIDENT_REPORTED', 'INCIDENT_UPDATED', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('DRAFT', 'SUBMITTED', 'PENDING_PLP', 'REQUEST_REVISION', 'APPROVED', 'REJECTED', 'READY_FOR_PICKUP', 'ACTIVE', 'RETURNED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."shared_usage_request_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."stock_transaction_type" AS ENUM('RECEIVE', 'RESERVE', 'RELEASE', 'ISSUE', 'ADJUST', 'EXPIRE', 'TRANSFER');--> statement-breakpoint
CREATE TABLE "laboratory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "laboratory_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"laboratory_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"floor" text,
	"tone" text DEFAULT 'cream' NOT NULL,
	"map_position" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_laboratory_code_unique" UNIQUE("laboratory_id","code")
);
--> statement-breakpoint
CREATE TABLE "equipment_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_type_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"asset_code" text NOT NULL,
	"serial_number" text,
	"status" "equipment_status" DEFAULT 'AVAILABLE' NOT NULL,
	"condition" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
	"acquisition_date" timestamp with time zone,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_asset_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "equipment_condition_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_asset_id" uuid NOT NULL,
	"equipment_unit_id" uuid,
	"condition" "equipment_condition" NOT NULL,
	"source" text NOT NULL,
	"recorded_by_id" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"usage_type" "equipment_usage_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_asset_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"status" "equipment_status" DEFAULT 'AVAILABLE' NOT NULL,
	"condition" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_unit_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"base_unit" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "material_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"lot_number" text,
	"quantity" numeric(14, 3) NOT NULL,
	"expiry_date" timestamp with time zone,
	"received_date" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_dispensing_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"minimum_quantity" numeric(14, 3) NOT NULL,
	"dispensing_increment" numeric(14, 3) NOT NULL,
	"maximum_quantity" numeric(14, 3) NOT NULL,
	"unit" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_dispensing_rule_material_id_unique" UNIQUE("material_id")
);
--> statement-breakpoint
CREATE TABLE "stock_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_batch_id" uuid NOT NULL,
	"type" "stock_transaction_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"before_quantity" numeric(14, 3) NOT NULL,
	"after_quantity" numeric(14, 3) NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"performed_by_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"supervisor_id" text,
	"title" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"description" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" "activity_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_request_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"equipment_asset_id" uuid NOT NULL,
	"equipment_unit_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"purpose" text,
	"usage_plan" jsonb
);
--> statement-breakpoint
CREATE TABLE "material_request_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"allocated_batch_id" uuid,
	"requested_quantity" numeric(14, 3) NOT NULL,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"activity_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"room_id" uuid NOT NULL,
	"supervisor_name" text DEFAULT '' NOT NULL,
	"field_pic_name" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"purpose" text NOT NULL,
	"description" text,
	"mode" text DEFAULT 'BORROW' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"practical_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "request_status" DEFAULT 'DRAFT' NOT NULL,
	"revision_note" text,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_request_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_asset_id" uuid NOT NULL,
	"equipment_unit_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"primary_user_id" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'RESERVED' NOT NULL,
	"purpose" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"shared_usage_request_id" uuid,
	"user_id" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"purpose" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_usage_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"requester_id" text NOT NULL,
	"requested_start_at" timestamp with time zone NOT NULL,
	"requested_end_at" timestamp with time zone NOT NULL,
	"purpose" text,
	"status" "shared_usage_request_status" DEFAULT 'PENDING' NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"equipment_asset_id" uuid,
	"material_batch_id" uuid,
	"issued_to_id" text NOT NULL,
	"quantity" numeric(14, 3),
	"issued_by_id" text NOT NULL,
	"condition_at_issue" "equipment_condition",
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_transaction_id" uuid NOT NULL,
	"equipment_asset_id" uuid NOT NULL,
	"returned_by_id" text NOT NULL,
	"received_by_id" text NOT NULL,
	"condition_at_return" "equipment_condition" NOT NULL,
	"notes" text,
	"returned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_transaction_issue_transaction_id_unique" UNIQUE("issue_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "incident" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"equipment_asset_id" uuid,
	"room_id" uuid,
	"request_id" uuid,
	"reservation_id" uuid,
	"activity_id" uuid,
	"reporter_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" "incident_severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "incident_status" DEFAULT 'REPORTED' NOT NULL,
	"occurred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "incident_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"assessed_by_id" text NOT NULL,
	"finding" text NOT NULL,
	"assessment" text NOT NULL,
	"recommended_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_assessment_incident_id_unique" UNIQUE("incident_id")
);
--> statement-breakpoint
CREATE TABLE "incident_resolution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"resolved_by_id" text NOT NULL,
	"action" text NOT NULL,
	"resolution_notes" text,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_resolution_incident_id_unique" UNIQUE("incident_id")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_laboratory_id_laboratory_id_fk" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_asset" ADD CONSTRAINT "equipment_asset_equipment_type_id_equipment_type_id_fk" FOREIGN KEY ("equipment_type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_asset" ADD CONSTRAINT "equipment_asset_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_condition_history" ADD CONSTRAINT "equipment_condition_history_equipment_asset_id_equipment_asset_id_fk" FOREIGN KEY ("equipment_asset_id") REFERENCES "public"."equipment_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_condition_history" ADD CONSTRAINT "equipment_condition_history_equipment_unit_id_equipment_unit_id_fk" FOREIGN KEY ("equipment_unit_id") REFERENCES "public"."equipment_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_condition_history" ADD CONSTRAINT "equipment_condition_history_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_unit" ADD CONSTRAINT "equipment_unit_equipment_asset_id_equipment_asset_id_fk" FOREIGN KEY ("equipment_asset_id") REFERENCES "public"."equipment_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_batch" ADD CONSTRAINT "material_batch_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_batch" ADD CONSTRAINT "material_batch_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_dispensing_rule" ADD CONSTRAINT "material_dispensing_rule_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_material_batch_id_material_batch_id_fk" FOREIGN KEY ("material_batch_id") REFERENCES "public"."material_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_supervisor_id_user_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_request_item" ADD CONSTRAINT "equipment_request_item_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_request_item" ADD CONSTRAINT "equipment_request_item_equipment_asset_id_equipment_asset_id_fk" FOREIGN KEY ("equipment_asset_id") REFERENCES "public"."equipment_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_request_item" ADD CONSTRAINT "equipment_request_item_equipment_unit_id_equipment_unit_id_fk" FOREIGN KEY ("equipment_unit_id") REFERENCES "public"."equipment_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_item" ADD CONSTRAINT "material_request_item_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_item" ADD CONSTRAINT "material_request_item_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_item" ADD CONSTRAINT "material_request_item_allocated_batch_id_material_batch_id_fk" FOREIGN KEY ("allocated_batch_id") REFERENCES "public"."material_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_request" ADD CONSTRAINT "resource_request_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_request" ADD CONSTRAINT "resource_request_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_request" ADD CONSTRAINT "resource_request_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_equipment_asset_id_equipment_asset_id_fk" FOREIGN KEY ("equipment_asset_id") REFERENCES "public"."equipment_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_equipment_unit_id_equipment_unit_id_fk" FOREIGN KEY ("equipment_unit_id") REFERENCES "public"."equipment_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_primary_user_id_user_id_fk" FOREIGN KEY ("primary_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_usage" ADD CONSTRAINT "shared_usage_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_usage" ADD CONSTRAINT "shared_usage_shared_usage_request_id_shared_usage_request_id_fk" FOREIGN KEY ("shared_usage_request_id") REFERENCES "public"."shared_usage_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_usage" ADD CONSTRAINT "shared_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_usage_request" ADD CONSTRAINT "shared_usage_request_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_usage_request" ADD CONSTRAINT "shared_usage_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_equipment_asset_id_equipment_asset_id_fk" FOREIGN KEY ("equipment_asset_id") REFERENCES "public"."equipment_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_material_batch_id_material_batch_id_fk" FOREIGN KEY ("material_batch_id") REFERENCES "public"."material_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_issued_to_id_user_id_fk" FOREIGN KEY ("issued_to_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_transaction" ADD CONSTRAINT "issue_transaction_issued_by_id_user_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_issue_transaction_id_issue_transaction_id_fk" FOREIGN KEY ("issue_transaction_id") REFERENCES "public"."issue_transaction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_equipment_asset_id_equipment_asset_id_fk" FOREIGN KEY ("equipment_asset_id") REFERENCES "public"."equipment_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_returned_by_id_user_id_fk" FOREIGN KEY ("returned_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_received_by_id_user_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_equipment_asset_id_equipment_asset_id_fk" FOREIGN KEY ("equipment_asset_id") REFERENCES "public"."equipment_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_request_id_resource_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_assessment" ADD CONSTRAINT "incident_assessment_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_assessment" ADD CONSTRAINT "incident_assessment_assessed_by_id_user_id_fk" FOREIGN KEY ("assessed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_resolution" ADD CONSTRAINT "incident_resolution_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_resolution" ADD CONSTRAINT "incident_resolution_resolved_by_id_user_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_laboratory_idx" ON "room" USING btree ("laboratory_id");--> statement-breakpoint
CREATE INDEX "equipment_asset_type_idx" ON "equipment_asset" USING btree ("equipment_type_id");--> statement-breakpoint
CREATE INDEX "equipment_asset_room_idx" ON "equipment_asset" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "equipment_asset_status_idx" ON "equipment_asset" USING btree ("status");--> statement-breakpoint
CREATE INDEX "equipment_asset_room_status_idx" ON "equipment_asset" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "equipment_condition_history_asset_created_idx" ON "equipment_condition_history" USING btree ("equipment_asset_id","created_at");--> statement-breakpoint
CREATE INDEX "equipment_type_category_idx" ON "equipment_type" USING btree ("category");--> statement-breakpoint
CREATE INDEX "equipment_unit_asset_idx" ON "equipment_unit" USING btree ("equipment_asset_id");--> statement-breakpoint
CREATE INDEX "equipment_unit_status_idx" ON "equipment_unit" USING btree ("status");--> statement-breakpoint
CREATE INDEX "material_name_idx" ON "material" USING btree ("name");--> statement-breakpoint
CREATE INDEX "material_category_idx" ON "material" USING btree ("category");--> statement-breakpoint
CREATE INDEX "material_batch_material_idx" ON "material_batch" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_batch_room_idx" ON "material_batch" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "material_batch_expiry_idx" ON "material_batch" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "material_batch_material_expiry_idx" ON "material_batch" USING btree ("material_id","expiry_date");--> statement-breakpoint
CREATE INDEX "stock_transaction_batch_created_idx" ON "stock_transaction" USING btree ("material_batch_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_transaction_reference_idx" ON "stock_transaction" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "activity_student_idx" ON "activity" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "activity_supervisor_idx" ON "activity" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "activity_status_idx" ON "activity" USING btree ("status");--> statement-breakpoint
CREATE INDEX "activity_period_idx" ON "activity" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "equipment_request_item_request_idx" ON "equipment_request_item" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "equipment_request_item_unit_period_idx" ON "equipment_request_item" USING btree ("equipment_unit_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX "material_request_item_request_idx" ON "material_request_item" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "material_request_item_material_idx" ON "material_request_item" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "resource_request_student_idx" ON "resource_request" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "resource_request_activity_idx" ON "resource_request" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "resource_request_room_idx" ON "resource_request" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "resource_request_status_idx" ON "resource_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resource_request_period_idx" ON "resource_request" USING btree ("start_at","end_at");--> statement-breakpoint
CREATE INDEX "reservation_unit_period_idx" ON "reservation" USING btree ("equipment_unit_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX "reservation_asset_period_idx" ON "reservation" USING btree ("equipment_asset_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX "reservation_primary_user_idx" ON "reservation" USING btree ("primary_user_id");--> statement-breakpoint
CREATE INDEX "reservation_request_idx" ON "reservation" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "reservation_status_idx" ON "reservation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shared_usage_reservation_period_idx" ON "shared_usage" USING btree ("reservation_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX "shared_usage_user_idx" ON "shared_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shared_usage_request_reservation_idx" ON "shared_usage_request" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "shared_usage_request_requester_idx" ON "shared_usage_request" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "shared_usage_request_status_idx" ON "shared_usage_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issue_transaction_request_idx" ON "issue_transaction" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "issue_transaction_asset_idx" ON "issue_transaction" USING btree ("equipment_asset_id");--> statement-breakpoint
CREATE INDEX "issue_transaction_batch_idx" ON "issue_transaction" USING btree ("material_batch_id");--> statement-breakpoint
CREATE INDEX "issue_transaction_recipient_idx" ON "issue_transaction" USING btree ("issued_to_id");--> statement-breakpoint
CREATE INDEX "return_transaction_asset_idx" ON "return_transaction" USING btree ("equipment_asset_id");--> statement-breakpoint
CREATE INDEX "incident_asset_idx" ON "incident" USING btree ("equipment_asset_id");--> statement-breakpoint
CREATE INDEX "incident_room_idx" ON "incident" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "incident_request_idx" ON "incident" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "incident_reservation_idx" ON "incident" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "incident_reporter_idx" ON "incident" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "incident_status_idx" ON "incident" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_recipient_read_idx" ON "notification" USING btree ("recipient_id","read_at");--> statement-breakpoint
CREATE INDEX "notification_recipient_created_idx" ON "notification" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");