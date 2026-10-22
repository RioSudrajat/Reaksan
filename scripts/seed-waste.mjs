import { Pool } from "pg";
import { databaseUrl, databaseError } from "./postgres.mjs";
import { loadEnvironment } from "./lib.mjs";

await loadEnvironment();

const CATEGORIES = [
  {
    code: "CAIR",
    name: "Cair (Limbah Cair)",
    physicalState: "LIQUID",
    description: "Limbah kimia dan larutan cair B3.",
    hazardBadge: "B3 CAIR",
    colorHex: "#0284c7",
  },
  {
    code: "PADAT",
    name: "Padat (Limbah Padat)",
    physicalState: "SOLID",
    description: "Limbah padatan, residu kristal, dan material terkontaminasi B3.",
    hazardBadge: "B3 PADAT",
    colorHex: "#e11d48",
  },
  {
    code: "ACID",
    name: "Limbah Asam Anorganik",
    physicalState: "LIQUID",
    description: "Sisa asam mineral seperti HCl, H2SO4, HNO3 encer, H3PO4 (pH < 2).",
    hazardBadge: "CORROSIVE",
    colorHex: "#ea580c",
  },
  {
    code: "BASE",
    name: "Limbah Basa Anorganik",
    physicalState: "LIQUID",
    description: "Sisa larutan alkali seperti NaOH, KOH, NH4OH (pH > 10).",
    hazardBadge: "CORROSIVE",
    colorHex: "#2563eb",
  },
  {
    code: "ORG-NONHALO",
    name: "Pelarut Organik Non-Halogen",
    physicalState: "LIQUID",
    description: "Pelarut mudah terbakar seperti Etanol, Aseton, n-Heksana, Toluena.",
    hazardBadge: "FLAMMABLE",
    colorHex: "#dc2626",
  },
  {
    code: "ORG-HALO",
    name: "Pelarut Organik Terhalogenasi",
    physicalState: "LIQUID",
    description: "Pelarut klorinasi seperti Kloroform (CHCl3), Diklorometana (DCM).",
    hazardBadge: "TOXIC",
    colorHex: "#9333ea",
  },
  {
    code: "COMPLEX-MET",
    name: "Senyawa Kompleks & Logam Berat",
    physicalState: "LIQUID",
    description: "Sisa titrasi kompleksometri (EDTA), ion Cu, Ni, Cr, Pb, Fe.",
    hazardBadge: "ECO-TOXIC",
    colorHex: "#d97706",
  },
  {
    code: "BATTERY",
    name: "Limbah Baterai & Sel Elektrokimia",
    physicalState: "SOLID",
    description: "Baterai Li-ion, sel aki, sel galvanik eksperimen energi.",
    hazardBadge: "CORROSIVE/HEAT",
    colorHex: "#52525b",
  },
  {
    code: "HPLC-ELUENT",
    name: "Limbah Fase Gerak HPLC",
    physicalState: "LIQUID",
    description: "Campuran efluen HPLC (Metanol, Asetonitril, Air).",
    hazardBadge: "FLAMMABLE/TOXIC",
    colorHex: "#0d9488",
  },
  {
    code: "BIO-REAGENT",
    name: "Residu Reagen Biokimia & Cu",
    physicalState: "LIQUID",
    description: "Sisa reagen Biuret, reagen warna uji protein & enzim.",
    hazardBadge: "IRRITANT",
    colorHex: "#059669",
  },
  {
    code: "BIO-SHARPS",
    name: "Benda Tajam & Tip Mikropipet",
    physicalState: "SOLID",
    description: "Tip mikropipet bekas, cover glass, tabung mikrosentrifus.",
    hazardBadge: "BIOHAZARD/SHARPS",
    colorHex: "#ca8a04",
  },
  {
    code: "SOLID-B3",
    name: "Limbah Padat B3 Terkontaminasi",
    physicalState: "SOLID",
    description: "Kertas saring terkontaminasi, sarung tangan nitril, silica gel.",
    hazardBadge: "HAZARDOUS",
    colorHex: "#78716c",
  },
];

