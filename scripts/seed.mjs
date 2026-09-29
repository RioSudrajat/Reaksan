import { Pool } from "pg";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";
import {
  clearSeededImageFiles,
  equipmentArt,
  materialArt,
  materialPalette,
  seededImageKey,
  usesLocalStorage,
  writeSeededImageFile,
} from "./seed-assets.mjs";

// Demo accounts are never seeded. This script only prepares the laboratory
// catalog that the student workspace reads: one lab, five field labs, equipment
// types/assets/units, materials with per-lab batches, dispensing rules, and
// generated catalog artwork. It is idempotent and never overwrites quantities
// that stock transactions changed. `--fresh` clears demo catalog and
// transactional data first, then seeds again; accounts and audit history stay.
const FRESH = process.argv.includes("--fresh");

const LAB = {
  code: "chem-lab",
  name: "Laboratorium Kimia",
  description: "Laboratorium pendidikan dan penelitian untuk kegiatan kimia.",
};

const ROOMS = [
  {
    code: "lab-organik",
    name: "Lab Organik",
    shortName: "Organik",
    description: "Sintesis, ekstraksi, dan analisis senyawa organik.",
    tone: "yellow",
  },
  {
    code: "lab-anorganik",
    name: "Lab Anorganik",
    shortName: "Anorganik",
    description: "Reaksi asam-basa, garam, dan senyawa anorganik.",
    tone: "blue",
  },
  {
    code: "lab-biokimia",
    name: "Lab Biokimia",
    shortName: "Biokimia",
    description: "Analisis biomolekul, enzim, dan kultur mikroba.",
    tone: "green",
  },
  {
    code: "lab-analitik",
    name: "Lab Analitik",
    shortName: "Analitik",
    description: "Instrumentasi dan analisis kuantitatif presisi.",
    tone: "cream",
  },
  {
    code: "lab-fisik",
    name: "Lab Fisik",
    shortName: "Fisik",
    description: "Pengukuran sifat fisik dan karakterisasi bahan.",
    tone: "rose",
  },
];

