import type { Metadata } from "next";
import { CrudForm } from "@/components/admin/crud-form";
import { PageHeader, Panel } from "@/components/workspace";
import { getAppSettings } from "@/services/settings.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Konfigurasi Sistem · Admin Reaksan" };

const timezoneOptions = [
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)" },
  { value: "Asia/Makassar", label: "Asia/Makassar (WITA)" },
  { value: "Asia/Jayapura", label: "Asia/Jayapura (WIT)" },
  { value: "UTC", label: "UTC" },
];

export default async function AdminConfigurationPage() {
  await requirePermission({ configuration: ["manage-any"] });
  const settings = await getAppSettings();

  return (
    <>
      <PageHeader
        eyebrow="Operasional & Pengaturan"
        title="Konfigurasi Sistem Laboratorium"
        description="Parameter operasional global yang berlaku untuk seluruh workspace laboratorium FMIPA Kimia Unpad. Setiap modifikasi kebijakan terekam dalam log audit."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel context="Operasional Lab" title="Kebijakan Layanan & Inventaris">
          <CrudForm
            endpoint="/api/admin/configuration"
            method="PATCH"
            resetOnSuccess={false}
            columns={1}
            fields={[
              {
                name: "cancellation_lead_time_minutes",
                label: "Batas pembatalan (menit sebelum jadwal)",
                type: "number",
                defaultValue: settings.cancellation_lead_time_minutes,
                help: "Waktu minimal sebelum sesi praktikum di mana mahasiswa masih diperbolehkan membatalkan permohonan.",
              },
              {
                name: "low_stock_ratio",
                label: "Rasio stok menipis (low-stock ratio)",
                type: "number",
                step: "0.1",
                defaultValue: settings.low_stock_ratio,
                help: "Pengali batas minimum. Contoh 2 berarti bahan ditandai menipis ketika stok kurang dari 2× batas minimum.",
              },
              {
                name: "timezone",
                label: "Zona Waktu Sistem",
                type: "select",
                options: timezoneOptions,
                defaultValue: settings.timezone,
              },
            ]}
            submitLabel="Simpan Kebijakan Operasional"
            successMessage="Konfigurasi kebijakan operasional berhasil diperbarui."
          />
        </Panel>

        <Panel context="Pemberitahuan" title="Kebijakan Notifikasi Otomatis">
          <CrudForm
            endpoint="/api/admin/configuration"
            method="PATCH"
            resetOnSuccess={false}
            columns={1}
            fields={[
              {
                name: "notification_policy.request_submitted",
                label: "Kirim notifikasi ke PLP saat ada permohonan baru dari mahasiswa",
                type: "checkbox",
                defaultValue: settings.notification_policy.request_submitted,
              },
              {
                name: "notification_policy.request_decision",
                label: "Kirim notifikasi keputusan review (disetujui/ditolak) ke mahasiswa",
                type: "checkbox",
                defaultValue: settings.notification_policy.request_decision,
              },
              {
                name: "notification_policy.incident_reported",
                label: "Kirim notifikasi laporan insiden laboratorium ke teknisi PLP",
                type: "checkbox",
                defaultValue: settings.notification_policy.incident_reported,
              },
            ]}
            submitLabel="Simpan Kebijakan Notifikasi"
            successMessage="Kebijakan notifikasi berhasil diperbarui."
          />
          <p className="mt-4 rounded-xl bg-[#F5F5F5] p-3 text-[11px] leading-4 text-[#6B6B6B]">
            Catatan: Pengaturan ini menjadi standar operasional Reaksan FMIPA Kimia Unpad. Notifikasi transaksional esensial (persetujuan peminjaman, pelaporan insiden, dan pengembalian bahan) tetap aktif demi kelancaran alur kerja.
          </p>
        </Panel>
      </div>
    </>
  );
}