const ROOM_CONTAINERS = [
  // 1. Lab Fisik
  {
    roomCode: "lab-fisik",
    categoryCode: "ACID",
    code: "JRG-FISIK-ACID-01",
    name: "Jerigen Asam (Lab Fisik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Dekat wastafel pembersihan sel",
  },
  {
    roomCode: "lab-fisik",
    categoryCode: "BASE",
    code: "JRG-FISIK-BASE-01",
    name: "Jerigen Basa (Lab Fisik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Meja preparasi larutan elektrolit",
  },
  {
    roomCode: "lab-fisik",
    categoryCode: "ORG-HALO",
    code: "JRG-FISIK-HALO-01",
    name: "Jerigen Halogen (Lab Fisik)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Lemari asam sudut barat",
  },
  {
    roomCode: "lab-fisik",
    categoryCode: "COMPLEX-MET",
    code: "JRG-FISIK-COMPLEX-01",
    name: "Jerigen Senyawa Kompleks (Lab Fisik)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Rak penyimpanan limbah tertutup",
  },
  {
    roomCode: "lab-fisik",
    categoryCode: "BATTERY",
    code: "BIN-FISIK-BATTERY-01",
    name: "Wadah Limbah Baterai (Lab Fisik)",
    maxCapacity: 5.0,
    unit: "kg",
    location: "Meja uji sel elektrokimia",
  },

  // 2. Lab Organik
  {
    roomCode: "lab-organik",
    categoryCode: "ACID",
    code: "JRG-ORGANIK-ACID-01",
    name: "Jerigen Asam (Lab Organik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Lemari asam utama",
  },
  {
    roomCode: "lab-organik",
    categoryCode: "BASE",
    code: "JRG-ORGANIK-BASE-01",
    name: "Jerigen Basa (Lab Organik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Meja ekstraksi",
  },
  {
    roomCode: "lab-organik",
    categoryCode: "ORG-NONHALO",
    code: "JRG-ORGANIK-NONHALO-01",
    name: "Jerigen Pelarut Non-Halogen (Lab Organik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Stasiun rotary evaporator",
  },
  {
    roomCode: "lab-organik",
    categoryCode: "ORG-HALO",
    code: "JRG-ORGANIK-HALO-01",
    name: "Jerigen Pelarut Halogen (Lab Organik)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Lemari asam khusus kloroform",
  },
  {
    roomCode: "lab-organik",
    categoryCode: "SOLID-B3",
    code: "WST-ORGANIK-SOLID-01",
    name: "Tong Limbah Padat B3 (Lab Organik)",
    maxCapacity: 15.0,
    unit: "kg",
    location: "Bawah meja preparasi kromatografi",
  },

  // 3. Lab Anorganik
  {
    roomCode: "lab-anorganik",
    categoryCode: "ACID",
    code: "JRG-ANORGANIK-ACID-01",
    name: "Jerigen Asam Anorganik (Lab Anorganik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Lemari asam titrasi asam",
  },
  {
    roomCode: "lab-anorganik",
    categoryCode: "BASE",
    code: "JRG-ANORGANIK-BASE-01",
    name: "Jerigen Basa Anorganik (Lab Anorganik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Meja reaksi pengendapan basa",
  },
  {
    roomCode: "lab-anorganik",
    categoryCode: "COMPLEX-MET",
    code: "JRG-ANORGANIK-COMPLEX-01",
    name: "Jerigen Senyawa Kompleks (Lab Anorganik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Stasiun sintesis kompleks logam",
  },

  // 4. Lab Analitik
  {
    roomCode: "lab-analitik",
    categoryCode: "ACID",
    code: "JRG-ANALITIK-ACID-01",
    name: "Jerigen Asam (Lab Analitik)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Meja titrasi volumetri A",
  },
  {
    roomCode: "lab-analitik",
    categoryCode: "BASE",
    code: "JRG-ANALITIK-BASE-01",
    name: "Jerigen Basa (Lab Analitik)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Meja titrasi volumetri B",
  },
  {
    roomCode: "lab-analitik",
    categoryCode: "HPLC-ELUENT",
    code: "JRG-ANALITIK-HPLC-01",
    name: "Jerigen Fase Gerak HPLC (Lab Analitik)",
    maxCapacity: 20.0,
    unit: "L",
    location: "Di bawah rak instrumen HPLC",
  },
  {
    roomCode: "lab-analitik",
    categoryCode: "COMPLEX-MET",
    code: "JRG-ANALITIK-HEAVYMET-01",
    name: "Jerigen Logam Berat & Oksidator (Lab Analitik)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Lemari asam preparasi sampel",
  },

  // 5. Lab Biokimia
  {
    roomCode: "lab-biokimia",
    categoryCode: "ACID",
    code: "JRG-BIOKIMIA-ACID-01",
    name: "Jerigen Asam (Lab Biokimia)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Meja pengatur pH buffer",
  },
  {
    roomCode: "lab-biokimia",
    categoryCode: "BASE",
    code: "JRG-BIOKIMIA-BASE-01",
    name: "Jerigen Basa (Lab Biokimia)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Meja reagen biokimia",
  },
  {
    roomCode: "lab-biokimia",
    categoryCode: "BIO-REAGENT",
    code: "JRG-BIOKIMIA-REAGENT-01",
    name: "Jerigen Reagen Biokimia & Cu (Lab Biokimia)",
    maxCapacity: 10.0,
    unit: "L",
    location: "Bawah rak spektrofotometer UV-Vis",
  },
  {
    roomCode: "lab-biokimia",
    categoryCode: "BIO-SHARPS",
    code: "BIN-BIOKIMIA-SHARPS-01",
    name: "Safety Box Tip Pipet & Benda Tajam (Lab Biokimia)",
    maxCapacity: 5.0,
    unit: "kg",
    location: "Meja mikropipet tengah",
  },
];