const EQUIPMENT_TYPES = [
  ["Laboratory Oven", "Pemanasan", "BORROWABLE", "Pengeringan dan pemanasan terkontrol.", "oven", "cream"],
  ["Muffle Furnace", "Pemanasan", "USAGE_ONLY", "Pengabuan suhu tinggi.", "furnace", "rose"],
  ["Spectrophotometer", "Analisis", "USAGE_ONLY", "Analisis presisi UV-Vis.", "spectrophotometer", "blue"],
  ["pH Meter", "Pengukuran", "USAGE_ONLY", "Pengukuran pH bench.", "ph-meter", "green"],
  ["Analytical Balance", "Pengukuran", "USAGE_ONLY", "Penimbangan presisi.", "balance", "cream"],
  ["Centrifuge", "Separasi", "USAGE_ONLY", "Pemisahan sampel.", "centrifuge", "blue"],
  ["Hot Plate Stirrer", "Pemanasan", "BORROWABLE", "Pemanasan dengan pengadukan magnetik.", "hot-plate", "yellow"],
  ["Vacuum Oven", "Pemanasan", "BORROWABLE", "Pengeringan tekanan rendah.", "vacuum-oven", "cream"],
  ["Drying Cabinet", "Penyimpanan", "USAGE_ONLY", "Penyimpanan hangat untuk gelas kimia.", "drying-cabinet", "cream"],
  ["Desiccator Cabinet", "Penyimpanan", "USAGE_ONLY", "Penyimpanan bebas kelembapan.", "desiccator", "green"],
  ["Viscometer", "Pengukuran", "USAGE_ONLY", "Pengukuran viskositas cairan.", "viscometer", "blue"],
  ["Melting Point Apparatus", "Analisis", "USAGE_ONLY", "Penentuan titik lebur sampel.", "melting-point", "rose"],
  ["Incubator", "Inkubasi", "USAGE_ONLY", "Inkubasi sampel pada suhu tetap.", "incubator", "green"],
  ["Autoclave", "Sterilisasi", "USAGE_ONLY", "Sterilisasi uap bertekanan.", "autoclave", "blue"],
  ["Water Bath", "Pemanasan", "BORROWABLE", "Pemanasan air presisi.", "water-bath", "yellow"],
  ["Vortex Mixer", "Pencampuran", "BORROWABLE", "Pencampuran cepat tabung sampel.", "vortex-mixer", "yellow"],
  ["Furnace Nabertherm", "Pemanasan", "USAGE_ONLY", "Muffle furnace suhu tinggi Nabertherm untuk pengabuan dan kalsinasi sampel.", "furnace-nabertherm", "rose"],
  ["Furnace Thermoline", "Pemanasan", "USAGE_ONLY", "Furnace laboratorium Thermoline untuk pemanasan termal presisi hingga 1100°C.", "furnace-thermoline", "rose"],
  ["Oven Memmert", "Pemanasan", "BORROWABLE", "Universal oven Memmert untuk pengeringan, pemanasan, dan sterilisasi kering terkontrol.", "oven-memmert", "cream"],
  ["Oven Carbolite", "Pemanasan", "BORROWABLE", "Heavy duty laboratory oven Carbolite untuk perlakuan panas dan pengeringan bahan.", "oven-carbolite", "cream"],
  ["Timbangan", "Pengukuran", "USAGE_ONLY", "Timbangan analitik presisi untuk pengukuran massa bahan kimia dan sampel fisik.", "balance", "cream"],
  ["Sentrifugator", "Separasi", "USAGE_ONLY", "Sentrifugator laboratorium untuk pemisahan fasa dan pengendapan partikel sampel.", "centrifuge", "blue"],
  ["Shaker", "Pencampuran", "BORROWABLE", "Orbital shaker laboratorium untuk pengocokan larutan dan homogenisasi campuran.", "shaker", "blue"],
  ["Shakerbath", "Pemanasan", "BORROWABLE", "Shaking water bath untuk inkubasi terkontrol dengan pengocokan konstan.", "shakerbath", "yellow"],
  ["Spektrofotometer Genesys", "Analisis", "USAGE_ONLY", "Spektrofotometer UV-Vis Genesys untuk analisis absorbansi dan transmitansi larutan.", "spectrophotometer-genesys", "blue"],
  ["Pompa Vacum", "Pengukuran", "BORROWABLE", "Pompa vakum laboratorium diafragma untuk filtrasi vakum dan desikasi.", "pompa-vacum", "green"],
  ["Microwave", "Pemanasan", "BORROWABLE", "Microwave laboratorium untuk pemanasan cepat dan digesti sampel.", "microwave", "yellow"],
  ["BTS", "Pemanasan", "USAGE_ONLY", "Bath Thermostat System (BTS) untuk sirkulasi air suhu konstan presisi.", "bts", "blue"],
  ["pH meter", "Pengukuran", "USAGE_ONLY", "Benchtop pH meter digital untuk pengukuran derajat keasaman larutan.", "ph-meter", "green"],
  ["Turbidimeter", "Analisis", "USAGE_ONLY", "Turbidimeter benchtop untuk pengukuran kekeruhan cairan dan suspensi (NTU).", "turbidimeter", "blue"],
  ["Hotplate Stirer", "Pemanasan", "BORROWABLE", "Hotplate magnetic stirrer laboratorium untuk pemanasan dan pengadukan simultan.", "hot-plate", "yellow"],
  ["Stirer JOANLAB", "Pencampuran", "BORROWABLE", "Magnetic stirrer JOANLAB dengan kontrol digital kecepatan tinggi.", "stirer-joanlab", "blue"],
  ["Heatingmantle Stirrer Electromantle 250mL", "Pemanasan", "BORROWABLE", "Heating mantle 250 mL dengan magnetic stirrer terintegrasi merk Electromantle.", "heatingmantle-electromantle", "rose"],
  ["Heatingmantle 250mL BOLAB", "Pemanasan", "BORROWABLE", "Heating mantle standar kapasitas labu 250 mL merk BOLAB.", "heatingmantle-bolab", "cream"],
  ["Sonikator", "Separasi", "USAGE_ONLY", "Ultrasonic bath sonicator untuk pembersihan alat, degasifikasi larutan, dan dispersi partikel.", "sonicator", "blue"],
];

