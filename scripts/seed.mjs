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
  ["Laboratory Oven", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Pengeringan dan pemanasan terkontrol.", "oven", "cream"],
  ["Muffle Furnace", "Pemanasan", "USAGE_ONLY", "INSTRUMENT", "Pengabuan suhu tinggi.", "furnace", "rose"],
  ["Spectrophotometer", "Analisis", "USAGE_ONLY", "INSTRUMENT", "Analisis presisi UV-Vis.", "spectrophotometer", "blue"],
  ["pH Meter", "Pengukuran", "USAGE_ONLY", "INSTRUMENT", "Pengukuran pH bench.", "ph-meter", "green"],
  ["Analytical Balance", "Pengukuran", "USAGE_ONLY", "INSTRUMENT", "Penimbangan presisi.", "balance", "cream"],
  ["Centrifuge", "Separasi", "USAGE_ONLY", "INSTRUMENT", "Pemisahan sampel.", "centrifuge", "blue"],
  ["Hot Plate Stirrer", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Pemanasan dengan pengadukan magnetik.", "hot-plate", "yellow"],
  ["Vacuum Oven", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Pengeringan tekanan rendah.", "vacuum-oven", "cream"],
  ["Drying Cabinet", "Penyimpanan", "USAGE_ONLY", "INSTRUMENT", "Penyimpanan hangat untuk gelas kimia.", "drying-cabinet", "cream"],
  ["Desiccator Cabinet", "Penyimpanan", "USAGE_ONLY", "INSTRUMENT", "Penyimpanan bebas kelembapan.", "desiccator", "green"],
  ["Viscometer", "Pengukuran", "USAGE_ONLY", "INSTRUMENT", "Pengukuran viskositas cairan.", "viscometer", "blue"],
  ["Melting Point Apparatus", "Analisis", "USAGE_ONLY", "INSTRUMENT", "Penentuan titik lebur sampel.", "melting-point", "rose"],
  ["Incubator", "Inkubasi", "USAGE_ONLY", "INSTRUMENT", "Inkubasi sampel pada suhu tetap.", "incubator", "green"],
  ["Autoclave", "Sterilisasi", "USAGE_ONLY", "INSTRUMENT", "Sterilisasi uap bertekanan.", "autoclave", "blue"],
  ["Water Bath", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Pemanasan air presisi.", "water-bath", "yellow"],
  ["Vortex Mixer", "Pencampuran", "BORROWABLE", "INSTRUMENT", "Pencampuran cepat tabung sampel.", "vortex-mixer", "yellow"],
  ["Furnace Nabertherm", "Pemanasan", "USAGE_ONLY", "INSTRUMENT", "Muffle furnace suhu tinggi Nabertherm untuk pengabuan dan kalsinasi sampel.", "furnace-nabertherm", "rose"],
  ["Furnace Thermoline", "Pemanasan", "USAGE_ONLY", "INSTRUMENT", "Furnace laboratorium Thermoline untuk pemanasan termal presisi hingga 1100°C.", "furnace-thermoline", "rose"],
  ["Oven Memmert", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Universal oven Memmert untuk pengeringan, pemanasan, dan sterilisasi kering terkontrol.", "oven-memmert", "cream"],
  ["Oven Carbolite", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Heavy duty laboratory oven Carbolite untuk perlakuan panas dan pengeringan bahan.", "oven-carbolite", "cream"],
  ["Timbangan", "Pengukuran", "USAGE_ONLY", "INSTRUMENT", "Timbangan analitik presisi untuk pengukuran massa bahan kimia dan sampel fisik.", "balance", "cream"],
  ["Sentrifugator", "Separasi", "USAGE_ONLY", "INSTRUMENT", "Sentrifugator laboratorium untuk pemisahan fasa dan pengendapan partikel sampel.", "centrifuge", "blue"],
  ["Shaker", "Pencampuran", "BORROWABLE", "INSTRUMENT", "Orbital shaker laboratorium untuk pengocokan larutan dan homogenisasi campuran.", "shaker", "blue"],
  ["Shakerbath", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Shaking water bath untuk inkubasi terkontrol dengan pengocokan konstan.", "shakerbath", "yellow"],
  ["Spektrofotometer Genesys", "Analisis", "USAGE_ONLY", "INSTRUMENT", "Spektrofotometer UV-Vis Genesys untuk analisis absorbansi dan transmitansi larutan.", "spectrophotometer-genesys", "blue"],
  ["Pompa Vacum", "Pengukuran", "BORROWABLE", "INSTRUMENT", "Pompa vakum laboratorium diafragma untuk filtrasi vakum dan desikasi.", "pompa-vacum", "green"],
  ["Microwave", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Microwave laboratorium untuk pemanasan cepat dan digesti sampel.", "microwave", "yellow"],
  ["BTS", "Pemanasan", "USAGE_ONLY", "INSTRUMENT", "Bath Thermostat System (BTS) untuk sirkulasi air suhu konstan presisi.", "bts", "blue"],
  ["pH meter", "Pengukuran", "USAGE_ONLY", "INSTRUMENT", "Benchtop pH meter digital untuk pengukuran derajat keasaman larutan.", "ph-meter", "green"],
  ["Turbidimeter", "Analisis", "USAGE_ONLY", "INSTRUMENT", "Turbidimeter benchtop untuk pengukuran kekeruhan cairan dan suspensi (NTU).", "turbidimeter", "blue"],
  ["Hotplate Stirer", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Hotplate magnetic stirrer laboratorium untuk pemanasan dan pengadukan simultan.", "hot-plate", "yellow"],
  ["Stirer JOANLAB", "Pencampuran", "BORROWABLE", "INSTRUMENT", "Magnetic stirrer JOANLAB dengan kontrol digital kecepatan tinggi.", "stirer-joanlab", "blue"],
  ["Heatingmantle Stirrer Electromantle 250mL", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Heating mantle 250 mL dengan magnetic stirrer terintegrasi merk Electromantle.", "heatingmantle-electromantle", "rose"],
  ["Heatingmantle 250mL BOLAB", "Pemanasan", "BORROWABLE", "INSTRUMENT", "Heating mantle standar kapasitas labu 250 mL merk BOLAB.", "heatingmantle-bolab", "cream"],
  ["Sonikator", "Separasi", "USAGE_ONLY", "INSTRUMENT", "Ultrasonic bath sonicator untuk pembersihan alat, degasifikasi larutan, dan dispersi partikel.", "sonicator", "blue"],

  // Alat Praktikum & Gelas Kimia (Glassware & Lab Tools)
  ["Beker Glass 100 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Gelas beker 100 mL borosilikat untuk preparasi larutan.", "beaker", "blue"],
  ["Beker Glass 250 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Gelas beker 250 mL standar praktikum meja.", "beaker", "blue"],
  ["Erlenmeyer 100 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Labu erlenmeyer 100 mL untuk titrasi dan penampungan filtrat.", "erlenmeyer", "cream"],
  ["Erlenmeyer 250 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Labu erlenmeyer 250 mL standar titrasi meja praktikum.", "erlenmeyer", "cream"],
  ["Labu Ukur 100 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Labu ukur volumetrik 100 mL kelas A dengan tutup asah.", "volumetric-flask", "green"],
  ["Labu Ukur 50 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Labu volumetrik 50 mL kelas A kalibrasi presisi dengan stopper.", "volumetric-flask", "green"],
  ["Buret Asam 50 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Buret asam 50 mL kran PTFE presisi untuk titrasi kuantitatif.", "buret", "blue"],
  ["Buret Basa 50 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Buret basa 50 mL dilengkapi kran karet dan manik kaca.", "buret", "blue"],
  ["Pipet Ukur 10 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Pipet ukur kaca 10 mL pembagian skala 0.1 mL.", "measuring-cylinder", "cream"],
  ["Pipet Gondok 25 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Pipet volumetri 1 tanda batas 25 mL kelas A toleransi 0.03 mL.", "measuring-cylinder", "cream"],
  ["Corong Kaca 75 mm", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Corong kaca diameter 75 mm untuk penyaringan larutan.", "glass-tool", "yellow"],
  ["Spatula Stainless Steel", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Spatula sendok dan pipih stainless steel tahan karat 15 cm.", "glass-tool", "cream"],
  ["Kaca Arloji 80 mm", "Gelas Kimia", "BORROWABLE", "TOOL", "Kaca arloji diameter 80 mm penimbangan padatan dan penutup beker.", "glass-tool", "blue"],
  ["Statif dan Klem", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Set statif besi cor dan klem buret ganda penjepit kokoh.", "glass-tool", "rose"],
  ["Labu Alas Bulat 250 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Labu leher dua borosilikat untuk sintesis refluks dan destilasi.", "volumetric-flask", "cream"],
  ["Kondensor Liebig 300 mm", "Gelas Kimia", "BORROWABLE", "TOOL", "Pendingin lurus Liebig 300 mm sambungan asah 24/29.", "measuring-cylinder", "blue"],
  ["Corong Pisah 250 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Corong pemisah bentuk pir 250 mL kran PTFE untuk ekstraksi.", "volumetric-flask", "green"],
  ["Corong Buchner Keramik 80 mm", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Corong porselen Buchner diameter 80 mm filtrasi hisap vakum.", "glass-tool", "cream"],
  ["Cawan Porselen 50 mL", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Cawan penguapan porselen tahan panas 1000°C kapasitas 50 mL.", "glass-tool", "rose"],
  ["Krus Porselen & Tutup 30 mL", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Krusibel pemijaran porselen bentuk sedang dengan tutup 30 mL.", "glass-tool", "cream"],
  ["Tang Krus (Crucible Tongs)", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Penjepit krusibel stainless steel ujung melengkung 20 cm.", "glass-tool", "cream"],
  ["Mikropipet 100-1000 uL", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Mikropipet single channel variabel volume 100-1000 uL.", "measuring-cylinder", "blue"],
  ["Tabung Reaksi & Rak 16 mm", "Gelas Kimia", "BORROWABLE", "TOOL", "Set 12 tabung reaksi borosilikat 16x150 mm dan rak kayu.", "measuring-cylinder", "yellow"],
  ["Kuvet Kuarsa 10 mm", "Gelas Kimia", "BORROWABLE", "TOOL", "Kuvet spektrofotometer kuarsa pathlength 10 mm rentang UV-Vis.", "measuring-cylinder", "cream"],
  ["Piknometer Kaca 25 mL", "Gelas Kimia", "BORROWABLE", "TOOL", "Piknometer Gay-Lussac 25 mL termometer terintegrasi.", "volumetric-flask", "blue"],
  ["Viskometer Ostwald", "Gelas Kimia", "BORROWABLE", "TOOL", "Viskometer kapiler Ostwald kaca borosilikat standar.", "measuring-cylinder", "green"],
  ["Kalorimeter Sederhana", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Kalorimeter cangkir insulasi ganda lengkap dengan pengaduk.", "beaker", "rose"],
  ["Termometer Lab 0-150°C", "Peralatan Penunjang", "BORROWABLE", "TOOL", "Termometer raksa celup sebagian rentang 0 sampai 150 derajat Celsius.", "measuring-cylinder", "yellow"],
];

const ASSETS = [
  // === LAB ORGANIK ===
  // Instrumen
  ["OVN-001", "Laboratory Oven", "lab-organik", "GOOD", "300°C · forced air"],
  ["HTP-001", "Hot Plate Stirrer", "lab-organik", "GOOD", "340°C · magnetic"],
  ["VCM-001", "Vacuum Oven", "lab-organik", "GOOD", "200°C · vacuum"],
  ["HME-001", "Heatingmantle Stirrer Electromantle 250mL", "lab-organik", "GOOD", "250 mL · 450°C stirrer"],
  ["HMB-001", "Heatingmantle 250mL BOLAB", "lab-organik", "GOOD", "250 mL · mantle BOLAB"],
  ["MPA-001", "Melting Point Apparatus", "lab-organik", "GOOD", "Digital melting point · 300°C"],
  ["PMV-001", "Pompa Vacum", "lab-organik", "GOOD", "Diaphragm · oil-free vacuum"],
  // Alat Meja & Lemari
  ["LBR-ORG-01", "Labu Alas Bulat 250 mL", "lab-organik", "GOOD", "250 mL · leher dua borosilikat"],
  ["KND-ORG-01", "Kondensor Liebig 300 mm", "lab-organik", "GOOD", "300 mm · pendingin refluks"],
  ["CPS-ORG-01", "Corong Pisah 250 mL", "lab-organik", "GOOD", "250 mL · kran PTFE ekstraksi"],
  ["BCN-ORG-01", "Corong Buchner Keramik 80 mm", "lab-organik", "GOOD", "80 mm · porselen filtrasi vakum"],
  ["BKG-ORG-01", "Beker Glass 250 mL", "lab-organik", "GOOD", "250 mL · borosilikat"],
  ["ERL-ORG-01", "Erlenmeyer 250 mL", "lab-organik", "GOOD", "250 mL · titrasi"],
  ["COR-ORG-01", "Corong Kaca 75 mm", "lab-organik", "GOOD", "75 mm · tangkai panjang"],
  ["SPT-ORG-01", "Spatula Stainless Steel", "lab-organik", "GOOD", "Stainless steel · 15 cm"],

  // === LAB ANORGANIK ===
  // Instrumen
  ["MUF-001", "Muffle Furnace", "lab-anorganik", "GOOD", "1100°C · ashing"],
  ["FNB-001", "Furnace Nabertherm", "lab-anorganik", "GOOD", "1200°C · digital muffle"],
  ["FTL-001", "Furnace Thermoline", "lab-anorganik", "GOOD", "1100°C · box chamber"],
  ["DES-001", "Desiccator Cabinet", "lab-anorganik", "GOOD", "Silica gel · 3 shelves"],
  ["WTB-001", "Water Bath", "lab-anorganik", "GOOD", "80°C · digital"],
  ["MCW-001", "Microwave", "lab-anorganik", "GOOD", "800W · digestion microwave"],
  // Alat Meja & Lemari
  ["CWN-ANO-01", "Cawan Porselen 50 mL", "lab-anorganik", "GOOD", "50 mL · porselen tahan api"],
  ["KRS-ANO-01", "Krus Porselen & Tutup 30 mL", "lab-anorganik", "GOOD", "30 mL · pemijaran gravimetri"],
  ["TNG-ANO-01", "Tang Krus (Crucible Tongs)", "lab-anorganik", "GOOD", "Stainless steel 20 cm"],
  ["BUR-ANO-01", "Buret Asam 50 mL", "lab-anorganik", "GOOD", "50 mL · kran PTFE"],
  ["STF-ANO-01", "Statif dan Klem", "lab-anorganik", "GOOD", "Statif besi + klem buret"],
  ["BKG-ANO-01", "Beker Glass 100 mL", "lab-anorganik", "GOOD", "100 mL · borosilikat"],
  ["ERL-ANO-01", "Erlenmeyer 250 mL", "lab-anorganik", "GOOD", "250 mL · titrasi"],

  // === LAB BIOKIMIA ===
  // Instrumen
  ["CEN-001", "Centrifuge", "lab-biokimia", "GOOD", "6000 rpm · 8 tubes"],
  ["CEN-002", "Sentrifugator", "lab-biokimia", "GOOD", "12000 rpm · mikro sentrifugasi"],
  ["INC-001", "Incubator", "lab-biokimia", "GOOD", "37°C · 2 shelves"],
  ["AUT-001", "Autoclave", "lab-biokimia", "GOOD", "121°C · 50 L"],
  ["VOR-001", "Vortex Mixer", "lab-biokimia", "GOOD", "3000 rpm"],
  ["SHB-001", "Shakerbath", "lab-biokimia", "GOOD", "100°C · shaking water bath"],
  // Alat Meja & Lemari
  ["MPT-BIO-01", "Mikropipet 100-1000 uL", "lab-biokimia", "GOOD", "100-1000 uL · mikro presisi"],
  ["TBG-BIO-01", "Tabung Reaksi & Rak 16 mm", "lab-biokimia", "GOOD", "12 tabung + rak kayu"],
  ["KVT-BIO-01", "Kuvet Kuarsa 10 mm", "lab-biokimia", "GOOD", "10 mm · kuarsa UV-Vis"],
  ["BKG-BIO-01", "Beker Glass 250 mL", "lab-biokimia", "GOOD", "250 mL · borosilikat"],
  ["PPT-BIO-01", "Pipet Ukur 10 mL", "lab-biokimia", "GOOD", "10 mL · skala 0.1 mL"],
  ["KCA-BIO-01", "Kaca Arloji 80 mm", "lab-biokimia", "GOOD", "Diameter 80 mm"],

  // === LAB ANALITIK ===
  // Instrumen
  ["SPC-001", "Spectrophotometer", "lab-analitik", "GOOD", "UV-Vis · precision"],
  ["SPG-001", "Spektrofotometer Genesys", "lab-analitik", "GOOD", "UV-Vis · Genesys precision"],
  ["BAL-002", "Analytical Balance", "lab-analitik", "GOOD", "0.1 mg · 220 g max"],
  ["TMB-001", "Timbangan", "lab-analitik", "GOOD", "0.1 mg · precision balance"],
  ["PHM-001", "pH Meter", "lab-analitik", "GOOD", "0.01 pH · bench"],
  ["TRB-001", "Turbidimeter", "lab-analitik", "GOOD", "0-1000 NTU · digital bench"],
  ["SNK-001", "Sonikator", "lab-analitik", "GOOD", "40 kHz · ultrasonic cleaning bath"],
  // Alat Meja & Lemari
  ["LBU-ANA-01", "Labu Ukur 100 mL", "lab-analitik", "GOOD", "100 mL · Kelas A"],
  ["LBU-ANA-02", "Labu Ukur 50 mL", "lab-analitik", "GOOD", "50 mL · Kelas A"],
  ["BUR-ANA-01", "Buret Asam 50 mL", "lab-analitik", "GOOD", "50 mL · kran PTFE presisi"],
  ["BUR-ANA-02", "Buret Basa 50 mL", "lab-analitik", "GOOD", "50 mL · kran karet manik kaca"],
  ["PPG-ANA-01", "Pipet Gondok 25 mL", "lab-analitik", "GOOD", "25 mL · volumetri Kelas A"],
  ["PPT-ANA-01", "Pipet Ukur 10 mL", "lab-analitik", "GOOD", "10 mL · skala 0.1 mL"],

  // === LAB FISIK ===
  // Instrumen
  ["OVM-001", "Oven Memmert", "lab-fisik", "GOOD", "300°C · digital universal"],
  ["OVC-001", "Oven Carbolite", "lab-fisik", "GOOD", "250°C · forced convection"],
  ["VIS-001", "Viscometer", "lab-fisik", "GOOD", "Rotational · digital viscometer"],
  ["BTS-001", "BTS", "lab-fisik", "GOOD", "Bath Thermostat System"],
  ["SHK-001", "Shaker", "lab-fisik", "GOOD", "300 rpm · orbital platform"],
  ["STJ-001", "Stirer JOANLAB", "lab-fisik", "GOOD", "2000 rpm · digital stir plate"],
  ["HPS-002", "Hotplate Stirer", "lab-fisik", "GOOD", "350°C · magnetic stirrer"],
  ["PHM-002", "pH meter", "lab-fisik", "GOOD", "Benchtop digital · probe set"],
  // Alat Meja & Lemari
  ["PKN-FIS-01", "Piknometer Kaca 25 mL", "lab-fisik", "GOOD", "250 mL · Gay-Lussac termometer"],
  ["VOS-FIS-01", "Viskometer Ostwald", "lab-fisik", "GOOD", "Kapiler Ostwald borosilikat"],
  ["KLR-FIS-01", "Kalorimeter Sederhana", "lab-fisik", "GOOD", "Insulasi ganda + pengaduk"],
  ["TRM-FIS-01", "Termometer Lab 0-150°C", "lab-fisik", "GOOD", "0-150°C · celup sebagian"],
  ["BKG-FIS-01", "Beker Glass 250 mL", "lab-fisik", "GOOD", "250 mL · borosilikat"],
  ["ERL-FIS-01", "Erlenmeyer 100 mL", "lab-fisik", "GOOD", "100 mL · titrasi"],
  ["SPT-FIS-01", "Spatula Stainless Steel", "lab-fisik", "GOOD", "Stainless steel · 15 cm"],
];

const MAINTENANCE_NOTES = {
  "OVN-001-04": "Pengecekan door seal dan karet isolasi pintu.",
  "PHM-002-01": "Elektroda kaca perlu rekondisi KCl 3M.",
  "BUR-ANA-01-02": "Kran PTFE agak seret, beri pelumas silikon tipis.",
  "HPS-002-01": "Sensor termokopel eksternal perlu kalibrasi ulang.",
};

const UNIT_LABELS = {
  // Lab Organik
  "OVN-001": { prefix: "Unit", spec: "300°C", count: 4, location: "Gudang Instrumen Organik" },
  "HTP-001": { prefix: "Unit", spec: "340°C", count: 6, location: "Meja Praktikum Sintesis" },
  "VCM-001": { prefix: "Unit", spec: "vacuum", count: 2, location: "Meja Instrumen Vakum" },
  "HME-001": { prefix: "Unit", spec: "250 mL", count: 4, location: "Meja Praktikum Refluks" },
  "HMB-001": { prefix: "Unit", spec: "250 mL", count: 4, location: "Meja Praktikum Refluks" },
  "MPA-001": { prefix: "Unit", spec: "300°C", count: 2, location: "Meja Uji Titik Leleh" },
  "PMV-001": { prefix: "Unit", spec: "diaphragm", count: 3, location: "Lemari Asam Organik" },
  "LBR-ORG-01": { prefix: "Labu", spec: "250 mL", count: 8, location: "Rak Labu Meja Sintesis" },
  "KND-ORG-01": { prefix: "Kondensor", spec: "300 mm", count: 6, location: "Lemari Kaca Alat Gelas" },
  "CPS-ORG-01": { prefix: "Corong", spec: "250 mL", count: 6, location: "Rak Gantung Meja 1" },
  "BCN-ORG-01": { prefix: "Corong", spec: "80 mm", count: 4, location: "Laci Meja Praktikan 1" },
  "BKG-ORG-01": { prefix: "Gelas", spec: "250 mL", count: 8, location: "Meja Praktikum 1-4" },
  "ERL-ORG-01": { prefix: "Labu", spec: "250 mL", count: 8, location: "Meja Praktikum 1-4" },
  "COR-ORG-01": { prefix: "Corong", spec: "75 mm", count: 6, location: "Rak Gantung Meja 1" },
  "SPT-ORG-01": { prefix: "Spatula", spec: "15 cm", count: 8, location: "Laci Meja Praktikan 1" },

  // Lab Anorganik
  "MUF-001": { prefix: "Unit", spec: "1100°C", count: 2, location: "Ruang Furnace Khusus" },
  "FNB-001": { prefix: "Unit", spec: "1200°C", count: 2, location: "Ruang Furnace Khusus" },
  "FTL-001": { prefix: "Unit", spec: "1100°C", count: 2, location: "Ruang Furnace Khusus" },
  "DES-001": { prefix: "Shelf", spec: "silica", count: 3, location: "Ruang Desikator" },
  "WTB-001": { prefix: "Unit", spec: "80°C", count: 4, location: "Meja Pemanas Air" },
  "MCW-001": { prefix: "Unit", spec: "800W", count: 2, location: "Lemari Asam Digesti" },
  "CWN-ANO-01": { prefix: "Cawan", spec: "50 mL", count: 8, location: "Rak Porselen Meja 1" },
  "KRS-ANO-01": { prefix: "Krus", spec: "30 mL", count: 8, location: "Rak Krusibel Pemijaran" },
  "TNG-ANO-01": { prefix: "Tang", spec: "20 cm", count: 6, location: "Meja Praktikum Furnace" },
  "BUR-ANO-01": { prefix: "Buret", spec: "50 mL", count: 6, location: "Rak Buret Meja 2" },
  "STF-ANO-01": { prefix: "Statif", spec: "Klem", count: 6, location: "Meja Praktikum Titrasi" },
  "BKG-ANO-01": { prefix: "Gelas", spec: "100 mL", count: 8, location: "Meja Praktikum 1-4" },
  "ERL-ANO-01": { prefix: "Labu", spec: "250 mL", count: 8, location: "Meja Praktikum 1-4" },

  // Lab Biokimia
  "CEN-001": { prefix: "Unit", spec: "6000 rpm", count: 4, location: "Meja Sentrifugasi" },
  "CEN-002": { prefix: "Unit", spec: "12000 rpm", count: 2, location: "Meja Sentrifugasi Presisi" },
  "INC-001": { prefix: "Unit", spec: "37°C", count: 3, location: "Ruang Kultur Inkubasi" },
  "AUT-001": { prefix: "Unit", spec: "121°C", count: 2, location: "Ruang Sterilisasi Autoklaf" },
  "VOR-001": { prefix: "Unit", spec: "3000 rpm", count: 4, location: "Meja Preparasi Sampel" },
  "SHB-001": { prefix: "Unit", spec: "100°C", count: 2, location: "Meja Inkubasi Pengocok" },
  "MPT-BIO-01": { prefix: "Pipet", spec: "100-1000 uL", count: 8, location: "Rak Stand Mikropipet" },
  "TBG-BIO-01": { prefix: "Rak", spec: "12 tabung", count: 8, location: "Meja Praktikum Biokimia 1-4" },
  "KVT-BIO-01": { prefix: "Kuvet", spec: "10 mm", count: 6, location: "Kotak Penyimpanan Kuvet" },
  "BKG-BIO-01": { prefix: "Gelas", spec: "250 mL", count: 8, location: "Meja Praktikum 1-4" },
  "PPT-BIO-01": { prefix: "Pipet", spec: "10 mL", count: 8, location: "Rak Pipet Meja Biokimia" },
  "KCA-BIO-01": { prefix: "Kaca", spec: "80 mm", count: 8, location: "Laci Meja Praktikan 2" },

  // Lab Analitik
  "SPC-001": { prefix: "Station", spec: "UV-Vis", count: 3, location: "Ruang Instrumentasi Spektro" },
  "SPG-001": { prefix: "Station", spec: "Genesys", count: 2, location: "Ruang Instrumentasi Spektro" },
  "BAL-002": { prefix: "Balance", spec: "0.1 mg", count: 4, location: "Meja Anti-Getar Neraca" },
  "TMB-001": { prefix: "Balance", spec: "0.1 mg", count: 3, location: "Meja Anti-Getar Neraca" },
  "PHM-001": { prefix: "Meter", spec: "bench", count: 4, location: "Meja Uji Potensiometri" },
  "TRB-001": { prefix: "Unit", spec: "0-1000 NTU", count: 2, location: "Meja Turbidimetri" },
  "SNK-001": { prefix: "Unit", spec: "40 kHz", count: 2, location: "Meja Preparasi HPLC" },
  "LBU-ANA-01": { prefix: "Labu", spec: "100 mL", count: 8, location: "Lemari Kaca Labu Ukur" },
  "LBU-ANA-02": { prefix: "Labu", spec: "50 mL", count: 8, location: "Lemari Kaca Labu Ukur" },
  "BUR-ANA-01": { prefix: "Buret", spec: "50 mL", count: 8, location: "Meja Analisis Kuantitatif" },
  "BUR-ANA-02": { prefix: "Buret", spec: "50 mL", count: 6, location: "Meja Analisis Kuantitatif" },
  "PPG-ANA-01": { prefix: "Pipet", spec: "25 mL", count: 8, location: "Rak Pipet Gondok Presisi" },
  "PPT-ANA-01": { prefix: "Pipet", spec: "10 mL", count: 8, location: "Rak Pipet Presisi" },

  // Lab Fisik
  "OVM-001": { prefix: "Unit", spec: "300°C", count: 3, location: "Meja Termal Fisik" },
  "OVC-001": { prefix: "Unit", spec: "250°C", count: 2, location: "Meja Termal Fisik" },
  "VIS-001": { prefix: "Unit", spec: "rotational", count: 3, location: "Meja Viskometri Fluida" },
  "BTS-001": { prefix: "Unit", spec: "constant temp", count: 2, location: "Meja Sirkulasi Termostat" },
  "SHK-001": { prefix: "Unit", spec: "300 rpm", count: 2, location: "Meja Kinetika Pelarutan" },
  "STJ-001": { prefix: "Unit", spec: "2000 rpm", count: 2, location: "Meja Praktikum Fisika 1" },
  "HPS-002": { prefix: "Unit", spec: "350°C", count: 3, location: "Meja Praktikum Fisika 2" },
  "PHM-002": { prefix: "Meter", spec: "bench", count: 3, location: "Meja Elektrokimia" },
  "PKN-FIS-01": { prefix: "Piknometer", spec: "25 mL", count: 8, location: "Lemari Kaca Densitas" },
  "VOS-FIS-01": { prefix: "Viskometer", spec: "Ostwald", count: 8, location: "Rak Viskometer Kapiler" },
  "KLR-FIS-01": { prefix: "Kalorimeter", spec: "insulasi", count: 6, location: "Meja Praktikum Termodinamika" },
  "TRM-FIS-01": { prefix: "Termometer", spec: "0-150°C", count: 8, location: "Kotak Termometer Rak 1" },
  "BKG-FIS-01": { prefix: "Gelas", spec: "250 mL", count: 8, location: "Meja Praktikum Fisika 1" },
  "ERL-FIS-01": { prefix: "Labu", spec: "100 mL", count: 6, location: "Meja Praktikum Fisika 2" },
  "SPT-FIS-01": { prefix: "Spatula", spec: "15 cm", count: 6, location: "Laci Meja 1" },
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
  // Organik
  {
    code: "MAT-015",
    name: "Ethyl acetate",
    category: "Pelarut",
    unit: "mL",
    description: "Etil asetat teknis & p.a. untuk ekstraksi dan kromatografi.",
    kind: "bottle",
    palette: "solvent",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-organik", lot: "ETA-2608", quantity: 5000, expiry: "2027-08-31" },
    ],
  },
  {
    code: "MAT-016",
    name: "Chloroform",
    category: "Pelarut",
    unit: "mL",
    description: "Kloroform p.a. untuk isolasi dan ekstraksi senyawa bahan alam.",
    kind: "bottle",
    palette: "solvent",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-organik", lot: "CHL-2606", quantity: 3000, expiry: "2027-04-30" },
    ],
  },
  {
    code: "MAT-017",
    name: "Glacial acetic acid",
    category: "Reagen",
    unit: "mL",
    description: "Asam asetat glasial 99.8% untuk sintesis ester dan asetilasi.",
    kind: "bottle",
    palette: "reagent",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-organik", lot: "GAA-2610", quantity: 3500, expiry: "2028-02-28" },
    ],
  },
  // Anorganik
  {
    code: "MAT-019",
    name: "Sulfuric acid 98%",
    category: "Reagen",
    unit: "mL",
    description: "Asam sulfat pekat teknis & p.a. untuk destruksi dan katalis asam pekat.",
    kind: "bottle",
    palette: "reagent",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-anorganik", lot: "H2SO4-2611", quantity: 5000, expiry: "2028-11-30" },
    ],
  },
  {
    code: "MAT-020",
    name: "Nitric acid 65%",
    category: "Reagen",
    unit: "mL",
    description: "Asam nitrat p.a. untuk pelarutan sampel logam dan destruksi basah.",
    kind: "bottle",
    palette: "reagent",
    rule: { min: 25, increment: 25, max: 500 },
    placements: [
      { room: "lab-anorganik", lot: "HNO3-2609", quantity: 4000, expiry: "2028-05-31" },
    ],
  },
  {
    code: "MAT-022",
    name: "Tembaga(II) sulfat pentahidrat",
    category: "Reagen",
    unit: "g",
    description: "Kristal CuSO4.5H2O biru untuk sintesis senyawa kompleks koordinasi.",
    kind: "jar",
    palette: "reagent",
    rule: { min: 10, increment: 10, max: 500 },
    placements: [
      { room: "lab-anorganik", lot: "CUSO4-2608", quantity: 2000, expiry: "2029-07-31" },
    ],
  },
  // Biokimia
  {
    code: "MAT-058",
    name: "Bovine Serum Albumin (BSA)",
    category: "Biomolekul",
    unit: "g",
    description: "Fraksi V BSA untuk kurva standar kuantifikasi kadar protein.",
    kind: "jar",
    palette: "biomolecule",
    rule: { min: 1, increment: 1, max: 50 },
    placements: [
      { room: "lab-biokimia", lot: "BSA-2611", quantity: 250, expiry: "2027-10-31" },
    ],
  },
  {
    code: "MAT-059",
    name: "Reagen Bradford",
    category: "Biomolekul",
    unit: "mL",
    description: "Larutan pewarna Coomassie Brilliant Blue G-250 untuk uji Bradford.",
    kind: "bottle",
    palette: "biomolecule",
    rule: { min: 20, increment: 20, max: 500 },
    placements: [
      { room: "lab-biokimia", lot: "BRD-2610", quantity: 1500, expiry: "2027-02-28" },
    ],
  },
  {
    code: "MAT-060",
    name: "Nutrient Agar",
    category: "Biomolekul",
    unit: "g",
    description: "Media pertumbuhan padat untuk kultur bakteri dan mikroorganisme.",
    kind: "jar",
    palette: "biomolecule",
    rule: { min: 10, increment: 10, max: 500 },
    placements: [
      { room: "lab-biokimia", lot: "NUA-2609", quantity: 2000, expiry: "2028-12-31" },
    ],
  },
  // Analitik
  {
    code: "MAT-051",
    name: "Indikator Fenolftalein (PP) 1%",
    category: "Standar",
    unit: "mL",
    description: "Larutan indikator titrasi asam-basa trayek pH 8.2 - 10.0.",
    kind: "bottle",
    palette: "standard",
    rule: { min: 10, increment: 10, max: 250 },
    placements: [
      { room: "lab-analitik", lot: "PP-2610", quantity: 1000, expiry: "2028-09-30" },
    ],
  },
  {
    code: "MAT-052",
    name: "Asam oksalat dihidrat",
    category: "Standar",
    unit: "g",
    description: "Standar primer kemurnian tinggi untuk standarisasi larutan NaOH.",
    kind: "jar",
    palette: "standard",
    rule: { min: 5, increment: 5, max: 200 },
    placements: [
      { room: "lab-analitik", lot: "OXA-2608", quantity: 1000, expiry: "2029-04-30" },
    ],
  },
  {
    code: "MAT-053",
    name: "EDTA dinatrium garam",
    category: "Reagen",
    unit: "g",
    description: "Garam Na2EDTA untuk titrasi kompleksometri penentuan kesadahan air.",
    kind: "jar",
    palette: "reagent",
    rule: { min: 10, increment: 10, max: 500 },
    placements: [
      { room: "lab-analitik", lot: "EDTA-2607", quantity: 1500, expiry: "2029-01-31" },
    ],
  },
  // Fisik
  {
    code: "MAT-066",
    name: "Gliserol 99%",
    category: "Umum",
    unit: "mL",
    description: "Cairan kental murni untuk kalibrasi viskometer dan penentuan indeks bias.",
    kind: "bottle",
    palette: "general",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-fisik", lot: "GLY-2609", quantity: 3000, expiry: "2028-03-31" },
    ],
  },
  {
    code: "MAT-067",
    name: "Sukrosa kristal murni",
    category: "Umum",
    unit: "g",
    description: "Sukrosa murni untuk larutan bertingkat densitas dan uji kalorimetri.",
    kind: "jar",
    palette: "general",
    rule: { min: 25, increment: 25, max: 1000 },
    placements: [
      { room: "lab-fisik", lot: "SUC-2610", quantity: 2500, expiry: "2029-06-30" },
    ],
  },
  {
    code: "MAT-068",
    name: "Minyak parafin cair",
    category: "Standar",
    unit: "mL",
    description: "Parafin cair untuk penangas minyak dan studi fluida viskositas tinggi.",
    kind: "bottle",
    palette: "standard",
    rule: { min: 50, increment: 50, max: 1000 },
    placements: [
      { room: "lab-fisik", lot: "PAR-2608", quantity: 2000, expiry: "2028-10-31" },
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

async function upsertEquipmentType(client, [name, category, usageType, classification, description, shape, tone]) {
  const art = await writeArtwork(client, `equipment-${shape}`, equipmentArt(shape, tone));
  const existing = await client.query(
    "SELECT id FROM equipment_type WHERE name = $1",
    [name],
  );
  if (existing.rowCount > 0) {
    await client.query(
      "UPDATE equipment_type SET category = $2, usage_type = $3, classification = $4, description = $5, image_media_id = $6 WHERE id = $1",
      [existing.rows[0].id, category, usageType, classification, description, art],
    );
    return existing.rows[0].id;
  }
  const inserted = await client.query(
    "INSERT INTO equipment_type (name, category, usage_type, classification, description, image_media_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [name, category, usageType, classification, description, art],
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

async function upsertUnit(client, assetId, code, label, notes, storageLocation, qrCode) {
  const existing = await client.query(
    "SELECT id, storage_location, qr_code FROM equipment_unit WHERE code = $1",
    [code],
  );
  if (existing.rowCount > 0) {
    await client.query(
      "UPDATE equipment_unit SET equipment_asset_id = $2, label = $3, notes = $4, storage_location = COALESCE($5, storage_location), qr_code = COALESCE(qr_code, $6), active = true WHERE id = $1",
      [existing.rows[0].id, assetId, label, notes ?? null, storageLocation ?? null, qrCode ?? null],
    );
    return;
  }
  await client.query(
    "INSERT INTO equipment_unit (equipment_asset_id, code, label, status, notes, storage_location, qr_code, active) VALUES ($1, $2, $3, $4, $5, $6, $7, true)",
    [assetId, code, label, notes ? "MAINTENANCE" : "AVAILABLE", notes ?? null, storageLocation ?? null, qrCode ?? null],
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

async function upsertBatch(client, materialId, roomId, placement, defaultStorage) {
  const storageLocation = placement.storage ?? defaultStorage ?? "Gudang Reagen";
  const qrCode = `RK-MAT-${placement.lot}`;
  const existing = await client.query(
    "SELECT id FROM material_batch WHERE material_id = $1 AND lot_number = $2",
    [materialId, placement.lot],
  );
  if (existing.rowCount > 0) {
    await client.query(
      "UPDATE material_batch SET room_id = $2, storage_location = COALESCE(storage_location, $3), qr_code = COALESCE(qr_code, $4), active = true WHERE id = $1",
      [existing.rows[0].id, roomId, storageLocation, qrCode],
    );
    return;
  }
  await client.query(
    "INSERT INTO material_batch (material_id, room_id, lot_number, quantity, expiry_date, storage_location, qr_code, active) VALUES ($1, $2, $3, $4, $5, $6, $7, true)",
    [materialId, roomId, placement.lot, placement.quantity, placement.expiry, storageLocation, qrCode],
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
    const { prefix, spec, count, location } = UNIT_LABELS[asset[0]];
    const defaultStorage = location ?? "Gudang Instrumen";
    for (let index = 1; index <= count; index += 1) {
      const number = String(index).padStart(2, "0");
      const code = `${asset[0]}-${number}`;
      const qrCode = `RK-UNT-${code}`;
      await upsertUnit(
        client,
        assetId,
        code,
        `${prefix} ${number} · ${spec}`,
        MAINTENANCE_NOTES[code],
        defaultStorage,
        qrCode,
      );
    }
  }

  for (const material of MATERIALS) {
    const materialId = await upsertMaterial(client, material);
    const defaultStorage = material.category === "Pelarut" ? "Lemari Asam / B3" : "Gudang Reagen Rak A";
    for (const placement of material.placements) {
      await upsertBatch(client, materialId, roomIds[placement.room], placement, defaultStorage);
    }
  }

  // Ensure all units and batches have non-null QR codes
  await client.query("UPDATE equipment_unit SET qr_code = 'RK-UNT-' || code WHERE qr_code IS NULL");
  await client.query("UPDATE material_batch SET qr_code = 'RK-MAT-' || COALESCE(lot_number, SUBSTRING(id::text, 1, 8)) WHERE qr_code IS NULL");

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
