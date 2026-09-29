import type { Metadata } from "next";
import { CrudForm } from "@/components/admin/crud-form";
import { PageHeader, Panel } from "@/components/workspace";
import { getAppSettings } from "@/services/settings.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Configuration" };

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
        eyebrow="Operasional"
        title="Configuration"
        description="Aturan operasional yang dipakai PLP dan student workspace. Perubahan tercatat di audit log."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel context="Fulfillment" title="Kebijakan operasional">
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
                help: "Dipakai sebagai acuan kebijakan saat request dibatalkan.",
              },
              {
                name: "low_stock_ratio",
                label: "Rasio low stock terhadap rule minimum",
                type: "number",
                step: "0.1",
                defaultValue: settings.low_stock_ratio,
                help: "Contoh 2 berarti material dianggap menipis saat tersedia kurang dari dua kali minimum.",
              },
              {
                name: "timezone",
                label: "Timezone tampilan",
                type: "select",
                options: timezoneOptions,
                defaultValue: settings.timezone,
              },
            ]}
            submitLabel="Simpan konfigurasi"
            successMessage="Konfigurasi tersimpan."
          />
        </Panel>

        <Panel context="Notifikasi" title="Notification policy">
          <CrudForm
            endpoint="/api/admin/configuration"
            method="PATCH"
            resetOnSuccess={false}
            columns={1}
            fields={[
              {
                name: "notification_policy.request_submitted",
                label: "Kirim notifikasi saat request baru dikirim",
                type: "checkbox",
                defaultValue: settings.notification_policy.request_submitted,
              },
              {
                name: "notification_policy.request_decision",
                label: "Kirim notifikasi keputusan review ke student",
                type: "checkbox",
                defaultValue: settings.notification_policy.request_decision,
              },
              {
                name: "notification_policy.incident_reported",
                label: "Kirim notifikasi incident baru ke PLP",
                type: "checkbox",
                defaultValue: settings.notification_policy.incident_reported,
              },
            ]}
            submitLabel="Simpan notifikasi"
            successMessage="Notification policy tersimpan."
          />
          <p className="mt-4 rounded-xl bg-[#F5F5F5] p-3 text-[11px] leading-4 text-[#6B6B6B]">
            Catatan: policy disimpan sebagai konfigurasi resmi. Notifikasi
            transaksional inti (approval, issue, return) tetap dikirim agar
            alur kerja tidak putus.
          </p>
        </Panel>
      </div>
    </>
  );
}