const ASSETS = [
  ["OVN-001", "Laboratory Oven", "lab-organik", "GOOD", "300°C · forced air"],
  ["HTP-001", "Hot Plate Stirrer", "lab-organik", "GOOD", "340°C · magnetic"],
  ["VCM-001", "Vacuum Oven", "lab-organik", "GOOD", "200°C · vacuum"],
  ["MUF-001", "Muffle Furnace", "lab-anorganik", "GOOD", "1100°C · ashing"],
  ["DES-001", "Desiccator Cabinet", "lab-anorganik", "GOOD", "Silica gel · 3 shelves"],
  ["WTB-001", "Water Bath", "lab-anorganik", "GOOD", "80°C · digital"],
  ["CEN-001", "Centrifuge", "lab-biokimia", "GOOD", "6000 rpm · 8 tubes"],
  ["INC-001", "Incubator", "lab-biokimia", "GOOD", "37°C · 2 shelves"],
  ["AUT-001", "Autoclave", "lab-biokimia", "GOOD", "121°C · 50 L"],
  ["VOR-001", "Vortex Mixer", "lab-biokimia", "GOOD", "3000 rpm"],
  ["SPC-001", "Spectrophotometer", "lab-analitik", "GOOD", "UV-Vis · precision"],
  ["BAL-002", "Analytical Balance", "lab-analitik", "GOOD", "0.1 mg · 220 g max"],
  ["PHM-001", "pH Meter", "lab-analitik", "GOOD", "0.01 pH · bench"],
  ["FNB-001", "Furnace Nabertherm", "lab-fisik", "GOOD", "1200°C · digital muffle"],
  ["FTL-001", "Furnace Thermoline", "lab-fisik", "GOOD", "1100°C · box chamber"],
  ["OVM-001", "Oven Memmert", "lab-fisik", "GOOD", "300°C · digital universal"],
  ["OVC-001", "Oven Carbolite", "lab-fisik", "GOOD", "250°C · forced convection"],
  ["TMB-001", "Timbangan", "lab-fisik", "GOOD", "0.1 mg · precision balance"],
  ["CEN-002", "Sentrifugator", "lab-fisik", "GOOD", "6000 rpm · 8 tubes"],
  ["SHK-001", "Shaker", "lab-fisik", "GOOD", "300 rpm · orbital platform"],
  ["SHB-001", "Shakerbath", "lab-fisik", "GOOD", "100°C · shaking water bath"],
  ["SPG-001", "Spektrofotometer Genesys", "lab-fisik", "GOOD", "UV-Vis · Genesys precision"],
  ["PMV-001", "Pompa Vacum", "lab-fisik", "GOOD", "Diaphragm · oil-free vacuum"],
  ["MCW-001", "Microwave", "lab-fisik", "GOOD", "800W · digestion microwave"],
  ["BTS-001", "BTS", "lab-fisik", "GOOD", "Bath Thermostat System"],
  ["PHM-002", "pH meter", "lab-fisik", "GOOD", "Benchtop digital · probe set"],
  ["TRB-001", "Turbidimeter", "lab-fisik", "GOOD", "0-1000 NTU · digital bench"],
  ["HPS-002", "Hotplate Stirer", "lab-fisik", "GOOD", "350°C · magnetic stirrer"],
  ["STJ-001", "Stirer JOANLAB", "lab-fisik", "GOOD", "2000 rpm · digital stir plate"],
  ["HME-001", "Heatingmantle Stirrer Electromantle 250mL", "lab-fisik", "GOOD", "250 mL · 450°C stirrer"],
  ["HMB-001", "Heatingmantle 250mL BOLAB", "lab-fisik", "GOOD", "250 mL · mantle BOLAB"],
  ["SNK-001", "Sonikator", "lab-fisik", "GOOD", "40 kHz · ultrasonic cleaning bath"],
];

