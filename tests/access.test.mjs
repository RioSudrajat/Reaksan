import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const LAB_CODES = [
  "lab-organik",
  "lab-anorganik",
  "lab-biokimia",
  "lab-analitik",
  "lab-fisik",
];

function databaseUrl() {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  assert.ok(
    url && process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"),
    "Run npm test to create an isolated database.",
  );
  return url;
}

test("every seeded lab owns equipment and material stock", async () => {
  const db = new Pool({ connectionString: databaseUrl(), max: 1 });
  try {
    const rooms = await db.query(
      "SELECT code, active FROM room WHERE active ORDER BY code",
    );
    assert.deepEqual(
      rooms.rows.map((row) => row.code).sort(),
      [...LAB_CODES].sort(),
    );

    for (const code of LAB_CODES) {
      const assets = await db.query(
        `SELECT count(*)::int AS count
         FROM equipment_asset a
         JOIN room r ON r.id = a.room_id
         WHERE r.code = $1 AND a.active`,
        [code],
      );
      assert.ok(assets.rows[0].count > 0, `${code} needs equipment assets`);

      const batches = await db.query(
        `SELECT count(*)::int AS count
         FROM material_batch b
         JOIN room r ON r.id = b.room_id
         WHERE r.code = $1 AND b.active`,
        [code],
      );
      assert.ok(batches.rows[0].count > 0, `${code} needs material batches`);
    }

    // A material can live in several labs with separate stock, which is the
    // core of the per-lab storage model.
    const shared = await db.query(
      `SELECT count(DISTINCT r.code)::int AS count
       FROM material_batch b
       JOIN material m ON m.id = b.material_id
       JOIN room r ON r.id = b.room_id
       WHERE m.code = 'MAT-041' AND b.active`,
    );
    assert.ok(shared.rows[0].count >= 2, "ethanol should be stocked per lab");

    const missingArt = await db.query(
      `SELECT
        (SELECT count(*)::int FROM equipment_type WHERE image_media_id IS NULL) AS types,
        (SELECT count(*)::int FROM material WHERE image_media_id IS NULL) AS materials`,
    );
    assert.equal(missingArt.rows[0].types, 0);
    assert.equal(missingArt.rows[0].materials, 0);

    // Seeded artwork has no uploader, so the column must accept NULL.
    const media = await db.query(
      `INSERT INTO media (storage_provider, storage_key, file_name, mime_type, size_bytes, uploaded_by_id)
       VALUES ('local', 'seed/test-null-uploader.svg', 'test.svg', 'image/svg+xml', 1, NULL)
       RETURNING id`,
    );
    assert.ok(media.rows[0].id);
    await db.query("DELETE FROM media WHERE id = $1", [media.rows[0].id]);
  } finally {
    await db.end();
  }
});

test("app_role stores editable permission maps per role", async () => {
  const db = new Pool({ connectionString: databaseUrl(), max: 1 });
  try {
    const permissions = { requests: ["read-any"], inventory: ["read-any"] };
    await db.query(
      `INSERT INTO app_role (name, permissions) VALUES ('plp_custom', $1)
       ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions`,
      [permissions],
    );
    const stored = await db.query(
      "SELECT permissions FROM app_role WHERE name = 'plp_custom'",
    );
    assert.deepEqual(stored.rows[0].permissions, permissions);
    await db.query("DELETE FROM app_role WHERE name = 'plp_custom'");
  } finally {
    await db.end();
  }
});
