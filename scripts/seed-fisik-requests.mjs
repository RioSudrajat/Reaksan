import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl } from "./postgres.mjs";

await loadEnvironment();
const pool = new Pool({
  connectionString: databaseUrl(),
  max: 1,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get Room Lab Fisik
    const roomRes = await client.query("SELECT id, code, name FROM room WHERE code = 'lab-fisik'");
    if (roomRes.rowCount === 0) throw new Error("Room lab-fisik tidak ditemukan.");
    const roomId = roomRes.rows[0].id;

    // 2. Get Students and PLP
    const s1Res = await client.query("SELECT id, name FROM \"user\" WHERE email = 'student1@reaksan.local'");
    const s2Res = await client.query("SELECT id, name FROM \"user\" WHERE email = 'student2@reaksan.local'");
    const plpRes = await client.query("SELECT id, name FROM \"user\" WHERE email = 'plp.fisik@reaksan.local' OR email = 'plp@reaksan.local' ORDER BY email DESC");

    if (s1Res.rowCount === 0 || s2Res.rowCount === 0) throw new Error("Akun student belum lengkap.");
    const s1 = s1Res.rows[0];
    const s2 = s2Res.rows[0];
    const plp = plpRes.rows[0];

    // Ensure activities exist for both students
    async function ensureActivity(studentId, title) {
      const act = await client.query("SELECT id FROM activity WHERE student_id = $1 LIMIT 1", [studentId]);
      if (act.rowCount > 0) return act.rows[0].id;
      const newId = randomUUID();
      await client.query(`
        INSERT INTO activity (id, student_id, title, type, start_date, end_date, status)
        VALUES ($1, $2, $3, 'THESIS_RESEARCH', '2026-09-01T00:00:00Z', '2027-01-31T23:59:59Z', 'ACTIVE')
      `, [newId, studentId, title]);
      return newId;
    }

    const s1ActivityId = await ensureActivity(s1.id, "Penelitian Karakterisasi Material Maju (Mahasiswa Satu)");
    const s2ActivityId = await ensureActivity(s2.id, "Penelitian Termodinamika & Fluida (Mahasiswa Dua)");

    // 3. Lookup units and materials in lab-fisik
    const unitsRes = await client.query(`
      SELECT eu.id as unit_id, eu.code as unit_code, eu.label as unit_label,
             ea.id as asset_id, ea.asset_code, et.name as asset_name, et.classification
      FROM equipment_unit eu
      JOIN equipment_asset ea ON ea.id = eu.equipment_asset_id
      JOIN equipment_type et ON et.id = ea.equipment_type_id
      JOIN room rm ON rm.id = ea.room_id
      WHERE rm.code = 'lab-fisik'
    `);
    const unitsMap = new Map();
    for (const u of unitsRes.rows) {
      unitsMap.set(u.unit_code, u);
    }

    const materialsRes = await client.query(`
      SELECT mb.id as batch_id, mb.lot_number, mb.quantity, m.id as material_id, m.code as material_code, m.name as material_name, m.base_unit
      FROM material_batch mb
      JOIN material m ON m.id = mb.material_id
      JOIN room rm ON rm.id = mb.room_id
      WHERE rm.code = 'lab-fisik'
    `);
    const materialsMap = new Map();
    for (const m of materialsRes.rows) {
      materialsMap.set(m.material_code, m);
    }

    // Reset base physical quantities for Lab Fisik batches before applying request deductions
    const BASE_BATCH_QUANTITIES = [
      { code: "MAT-033", baseQty: 14100 }, // 15000 - 300 (REQ-002) - 600 (REQ-004)
      { code: "MAT-061", baseQty: 3000 },
      { code: "MAT-064", baseQty: 1200 },
      { code: "MAT-065", baseQty: 1000 },
      { code: "MAT-066", baseQty: 3000 },
      { code: "MAT-067", baseQty: 2500 },
      { code: "MAT-068", baseQty: 2000 },
    ];
    for (const b of BASE_BATCH_QUANTITIES) {
      await client.query(`
        UPDATE material_batch mb
        SET quantity = $1
        FROM material m, room rm
        WHERE mb.material_id = m.id AND mb.room_id = rm.id
          AND rm.code = 'lab-fisik' AND m.code = $2
      `, [b.baseQty, b.code]);
      const mEntry = materialsMap.get(b.code);
      if (mEntry) mEntry.quantity = b.baseQty;
    }

    // 4. Define 10 Diverse Requests
    const REQUEST_SEEDS = [
      {
        code: "REQ-2026-FIS-01",
        title: "Karakterisasi Densitas Larutan Polimer Organik",
        purpose: "Pengukuran viskositas kinematik dan densitas larutan polimer pada variasi suhu.",
        student: s1,
        activityId: s1ActivityId,
        status: "OVERDUE",
        startAt: "2026-09-28T08:00:00+07:00",
        endAt: "2026-09-30T16:00:00+07:00",
        submittedAt: "2026-09-25T09:00:00+07:00",
        approvedAt: "2026-09-26T10:00:00+07:00",
        units: ["VIS-001-01", "PKN-FIS-01-01"],
        material: { code: "MAT-064", qty: 50 }, // Minyak kalibrasi viscometer
        unitStatus: "IN_USE",
        issued: true,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-02",
        title: "Pengukuran Kalor Jenis Logam Campuran Kuningan",
        purpose: "Eksperimen azas Black dan kalorimetri termal logam konduktor.",
        student: s2,
        activityId: s2ActivityId,
        status: "COMPLETED",
        startAt: "2026-09-29T09:00:00+07:00",
        endAt: "2026-10-01T15:00:00+07:00",
        submittedAt: "2026-09-26T11:00:00+07:00",
        approvedAt: "2026-09-27T08:30:00+07:00",
        completedAt: "2026-10-01T15:30:00+07:00",
        units: ["KLR-FIS-01-01", "TRM-FIS-01-01"],
        material: { code: "MAT-033", qty: 500 }, // Distilled water
        unitStatus: "AVAILABLE",
        issued: true,
        returned: true,
      },
      {
        code: "REQ-2026-FIS-03",
        title: "Termogravimetri & Pengeringan Nanokomposit Silika",
        purpose: "Desikasi termal dan penghilangan kadar air higroskopis kristal silika.",
        student: s1,
        activityId: s1ActivityId,
        status: "COMPLETED",
        startAt: "2026-10-01T08:00:00+07:00",
        endAt: "2026-10-03T14:00:00+07:00",
        submittedAt: "2026-09-28T14:00:00+07:00",
        approvedAt: "2026-09-29T09:00:00+07:00",
        completedAt: "2026-10-03T14:30:00+07:00",
        units: ["OVM-001-01", "ERL-FIS-01-01", "SPT-FIS-01-01"],
        material: { code: "MAT-061", qty: 100 }, // Silica gel
        unitStatus: "AVAILABLE",
        issued: true,
        returned: true,
      },
      {
        code: "REQ-2026-FIS-04",
        title: "Uji Viskositas Fluida Non-Newtonian Gliserol",
        purpose: "Penentuan profil shear rate dan reologi campuran gliserol terkonsentrasi.",
        student: s2,
        activityId: s2ActivityId,
        status: "ACTIVE",
        startAt: "2026-10-03T10:00:00+07:00",
        endAt: "2026-10-05T16:00:00+07:00",
        submittedAt: "2026-10-01T10:00:00+07:00",
        approvedAt: "2026-10-02T13:00:00+07:00",
        units: ["VIS-001-02", "VOS-FIS-01-01", "BKG-FIS-01-01"],
        material: { code: "MAT-066", qty: 250 }, // Gliserol 99%
        unitStatus: "IN_USE",
        issued: true,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-05",
        title: "Sintesis Hidrotermal dengan Pemanasan Suhu Konstan",
        purpose: "Preparasi prekursor material oksida pada bath minyak parafin terkontrol.",
        student: s1,
        activityId: s1ActivityId,
        status: "READY_FOR_PICKUP",
        startAt: "2026-10-04T13:00:00+07:00",
        endAt: "2026-10-06T17:00:00+07:00",
        submittedAt: "2026-10-02T08:00:00+07:00",
        approvedAt: "2026-10-03T11:00:00+07:00",
        units: ["HPS-002-02", "BKG-FIS-01-02", "SPT-FIS-01-02"],
        material: { code: "MAT-068", qty: 200 }, // Minyak parafin cair
        unitStatus: "RESERVED",
        issued: false,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-06",
        title: "Studi Termoregulasi & Kalibrasi Sensor Suhu Campuran Biner",
        purpose: "Sirkulasi fluida pendingin suhu presisi menggunakan Bath Thermostat System.",
        student: s2,
        activityId: s2ActivityId,
        status: "APPROVED",
        startAt: "2026-10-07T08:30:00+07:00",
        endAt: "2026-10-09T16:30:00+07:00",
        submittedAt: "2026-10-03T13:00:00+07:00",
        approvedAt: "2026-10-04T08:00:00+07:00",
        units: ["BTS-001-01", "TRM-FIS-01-02"],
        material: { code: "MAT-033", qty: 1000 }, // Distilled water
        unitStatus: "RESERVED",
        issued: false,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-07",
        title: "Kinetika Pelarutan Kristal Sukrosa pada Pengadukan Cepat",
        purpose: "Pengukuran laju disolusi sukrosa murni dengan variasi kecepatan RPM pengaduk.",
        student: s1,
        activityId: s1ActivityId,
        status: "PENDING_PLP",
        startAt: "2026-10-10T09:00:00+07:00",
        endAt: "2026-10-12T15:00:00+07:00",
        submittedAt: "2026-10-03T15:00:00+07:00",
        units: ["STJ-001-01", "BKG-FIS-01-03"],
        material: { code: "MAT-067", qty: 150 }, // Sukrosa kristal
        unitStatus: "AVAILABLE",
        issued: false,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-08",
        title: "Agitasi Homogenisasi Suspensi Koloid Partikel",
        purpose: "Pencampuran orbital shaker selama 48 jam untuk kestabilan fasa dispersi.",
        student: s2,
        activityId: s2ActivityId,
        status: "PENDING_PLP",
        startAt: "2026-10-14T08:00:00+07:00",
        endAt: "2026-10-16T12:00:00+07:00",
        submittedAt: "2026-10-04T07:30:00+07:00",
        units: ["SHK-001-01", "ERL-FIS-01-02"],
        material: null,
        unitStatus: "AVAILABLE",
        issued: false,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-09",
        title: "Kalsinasi Serbuk Padat pada Forced Convection Oven",
        purpose: "Pengurangan kadar pelarut organik pada matriks membran polimer.",
        student: s1,
        activityId: s1ActivityId,
        status: "REQUEST_REVISION",
        revisionNote: "Mohon cantumkan lembar keselamatan material MSDS untuk pemanasan polimer.",
        startAt: "2026-10-18T10:00:00+07:00",
        endAt: "2026-10-20T16:00:00+07:00",
        submittedAt: "2026-10-03T16:00:00+07:00",
        units: ["OVC-001-01", "BKG-FIS-01-04"],
        material: null,
        unitStatus: "AVAILABLE",
        issued: false,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-10",
        title: "Pengujian Derajat Keasaman Elektrolit Larutan Standar pH",
        purpose: "Kalibrasi elektroda pH meter dan verifikasi larutan buffer 7.",
        student: s2,
        activityId: s2ActivityId,
        status: "REJECTED",
        rejectionReason: "Jadwal praktikum serentak semester 3 di Lab Fisik pada tanggal tersebut.",
        startAt: "2026-10-22T08:00:00+07:00",
        endAt: "2026-10-24T16:00:00+07:00",
        submittedAt: "2026-10-02T16:00:00+07:00",
        units: ["PHM-002-02", "BKG-FIS-01-05"],
        material: { code: "MAT-065", qty: 100 }, // Standar pH 7
        unitStatus: "AVAILABLE",
        issued: false,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-11",
        title: "Karakterisasi Refraktometri Larutan Gula Kristal",
        purpose: "Penentuan indeks bias larutan sukrosa bertingkat konsentrasi.",
        student: s1,
        activityId: s1ActivityId,
        status: "APPROVED",
        startAt: "2026-10-04T08:00:00+07:00",
        endAt: "2026-10-04T12:00:00+07:00",
        submittedAt: "2026-10-02T09:00:00+07:00",
        approvedAt: "2026-10-03T14:00:00+07:00",
        units: ["PHM-002-02"],
        unitStatus: "RESERVED",
        issued: false,
        returned: false,
      },
      {
        code: "REQ-2026-FIS-12",
        title: "Spektroskopi Emisi & Eksitasi Fluoresent Polimer",
        purpose: "Analisis luminescence dan lifetime emisi sampel uji material.",
        student: s2,
        activityId: s2ActivityId,
        status: "APPROVED",
        startAt: "2026-10-04T13:30:00+07:00",
        endAt: "2026-10-05T15:00:00+07:00",
        submittedAt: "2026-10-02T11:00:00+07:00",
        approvedAt: "2026-10-03T15:30:00+07:00",
        units: ["BTS-001-01"],
        unitStatus: "RESERVED",
        issued: false,
        returned: false,
      },
    ];

    console.log("Menyuntikkan 12 data permohonan ke Lab Fisik...");

    for (const item of REQUEST_SEEDS) {
      // Clean up previous test seed if exists
      const existingReq = await client.query("SELECT id FROM resource_request WHERE code = $1", [item.code]);
      if (existingReq.rowCount > 0) {
        const reqId = existingReq.rows[0].id;
        await client.query("DELETE FROM return_transaction WHERE issue_transaction_id IN (SELECT id FROM issue_transaction WHERE request_id = $1)", [reqId]);
        await client.query("DELETE FROM issue_transaction WHERE request_id = $1", [reqId]);
        await client.query("DELETE FROM stock_transaction WHERE reference_type = 'resource_request' AND reference_id = $1", [reqId]);
        await client.query("DELETE FROM reservation WHERE request_id = $1", [reqId]);
        await client.query("DELETE FROM equipment_request_item WHERE request_id = $1", [reqId]);
        await client.query("DELETE FROM material_request_item WHERE request_id = $1", [reqId]);
        await client.query("DELETE FROM resource_request WHERE id = $1", [reqId]);
      }

      const requestId = randomUUID();
      await client.query(`
        INSERT INTO resource_request (
          id, code, activity_id, student_id, room_id,
          supervisor_name, field_pic_name, title, purpose,
          mode, start_at, end_at, status, revision_note, rejection_reason,
          submitted_at, approved_at, completed_at, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          'BORROW', $10, $11, $12, $13, $14,
          $15, $16, $17, $18
        )
      `, [
        requestId,
        item.code,
        item.activityId,
        item.student.id,
        roomId,
        "Dr. Budi Santoso, M.Si.",
        "Aslab Fisika",
        item.title,
        item.purpose,
        item.startAt,
        item.endAt,
        item.status,
        item.revisionNote ?? null,
        item.rejectionReason ?? null,
        item.submittedAt ?? null,
        item.approvedAt ?? null,
        item.completedAt ?? null,
        item.submittedAt ?? new Date().toISOString(),
      ]);

      // Insert equipment items & reservations
      for (const unitCode of item.units) {
        const u = unitsMap.get(unitCode);
        if (!u) {
          console.warn(`Unit ${unitCode} tidak ditemukan, lewati.`);
          continue;
        }

        const equipItemId = randomUUID();
        await client.query(`
          INSERT INTO equipment_request_item (
            id, request_id, equipment_asset_id, equipment_unit_id, start_at, end_at, purpose
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          equipItemId,
          requestId,
          u.asset_id,
          u.unit_id,
          item.startAt,
          item.endAt,
          item.purpose,
        ]);

        // Insert reservation for active/approved/ready/completed
        if (["APPROVED", "READY_FOR_PICKUP", "ACTIVE", "COMPLETED", "OVERDUE"].includes(item.status)) {
          const resvId = randomUUID();
          const resvStatus = item.status === "COMPLETED" ? "COMPLETED" : item.status === "ACTIVE" || item.status === "OVERDUE" ? "ACTIVE" : "RESERVED";
          await client.query(`
            INSERT INTO reservation (
              id, request_id, equipment_asset_id, equipment_unit_id, primary_user_id,
              start_at, end_at, status, purpose
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            resvId,
            requestId,
            u.asset_id,
            u.unit_id,
            item.student.id,
            item.startAt,
            item.endAt,
            resvStatus,
            item.purpose,
          ]);
        }

        // Update equipment unit status to match current reality
        await client.query(`
          UPDATE equipment_unit SET status = $1 WHERE id = $2
        `, [item.unitStatus, u.unit_id]);

        // Handle issue and return transactions if applicable
        if (item.issued) {
          const issueId = randomUUID();
          await client.query(`
            INSERT INTO issue_transaction (
              id, request_id, equipment_asset_id, equipment_unit_id, issued_to_id, issued_by_id,
              quantity, condition_at_issue, issued_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 1, 'GOOD', $7)
          `, [
            issueId,
            requestId,
            u.asset_id,
            u.unit_id,
            item.student.id,
            plp.id,
            item.startAt,
          ]);

          if (item.returned) {
            const returnId = randomUUID();
            await client.query(`
              INSERT INTO return_transaction (
                id, issue_transaction_id, equipment_asset_id, returned_by_id, received_by_id,
                condition_at_return, notes, returned_at
              ) VALUES ($1, $2, $3, $4, $5, 'GOOD', 'Alat dikembalikan bersih dan berfungsi normal.', $6)
            `, [
              returnId,
              issueId,
              u.asset_id,
              item.student.id,
              plp.id,
              item.completedAt || item.endAt,
            ]);
          }
        }
      }

      // Insert material item if any
      if (item.material) {
        const m = materialsMap.get(item.material.code);
        if (m) {
          const matItemId = randomUUID();
          await client.query(`
            INSERT INTO material_request_item (
              id, request_id, material_id, allocated_batch_id, requested_quantity, unit
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            matItemId,
            requestId,
            m.material_id,
            m.batch_id,
            item.material.qty,
            m.base_unit,
          ]);

          if (["APPROVED", "READY_FOR_PICKUP"].includes(item.status)) {
            // Reserved for approved or ready requests
            const reserveId = randomUUID();
            await client.query(`
              INSERT INTO stock_transaction (
                id, material_batch_id, type, quantity, before_quantity, after_quantity,
                reference_type, reference_id, performed_by_id, reason, created_at
              ) VALUES ($1, $2, 'RESERVE', $3, $4, $4, 'resource_request', $5, $6, $7, $8)
            `, [
              reserveId,
              m.batch_id,
              item.material.qty,
              m.quantity,
              requestId,
              plp.id,
              `Reservasi ${item.code}`,
              item.approvedAt || item.submittedAt || new Date().toISOString(),
            ]);
          } else if (["ACTIVE", "OVERDUE", "COMPLETED"].includes(item.status)) {
            // Issued / consumed for active, overdue, or completed requests
            const reserveId = randomUUID();
            const issueId = randomUUID();
            const currentQty = Number(m.quantity);
            const afterQty = Math.max(0, currentQty - item.material.qty);

            await client.query(`
              INSERT INTO stock_transaction (
                id, material_batch_id, type, quantity, before_quantity, after_quantity,
                reference_type, reference_id, performed_by_id, reason, created_at
              ) VALUES ($1, $2, 'RESERVE', $3, $4, $4, 'resource_request', $5, $6, $7, $8)
            `, [
              reserveId,
              m.batch_id,
              item.material.qty,
              currentQty,
              requestId,
              plp.id,
              `Reservasi ${item.code}`,
              item.approvedAt || item.submittedAt || new Date().toISOString(),
            ]);

            await client.query(`
              INSERT INTO stock_transaction (
                id, material_batch_id, type, quantity, before_quantity, after_quantity,
                reference_type, reference_id, performed_by_id, reason, created_at
              ) VALUES ($1, $2, 'ISSUE', $3, $4, $5, 'resource_request', $6, $7, $8, $9)
            `, [
              issueId,
              m.batch_id,
              item.material.qty,
              currentQty,
              afterQty,
              requestId,
              plp.id,
              `Issue ${item.code}`,
              item.startAt || item.approvedAt || new Date().toISOString(),
            ]);

            await client.query(`
              UPDATE material_batch SET quantity = $1 WHERE id = $2
            `, [afterQty, m.batch_id]);

            m.quantity = afterQty;
          }
        }
      }

      console.log(`✓ ${item.code} (${item.status}): ${item.title}`);
    }

    await client.query("COMMIT");
    console.log("\nBerhasil seeding 10 request beragam di Lab Fisik dengan relational integrity sempurna!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Gagal seeding request Lab Fisik:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