const MAINTENANCE_NOTES = {
  "OVN-001-06": "Door seal review",
  "PHM-002-01": "Electrode aging",
  "PHM-002-02": "Electrode aging",
};

const UNIT_LABELS = {
  "OVN-001": { prefix: "Unit", spec: "300°C", count: 6 },
  "HTP-001": { prefix: "Unit", spec: "340°C", count: 6 },
  "VCM-001": { prefix: "Unit", spec: "vacuum", count: 2 },
  "MUF-001": { prefix: "Unit", spec: "1100°C", count: 3 },
  "DES-001": { prefix: "Shelf", spec: "silica", count: 3 },
  "WTB-001": { prefix: "Unit", spec: "80°C", count: 4 },
  "CEN-001": { prefix: "Unit", spec: "8 tubes", count: 4 },
  "INC-001": { prefix: "Unit", spec: "37°C", count: 3 },
  "AUT-001": { prefix: "Unit", spec: "121°C", count: 2 },
  "VOR-001": { prefix: "Unit", spec: "3000 rpm", count: 4 },
  "SPC-001": { prefix: "Station", spec: "UV-Vis", count: 4 },
  "BAL-002": { prefix: "Balance", spec: "0.1 mg", count: 4 },
  "PHM-001": { prefix: "Meter", spec: "bench", count: 4 },
  "FNB-001": { prefix: "Unit", spec: "1200°C", count: 2 },
  "FTL-001": { prefix: "Unit", spec: "1100°C", count: 2 },
  "OVM-001": { prefix: "Unit", spec: "300°C", count: 3 },
  "OVC-001": { prefix: "Unit", spec: "250°C", count: 2 },
  "TMB-001": { prefix: "Balance", spec: "0.1 mg", count: 3 },
  "CEN-002": { prefix: "Unit", spec: "6000 rpm", count: 2 },
  "SHK-001": { prefix: "Unit", spec: "300 rpm", count: 2 },
  "SHB-001": { prefix: "Unit", spec: "100°C", count: 2 },
  "SPG-001": { prefix: "Station", spec: "UV-Vis", count: 2 },
  "PMV-001": { prefix: "Unit", spec: "diaphragm", count: 2 },
  "MCW-001": { prefix: "Unit", spec: "800W", count: 2 },
  "BTS-001": { prefix: "Unit", spec: "constant temp", count: 2 },
  "PHM-002": { prefix: "Meter", spec: "bench", count: 3 },
  "TRB-001": { prefix: "Unit", spec: "0-1000 NTU", count: 2 },
  "HPS-002": { prefix: "Unit", spec: "350°C", count: 3 },
  "STJ-001": { prefix: "Unit", spec: "2000 rpm", count: 2 },
  "HME-001": { prefix: "Unit", spec: "250 mL", count: 2 },
  "HMB-001": { prefix: "Unit", spec: "250 mL", count: 2 },
  "SNK-001": { prefix: "Unit", spec: "40 kHz", count: 2 },
};

