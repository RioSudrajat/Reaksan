-- 1. Ensure CAIR and PADAT exist and have clean names
INSERT INTO "waste_category" ("code", "name", "physical_state", "description", "hazard_badge", "color_hex", "active")
VALUES
  ('CAIR', 'Limbah Cair', 'LIQUID', 'Limbah kimia dan larutan cair B3.', 'B3 CAIR', '#0284c7', true),
  ('PADAT', 'Limbah Padat', 'SOLID', 'Limbah padatan, residu kristal, dan material terkontaminasi B3.', 'B3 PADAT', '#e11d48', true)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "physical_state" = EXCLUDED."physical_state",
  "description" = EXCLUDED."description",
  "hazard_badge" = EXCLUDED."hazard_badge",
  "color_hex" = EXCLUDED."color_hex",
  "active" = true,
  "updated_at" = now();

-- 2. Migrate existing containers pointing to other categories to CAIR or PADAT based on physical_state
UPDATE "waste_container"
SET "category_id" = (SELECT id FROM "waste_category" WHERE "code" = 'CAIR' LIMIT 1)
WHERE "category_id" IN (
  SELECT id FROM "waste_category" WHERE "physical_state" = 'LIQUID' AND "code" != 'CAIR'
);

UPDATE "waste_container"
SET "category_id" = (SELECT id FROM "waste_category" WHERE "code" = 'PADAT' LIMIT 1)
WHERE "category_id" IN (
  SELECT id FROM "waste_category" WHERE "physical_state" = 'SOLID' AND "code" != 'PADAT'
);

-- 3. Deactivate all categories except CAIR and PADAT so only CAIR and PADAT appear in queries & dropdowns
UPDATE "waste_category"
SET "active" = false, "updated_at" = now()
WHERE "code" NOT IN ('CAIR', 'PADAT');
