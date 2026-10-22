INSERT INTO "waste_category" ("code", "name", "physical_state", "description", "hazard_badge", "color_hex", "active")
VALUES
  ('CAIR', 'Cair (Limbah Cair)', 'LIQUID', 'Limbah kimia dan larutan cair B3.', 'B3 CAIR', '#0284c7', true),
  ('PADAT', 'Padat (Limbah Padat)', 'SOLID', 'Limbah padatan, residu kristal, dan material terkontaminasi B3.', 'B3 PADAT', '#e11d48', true),
  ('ACID', 'Limbah Asam Anorganik', 'LIQUID', 'Sisa asam mineral seperti HCl, H2SO4, HNO3 encer, H3PO4 (pH < 2).', 'CORROSIVE', '#ea580c', true),
  ('BASE', 'Limbah Basa Anorganik', 'LIQUID', 'Sisa larutan alkali seperti NaOH, KOH, NH4OH (pH > 10).', 'CORROSIVE', '#2563eb', true),
  ('ORG-NONHALO', 'Pelarut Organik Non-Halogen', 'LIQUID', 'Pelarut mudah terbakar seperti Etanol, Aseton, n-Heksana, Toluena.', 'FLAMMABLE', '#dc2626', true),
  ('ORG-HALO', 'Pelarut Organik Terhalogenasi', 'LIQUID', 'Pelarut klorinasi seperti Kloroform (CHCl3), Diklorometana (DCM).', 'TOXIC', '#9333ea', true),
  ('COMPLEX-MET', 'Senyawa Kompleks & Logam Berat', 'LIQUID', 'Sisa titrasi kompleksometri (EDTA), ion Cu, Ni, Cr, Pb, Fe.', 'ECO-TOXIC', '#d97706', true),
  ('BATTERY', 'Limbah Baterai & Sel Elektrokimia', 'SOLID', 'Baterai Li-ion, sel aki, sel galvanik eksperimen energi.', 'CORROSIVE/HEAT', '#52525b', true),
  ('HPLC-ELUENT', 'Limbah Fase Gerak HPLC', 'LIQUID', 'Campuran efluen HPLC (Metanol, Asetonitril, Air).', 'FLAMMABLE/TOXIC', '#0d9488', true),
  ('BIO-REAGENT', 'Residu Reagen Biokimia & Cu', 'LIQUID', 'Sisa reagen Biuret, reagen warna uji protein & enzim.', 'IRRITANT', '#059669', true),
  ('BIO-SHARPS', 'Benda Tajam & Tip Mikropipet', 'SOLID', 'Tip mikropipet bekas, cover glass, tabung mikrosentrifus.', 'BIOHAZARD/SHARPS', '#ca8a04', true),
  ('SOLID-B3', 'Limbah Padat B3 Terkontaminasi', 'SOLID', 'Kertas saring terkontaminasi, sarung tangan nitril, silica gel.', 'HAZARDOUS', '#78716c', true)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "physical_state" = EXCLUDED."physical_state",
  "description" = EXCLUDED."description",
  "hazard_badge" = EXCLUDED."hazard_badge",
  "color_hex" = EXCLUDED."color_hex",
  "active" = true,
  "updated_at" = now();