const MATERIALS = [
  {
    code: "MAT-041",
    name: "Ethanol 96%",
    category: "Pelarut",
    unit: "mL",
    description: "Etanol teknis untuk pembersihan dan kerja sampel.",
    kind: "bottle",
    palette: "solvent",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-organik", lot: "ETH-2609-A", quantity: 8000, expiry: "2027-03-31" },
      { room: "lab-anorganik", lot: "ETH-2609-B", quantity: 4000, expiry: "2027-03-31" },
    ],
  },
  {
    code: "MAT-027",
    name: "Acetone",
    category: "Pelarut",
    unit: "mL",
    description: "Aseton analitis untuk pembersihan gelas kimia.",
    kind: "bottle",
    palette: "solvent",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-organik", lot: "ACE-2607-A", quantity: 3000, expiry: "2027-01-31" },
      { room: "lab-analitik", lot: "ACE-2607-B", quantity: 2000, expiry: "2027-01-31" },
    ],
  },
  {
    code: "MAT-012",
    name: "n-Hexane",
    category: "Pelarut",
    unit: "mL",
    description: "Pelarut non-polar untuk ekstraksi.",
    kind: "bottle",
    palette: "solvent",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-organik", lot: "HEX-2605", quantity: 2500, expiry: "2027-05-31" },
    ],
  },
  {
    code: "MAT-018",
    name: "Sodium hydroxide",
    category: "Reagen",
    unit: "g",
    description: "Pellet NaOH untuk titrasi dan pembuatan buffer.",
    kind: "jar",
    palette: "reagent",
    rule: { min: 10, increment: 10, max: 500 },
    placements: [
      { room: "lab-anorganik", lot: "NAOH-2608", quantity: 5000, expiry: "2028-08-31" },
    ],
  },
  {
    code: "MAT-014",
    name: "Hydrochloric acid 37%",
    category: "Reagen",
    unit: "mL",
    description: "HCl pekat, hanya ditangani di lemari asam.",
    kind: "bottle",
    palette: "reagent",
    rule: { min: 25, increment: 25, max: 1000 },
    placements: [
      { room: "lab-anorganik", lot: "HCL-2610", quantity: 6000, expiry: "2027-06-30" },
    ],
  },
  {
    code: "MAT-021",
    name: "Sodium chloride",
    category: "Reagen",
    unit: "g",
    description: "Garam NaCl untuk larutan dan kurva standar.",
    kind: "jar",
    palette: "reagent",
    rule: { min: 10, increment: 10, max: 500 },
    placements: [
      { room: "lab-anorganik", lot: "NACL-2609", quantity: 4000, expiry: "2029-01-31" },
    ],
  },
  {
    code: "MAT-033",
    name: "Distilled water",
    category: "Umum",
    unit: "mL",
    description: "Aquades serbaguna untuk seluruh lab.",
    kind: "carboy",
    palette: "general",
    rule: { min: 100, increment: 100, max: 5000 },
    placements: [
      { room: "lab-organik", lot: "AQUA-2611-O", quantity: 20000, expiry: null },
      { room: "lab-anorganik", lot: "AQUA-2611-A", quantity: 20000, expiry: null },
      { room: "lab-biokimia", lot: "AQUA-2611-B", quantity: 15000, expiry: null },
      { room: "lab-analitik", lot: "AQUA-2611-N", quantity: 20000, expiry: null },
      { room: "lab-fisik", lot: "AQUA-2611-F", quantity: 15000, expiry: null },
    ],
  },
  {
    code: "MAT-055",
    name: "Buffer fosfat pH 7",
    category: "Biomolekul",
    unit: "mL",
    description: "Buffer kerja untuk analisis enzim dan protein.",
    kind: "bottle",
    palette: "biomolecule",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-biokimia", lot: "BUF-2611", quantity: 2000, expiry: "2026-12-31" },
    ],
  },
  {
    code: "MAT-056",
    name: "Glukosa",
    category: "Biomolekul",
    unit: "g",
    description: "Glukosa untuk media dan uji kuantitatif.",
    kind: "jar",
    palette: "biomolecule",
    rule: { min: 5, increment: 5, max: 250 },
    placements: [
      { room: "lab-biokimia", lot: "GLU-2610", quantity: 1500, expiry: "2028-03-31" },
    ],
  },
  {
    code: "MAT-057",
    name: "Reagen Biuret",
    category: "Biomolekul",
    unit: "mL",
    description: "Reagen uji protein metode Biuret.",
    kind: "bottle",
    palette: "biomolecule",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-biokimia", lot: "BIU-2611", quantity: 1000, expiry: "2026-11-30" },
    ],
  },
  {
    code: "MAT-045",
    name: "Methanol HPLC grade",
    category: "Pelarut",
    unit: "mL",
    description: "Metanol fase gerak HPLC.",
    kind: "bottle",
    palette: "solvent",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-analitik", lot: "MEOH-2609", quantity: 3000, expiry: "2027-09-30" },
    ],
  },
  {
    code: "MAT-046",
    name: "Acetonitrile HPLC",
    category: "Pelarut",
    unit: "mL",
    description: "Asetonitril fase gerak HPLC.",
    kind: "bottle",
    palette: "solvent",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-analitik", lot: "ACN-2610", quantity: 2500, expiry: "2027-10-31" },
    ],
  },
  {
    code: "MAT-050",
    name: "Kalium dikromat",
    category: "Reagen",
    unit: "g",
    description: "Oksidator untuk titrasi redoks.",
    kind: "jar",
    palette: "reagent",
    rule: { min: 5, increment: 5, max: 250 },
    placements: [
      { room: "lab-analitik", lot: "K2CR2O7-2608", quantity: 800, expiry: "2029-02-28" },
    ],
  },
  {
    code: "MAT-061",
    name: "Silica gel",
    category: "Umum",
    unit: "g",
    description: "Desikan untuk desikator dan penyimpanan.",
    kind: "sachet",
    palette: "general",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-fisik", lot: "SIL-2610", quantity: 3000, expiry: null },
    ],
  },
  {
    code: "MAT-064",
    name: "Minyak kalibrasi viscometer",
    category: "Standar",
    unit: "mL",
    description: "Minyak standar untuk kalibrasi viscometer.",
    kind: "bottle",
    palette: "standard",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-fisik", lot: "VISCO-2609", quantity: 1200, expiry: "2028-06-30" },
    ],
  },
  {
    code: "MAT-065",
    name: "Larutan standar pH 7",
    category: "Standar",
    unit: "mL",
    description: "Larutan standar untuk kalibrasi pH meter.",
    kind: "bottle",
    palette: "standard",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-fisik", lot: "PH7-2611-F", quantity: 1000, expiry: "2027-04-30" },
      { room: "lab-analitik", lot: "PH7-2611-N", quantity: 1000, expiry: "2027-04-30" },
    ],
  },
];