let pool;
try {
  pool = new Pool({
    connectionString: databaseUrl(
      process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL,
    ),
    max: 1,
  });

  console.log("Seeding waste categories & initial containers...");

  // 1. Seed categories
  const catMap = new Map();
  for (const cat of CATEGORIES) {
    const res = await pool.query(
      `
      INSERT INTO waste_category (code, name, physical_state, description, hazard_badge, color_hex, active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        physical_state = EXCLUDED.physical_state,
        description = EXCLUDED.description,
        hazard_badge = EXCLUDED.hazard_badge,
        color_hex = EXCLUDED.color_hex
      RETURNING id, code
    `,
      [
        cat.code,
        cat.name,
        cat.physicalState,
        cat.description,
        cat.hazardBadge,
        cat.colorHex,
      ],
    );
    catMap.set(res.rows[0].code, res.rows[0].id);
  }
  console.log(`Seeded ${catMap.size} waste categories.`);

  // 2. Query rooms
  const roomsRes = await pool.query("SELECT id, code FROM room");
  const roomMap = new Map(roomsRes.rows.map((r) => [r.code, r.id]));

  // 3. Seed containers
  let containerCount = 0;
  for (const c of ROOM_CONTAINERS) {
    const roomId = roomMap.get(c.roomCode);
    const categoryId = catMap.get(c.categoryCode);

    if (!roomId || !categoryId) {
      console.warn(`Skipping container ${c.code}: room or category not found`);
      continue;
    }

    const qrCode = `reaksan://waste-container/${c.code}`;

    await pool.query(
      `
      INSERT INTO waste_container (code, room_id, category_id, name, max_capacity, current_volume, unit, status, active, qr_code, location_notes)
      VALUES ($1, $2, $3, $4, $5, 0.00, $6, 'ACTIVE', true, $7, $8)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        location_notes = EXCLUDED.location_notes
    `,
      [
        c.code,
        roomId,
        categoryId,
        c.name,
        c.maxCapacity.toFixed(2),
        c.unit,
        qrCode,
        c.location,
      ],
    );
    containerCount++;
  }

  console.log(`Seeded ${containerCount} waste containers across 5 labs.`);
} catch (err) {
  console.error("Waste seed error:", databaseError(err));
} finally {
  await pool?.end();
}
