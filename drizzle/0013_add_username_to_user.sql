ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "display_username" text;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_username_unique'
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");
  END IF;
END $$;
--> statement-breakpoint
-- Ensure existing demo accounts in production have proper NIM / NIP usernames
UPDATE "user" SET "username" = 'admin' WHERE "email" = 'admin@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '198503152010121001' WHERE "email" = 'plp@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '198706202014041002' WHERE "email" = 'plp.organik@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '198811102015031003' WHERE "email" = 'plp.anorganik@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '198904052016022001' WHERE "email" = 'plp.biokimia@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '199008122018011002' WHERE "email" = 'plp.analitik@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '199105222019031001' WHERE "email" = 'plp.fisik@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '140310210001' WHERE "email" = 'student1@reaksan.local';
--> statement-breakpoint
UPDATE "user" SET "username" = '140310210002' WHERE "email" = 'student2@reaksan.local';
--> statement-breakpoint
-- Backfill any other existing users that don't have a username yet
UPDATE "user" 
SET "username" = split_part("email", '@', 1) 
WHERE "username" IS NULL 
  AND NOT EXISTS (SELECT 1 FROM "user" u2 WHERE u2."username" = split_part("user"."email", '@', 1));