const FRESH_TABLES = [
  "stock_opname_entry",
  "stock_opname_session",
  "return_transaction",
  "issue_transaction",
  "reservation",
  "material_request_item",
  "equipment_request_item",
  "shared_usage_request",
  "shared_usage",
  "incident_assessment",
  "incident_resolution",
  "incident",
  "resource_request",
  "stock_transaction",
  "material_batch",
  "material_dispensing_rule",
  "material",
  "equipment_condition_history",
  "equipment_unit",
  "equipment_asset",
  "equipment_type",
  "room",
  "laboratory",
  "notification",
];

await loadEnvironment();
const pool = new Pool({
  connectionString: databaseUrl(),
  max: 1,
  connectionTimeoutMillis: 5000,
});
pool.on("error", () => {});

let artworkWarningShown = false;

async function writeArtwork(client, slug, svgSource) {
  if (!usesLocalStorage()) {
    if (!artworkWarningShown) {
      console.warn(
        "STORAGE_PROVIDER=s3: gambar katalog dilewati. Unggah gambar lewat admin bila perlu.",
      );
      artworkWarningShown = true;
    }
    return null;
  }
  const key = seededImageKey(slug);
  const sizeBytes = await writeSeededImageFile(key, svgSource);
  const existing = await client.query(
    `INSERT INTO media (storage_provider, storage_key, file_name, mime_type, size_bytes, uploaded_by_id)
     VALUES ('local', $1, $2, 'image/svg+xml', $3, NULL)
     ON CONFLICT (storage_key) DO UPDATE SET file_name = EXCLUDED.file_name, size_bytes = EXCLUDED.size_bytes
     RETURNING id`,
    [key, `${slug}.svg`, sizeBytes],
  );
  return existing.rows[0].id;
}

