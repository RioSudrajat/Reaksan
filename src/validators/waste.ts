import { z } from "zod";

export const wastePhysicalStateValues = ["LIQUID", "SOLID"] as const;
export const wasteContainerStatusValues = [
  "ACTIVE",
  "FULL",
  "SEALED",
  "IN_TPS",
  "DISPOSED",
  "ARCHIVED",
] as const;
export const wasteLogStatusValues = [
  "LOGGED",
  "VERIFIED",
  "REJECTED",
] as const;

export const createWasteContainerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Kode minimal 2 karakter")
    .max(50)
    .optional(),
  roomId: z.string().uuid("ID ruangan tidak valid"),
  categoryId: z.string().uuid("ID kategori tidak valid"),
  name: z.string().trim().min(2, "Nama wadah minimal 2 karakter").max(100),
  maxCapacity: z.coerce
    .number()
    .positive("Kapasitas maksimal harus lebih dari 0")
    .max(1000, "Kapasitas maksimal 1000 L/kg"),
  unit: z.string().trim().default("L"),
  locationNotes: z.string().trim().max(255).optional(),
});

export const updateWasteContainerSchema = z.object({
  name: z.string().trim().min(2, "Nama wadah minimal 2 karakter").max(100).optional(),
  categoryId: z.string().uuid("ID kategori tidak valid").optional(),
  maxCapacity: z.coerce
    .number()
    .positive("Kapasitas maksimal harus lebih dari 0")
    .max(1000)
    .optional(),
  unit: z.string().trim().max(20).optional(),
  locationNotes: z.string().trim().max(255).optional(),
  status: z.enum(wasteContainerStatusValues).optional(),
});

export const logWasteDisposalSchema = z.object({
  containerId: z.string().uuid("ID wadah tidak valid"),
  requestId: z.string().uuid("ID permohonan tidak valid").optional(),
  quantity: z.coerce
    .number()
    .positive("Volume/kuantitas limbah harus lebih dari 0")
    .max(1000),
  unit: z.string().trim().default("L"),
  chemicalDescription: z
    .string()
    .trim()
    .min(3, "Deskripsi zat kimia sisa minimal 3 karakter")
    .max(255),
  notes: z.string().trim().max(255).optional(),
});

export const verifyWasteLogSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  quantity: z.coerce.number().positive().optional(),
  notes: z.string().trim().max(255).optional(),
});

export const wasteReportPeriodEnum = z.enum([
  "monthly",
  "semester",
  "quarterly",
  "custom",
]);

export const wasteExportQuerySchema = z.object({
  room: z.string().trim().optional(),
  container: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.enum(wasteLogStatusValues).optional(),
  period: wasteReportPeriodEnum.default("monthly"),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/, "Format bulan harus YYYY-MM").optional(),
  semester: z.enum(["ganjil", "genap"]).optional(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
  year: z.coerce.number().int().min(2020).max(2050).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

export const sealAndRolloverSchema = z.object({
  createNew: z.boolean().default(true),
  newName: z.string().trim().min(2, "Nama wadah baru minimal 2 karakter").max(100).optional(),
});

export const moveToTpsSchema = z.object({
  containerIds: z.array(z.string().uuid("ID wadah tidak valid")).min(1, "Pilih minimal 1 wadah"),
  notes: z.string().trim().max(255).optional(),
});

export const createWasteManifestSchema = z.object({
  manifestNumber: z
    .string()
    .trim()
    .min(2, "Nomor manifest / Festronik wajib diisi")
    .max(100),
  transporterName: z
    .string()
    .trim()
    .min(2, "Nama vendor transporter/pengolah B3 wajib diisi")
    .max(150),
  driverName: z.string().trim().max(100).optional(),
  vehiclePlate: z.string().trim().max(50).optional(),
  containerIds: z
    .array(z.string().uuid("ID wadah tidak valid"))
    .min(1, "Pilih minimal 1 wadah untuk diserahterimakan"),
  notes: z.string().trim().max(255).optional(),
});

export const batchVerifyWasteLogSchema = z.object({
  logIds: z
    .array(z.string().uuid("ID log tidak valid"))
    .min(1, "Pilih minimal 1 log untuk diverifikasi"),
  status: z.enum(["VERIFIED", "REJECTED"]),
  notes: z.string().trim().max(255).optional(),
});

export type CreateWasteContainerInput = z.infer<typeof createWasteContainerSchema>;
export type UpdateWasteContainerInput = z.infer<typeof updateWasteContainerSchema>;
export type LogWasteDisposalInput = z.infer<typeof logWasteDisposalSchema>;
export type VerifyWasteLogInput = z.infer<typeof verifyWasteLogSchema>;
export type WasteExportQuery = z.infer<typeof wasteExportQuerySchema>;
export type SealAndRolloverInput = z.infer<typeof sealAndRolloverSchema>;
export type MoveToTpsInput = z.infer<typeof moveToTpsSchema>;
export type CreateWasteManifestInput = z.infer<typeof createWasteManifestSchema>;
export type BatchVerifyWasteLogInput = z.infer<typeof batchVerifyWasteLogSchema>;
