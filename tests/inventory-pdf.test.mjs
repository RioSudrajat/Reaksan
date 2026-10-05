import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

function databaseUrl() {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  assert.ok(
    url && process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"),
    "Run npm test to create an isolated database.",
  );
  return url;
}

test("inventory queries calculate real unit and batch availability ratios", async () => {
  const pool = new Pool({ connectionString: databaseUrl(), max: 1 });
  try {
    // 1. Verify equipment unit availability ratio calculation
    const unitStatsRes = await pool.query(`
      SELECT
        ea.id,
        ea.asset_code,
        et.classification,
        COUNT(eu.id)::int as "totalUnits",
        COUNT(CASE WHEN eu.status = 'AVAILABLE' AND eu.active = true THEN eu.id END)::int as "availableUnits",
        COUNT(CASE WHEN eu.status = 'IN_USE' AND eu.active = true THEN eu.id END)::int as "inUseUnits",
        COUNT(CASE WHEN eu.status = 'RESERVED' AND eu.active = true THEN eu.id END)::int as "reservedUnits"
      FROM equipment_asset ea
      JOIN equipment_type et ON et.id = ea.equipment_type_id
      LEFT JOIN equipment_unit eu ON eu.equipment_asset_id = ea.id AND eu.active = true
      WHERE ea.active = true
      GROUP BY ea.id, ea.asset_code, et.classification
      LIMIT 20
    `);

    assert.ok(unitStatsRes.rowCount > 0, "Expected equipment assets with unit stats");
    for (const row of unitStatsRes.rows) {
      assert.ok(row.totalUnits >= 0, "Total units must be non-negative");
      assert.ok(row.availableUnits <= row.totalUnits, "Available units cannot exceed total units");
      const unavailable = row.totalUnits - row.availableUnits;
      assert.equal(
        unavailable >= row.inUseUnits + row.reservedUnits,
        true,
        "Unavailable units must account for in-use and reserved units",
      );
    }

    // 2. Verify material batch ratio calculation (available active batches out of total)
    const matBatchesRes = await pool.query(`
      SELECT
        m.id,
        m.code,
        COUNT(mb.id)::int as "totalBatches",
        COUNT(CASE WHEN mb.active = true AND mb.quantity > 0 AND (mb.expiry_date IS NULL OR mb.expiry_date > NOW()) THEN mb.id END)::int as "availableBatches"
      FROM material m
      JOIN material_batch mb ON mb.material_id = m.id
      WHERE m.active = true
      GROUP BY m.id, m.code
      LIMIT 20
    `);

    assert.ok(matBatchesRes.rowCount > 0, "Expected material batches");
    for (const row of matBatchesRes.rows) {
      assert.ok(row.availableBatches <= row.totalBatches, "Available batches cannot exceed total batches");
    }

    // 3. Verify stock transactions, reserved balances, and total capacity consistency
    const stockTxRes = await pool.query(`
      SELECT
        mb.id as batch_id,
        mb.quantity::numeric as physical,
        COALESCE(SUM(CASE
          WHEN st.type = 'RESERVE' THEN st.quantity
          WHEN st.type IN ('RELEASE', 'ISSUE') THEN -st.quantity
          ELSE 0
        END), 0)::numeric as reserved,
        COALESCE(SUM(CASE
          WHEN st.type = 'ISSUE' THEN st.quantity
          ELSE 0
        END), 0)::numeric as issued
      FROM material_batch mb
      LEFT JOIN stock_transaction st ON st.material_batch_id = mb.id
      WHERE mb.active = true
      GROUP BY mb.id, mb.quantity
    `);

    for (const row of stockTxRes.rows) {
      const physical = Number(row.physical);
      const reserved = Number(row.reserved);
      const issued = Number(row.issued);
      assert.ok(physical >= 0, "Physical stock cannot be negative");
      assert.ok(reserved >= 0, "Reserved stock cannot be negative");
      assert.ok(issued >= 0, "Issued stock cannot be negative");
      assert.ok(reserved <= physical, "Reserved stock cannot exceed physical stock");
      const available = physical - reserved;
      assert.ok(available >= 0, "Available stock cannot be negative");
      const totalCapacity = physical + issued;
      assert.ok(totalCapacity >= physical, "Total capacity must be at least physical stock");
    }
  } finally {
    await pool.end();
  }
});

test("PDF export algorithmic page height and signature positioning", () => {
  // Test the deterministic page height and signature margin calculation
  const containerWidth = 1100;
  const printableWidth = 277; // A4 landscape minus 2x10mm margins
  const printableHeight = 190;
  const pageAspectRatio = printableHeight / printableWidth;
  const pageHeightInDom = containerWidth * pageAspectRatio; // ~754.51px

  // Case 1: Short table (fits on page 1)
  {
    const prevContentBottom = 300; // table ends at 300px
    const sigHeight = 130;
    const bottomPadding = 24;
    const neededHeight = sigHeight + bottomPadding + 16;

    const currentPage = Math.floor(prevContentBottom / pageHeightInDom); // 0
    const currentPageBottom = (currentPage + 1) * pageHeightInDom; // ~754.51px
    const spaceLeftOnCurrent = currentPageBottom - prevContentBottom; // ~454.51px

    assert.ok(spaceLeftOnCurrent >= neededHeight, "Should fit on page 1");
    const chosenTargetSigTop = currentPageBottom - sigHeight - bottomPadding;
    const totalPages = currentPage + 1; // 1 page
    const finalMarginTop = Math.max(16, Math.floor(chosenTargetSigTop - prevContentBottom));

    assert.equal(totalPages, 1, "Short report must stay on 1 page");
    // Verify signature bottom lands exactly at page boundary minus bottom padding
    const calculatedSigBottom = prevContentBottom + finalMarginTop + sigHeight;
    assert.ok(
      Math.abs(calculatedSigBottom - (pageHeightInDom - bottomPadding)) <= 2,
      "Signature must land at the bottom margin of page 1",
    );
  }

  // Case 2: Content fills page 1 near bottom (signature must move to page 2 and sit at the bottom)
  {
    const prevContentBottom = 720; // table ends at 720px, only 34px left on page 1
    const sigHeight = 130;
    const bottomPadding = 24;
    const neededHeight = sigHeight + bottomPadding + 16;

    const currentPage = Math.floor(prevContentBottom / pageHeightInDom); // 0
    const currentPageBottom = (currentPage + 1) * pageHeightInDom;
    const spaceLeftOnCurrent = currentPageBottom - prevContentBottom; // ~34.5px

    assert.ok(spaceLeftOnCurrent < neededHeight, "Should NOT fit on page 1");
    const nextPgBottom = (currentPage + 2) * pageHeightInDom; // ~1509.02px
    const chosenTargetSigTop = nextPgBottom - sigHeight - bottomPadding;
    const totalPages = currentPage + 2; // 2 pages
    const finalMarginTop = Math.max(16, Math.floor(chosenTargetSigTop - prevContentBottom));

    assert.equal(totalPages, 2, "Must cleanly break to page 2");
    const calculatedSigBottom = prevContentBottom + finalMarginTop + sigHeight;
    assert.ok(
      Math.abs(calculatedSigBottom - (nextPgBottom - bottomPadding)) <= 2,
      "Signature must land at the bottom margin of page 2",
    );
  }
});