async function clearArtwork(client) {
  await client.query("DELETE FROM media WHERE storage_key LIKE 'seed/catalog/%'");
  await clearSeededImageFiles();
}

async function upsertRoom(client, labId, room) {
  const existing = await client.query(
    "SELECT id FROM room WHERE laboratory_id = $1 AND code = $2",
    [labId, room.code],
  );
  if (existing.rowCount > 0) {
    await client.query(
      "UPDATE room SET name = $2, short_name = $3, description = $4, tone = $5, active = true WHERE id = $1",
      [existing.rows[0].id, room.name, room.shortName, room.description, room.tone],
    );
    return existing.rows[0].id;
  }
  const inserted = await client.query(
    "INSERT INTO room (laboratory_id, code, name, short_name, description, tone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [labId, room.code, room.name, room.shortName, room.description, room.tone],
  );
  return inserted.rows[0].id;
}

async function upsertEquipmentType(client, [name, category, usageType, description, shape, tone]) {
  const art = await writeArtwork(client, `equipment-${shape}`, equipmentArt(shape, tone));
  const existing = await client.query(
    "SELECT id FROM equipment_type WHERE name = $1",
    [name],
  );
  if (existing.rowCount > 0) {
    await client.query(
      "UPDATE equipment_type SET category = $2, usage_type = $3, description = $4, image_media_id = $5 WHERE id = $1",
      [existing.rows[0].id, category, usageType, description, art],
    );
    return existing.rows[0].id;
  }
  const inserted = await client.query(
    "INSERT INTO equipment_type (name, category, usage_type, description, image_media_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [name, category, usageType, description, art],
  );
  return inserted.rows[0].id;
}

async function upsertAsset(client, roomIds, typeIds, [code, type, room, condition, notes]) {
  const existing = await client.query(
    "SELECT id FROM equipment_asset WHERE asset_code = $1",
    [code],
  );
  if (existing.rowCount > 0) {
    await client.query(
      "UPDATE equipment_asset SET room_id = $2, equipment_type_id = $3, condition = $4, notes = $5, active = true WHERE id = $1",
      [existing.rows[0].id, roomIds[room], typeIds[type], condition, notes],
    );
    return existing.rows[0].id;
  }
  const inserted = await client.query(
    "INSERT INTO equipment_asset (asset_code, equipment_type_id, room_id, condition, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [code, typeIds[type], roomIds[room], condition, notes],
  );
  return inserted.rows[0].id;
}

async function upsertUnit(client, assetId, code, label, notes) {
  const existing = await client.query(
    "SELECT id FROM equipment_unit WHERE code = $1",
    [code],
  );
  if (existing.rowCount > 0) return;
  await client.query(
    "INSERT INTO equipment_unit (equipment_asset_id, code, label, status, notes) VALUES ($1, $2, $3, $4, $5)",
    [assetId, code, label, notes ? "MAINTENANCE" : "AVAILABLE", notes ?? null],
  );
}

async function upsertMaterial(client, material) {
  const art = await writeArtwork(
    client,
    `material-${material.code.toLowerCase()}`,
    materialArt(material.kind, materialPalette[material.palette]),
  );
  let materialId;
  const existing = await client.query("SELECT id FROM material WHERE code = $1", [
    material.code,
  ]);
  if (existing.rowCount > 0) {
    materialId = existing.rows[0].id;
    await client.query(
      "UPDATE material SET name = $2, category = $3, base_unit = $4, description = $5, image_media_id = $6, active = true WHERE id = $1",
      [materialId, material.name, material.category, material.unit, material.description, art],
    );
  } else {
    const inserted = await client.query(
      "INSERT INTO material (code, name, category, base_unit, description, image_media_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [material.code, material.name, material.category, material.unit, material.description, art],
    );
    materialId = inserted.rows[0].id;
  }
  await client.query(
    `INSERT INTO material_dispensing_rule (material_id, minimum_quantity, dispensing_increment, maximum_quantity, unit)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (material_id) DO UPDATE SET minimum_quantity = $2, dispensing_increment = $3, maximum_quantity = $4, unit = $5`,
    [materialId, material.rule.min, material.rule.increment, material.rule.max, material.unit],
  );
  return materialId;
}

async function upsertBatch(client, materialId, roomId, placement) {
  const existing = await client.query(
    "SELECT id FROM material_batch WHERE material_id = $1 AND lot_number = $2",
    [materialId, placement.lot],
  );
  if (existing.rowCount > 0) return;
  await client.query(
    "INSERT INTO material_batch (material_id, room_id, lot_number, quantity, expiry_date) VALUES ($1, $2, $3, $4, $5)",
    [materialId, roomId, placement.lot, placement.quantity, placement.expiry],
  );
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  if (FRESH) {
    await client.query(
      `TRUNCATE TABLE ${FRESH_TABLES.map((table) => `"${table}"`).join(", ")} CASCADE`,
    );
    await client.query(
      "DELETE FROM assignment WHERE scope_type IN ('ROOM', 'LABORATORY')",
    );
    // Catalog rows that referenced seeded media are gone by now.
    await clearArtwork(client);
  }

  const lab = await client.query(
    `INSERT INTO laboratory (code, name, description) VALUES ($1, $2, $3)
     ON CONFLICT (code) DO UPDATE SET name = $2, description = $3 RETURNING id`,
    [LAB.code, LAB.name, LAB.description],
  );
  const labId = lab.rows[0].id;

  const roomIds = {};
  for (const room of ROOMS) roomIds[room.code] = await upsertRoom(client, labId, room);

  const typeIds = {};
  for (const type of EQUIPMENT_TYPES) typeIds[type[0]] = await upsertEquipmentType(client, type);

  const currentAssetCodes = ASSETS.map((a) => a[0]);
  await client.query(
    "UPDATE equipment_asset SET active = false WHERE NOT (asset_code = ANY($1))",
    [currentAssetCodes],
  );
  await client.query(
    "UPDATE equipment_unit SET active = false WHERE equipment_asset_id IN (SELECT id FROM equipment_asset WHERE active = false)",
  );

  for (const asset of ASSETS) {
    const assetId = await upsertAsset(client, roomIds, typeIds, asset);
    const { prefix, spec, count } = UNIT_LABELS[asset[0]];
    for (let index = 1; index <= count; index += 1) {
      const number = String(index).padStart(2, "0");
      const code = `${asset[0]}-${number}`;
      await upsertUnit(
        client,
        assetId,
        code,
        `${prefix} ${number} · ${spec}`,
        MAINTENANCE_NOTES[code],
      );
    }
  }

  for (const material of MATERIALS) {
    const materialId = await upsertMaterial(client, material);
    for (const placement of material.placements) {
      await upsertBatch(client, materialId, roomIds[placement.room], placement);
    }
  }

  await client.query("COMMIT");
  console.log(
    FRESH
      ? "Katalog dan data transaksi demo dihapus, lalu 5 lab di-seed ulang. Akun dan audit tetap utuh."
      : "Katalog 5 lab di-seed. Stok dan data pengguna yang ada tidak ditimpa.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
