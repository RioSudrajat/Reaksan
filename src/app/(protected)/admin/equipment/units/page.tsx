import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { EmptyState, PageHeader, Panel } from "@/components/workspace";
import {
  listEquipmentAssetsAdmin,
  listEquipmentUnitsAdmin,
} from "@/services/admin.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Equipment Units" };

const statusOptions = [
  "AVAILABLE",
  "RESERVED",
  "IN_USE",
  "MAINTENANCE",
  "DAMAGED",
  "UNDER_INSPECTION",
  "RETIRED",
].map((status) => ({ value: status, label: status.replaceAll("_", " ") }));

const conditionOptions = ["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"].map(
  (condition) => ({
    value: condition,
    label: condition.replaceAll("_", " "),
  }),
);

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminEquipmentUnitsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission({ equipment: ["manage-any"] });
  const params = await searchParams;
  const filterAsset = pick(params, "asset");
  const filterStatus = pick(params, "status");

  const [assets, allUnits] = await Promise.all([
    listEquipmentAssetsAdmin(),
    listEquipmentUnitsAdmin(filterAsset),
  ]);

  const units = allUnits.filter((unit) => {
    if (filterStatus && unit.status !== filterStatus) return false;
    return true;
  });

  const assetOptions = assets.map((asset) => ({
    value: asset.assetCode,
    label: `${asset.assetCode} · ${asset.typeName} (${asset.roomName})`,
  }));

  const maintenanceCount = allUnits.filter(
    (u) => u.status === "MAINTENANCE" || u.status === "DAMAGED",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Equipment units"
        description="Unit fisik membawa nomor seri, label identitas, dan status operasional spesifik. Unit yang siap digunakan berstatus AVAILABLE, sementara unit yang rusak atau diperbaiki berstatus MAINTENANCE."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/equipment/assets"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              ← Kembali ke Asset
            </Link>
          </div>
        }
      />

      <Panel context="Tambah" title="Unit fisik baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/equipment-units"
          columns={3}
          fields={[
            {
              name: "assetCode",
              label: "Equipment asset",
              type: "select",
              required: true,
              options: assetOptions,
              defaultValue: filterAsset ?? (assetOptions[0]?.value ?? ""),
            },
            {
              name: "code",
              label: "Kode unit unik",
              required: true,
              placeholder: "OVN-001-U03",
            },
            {
              name: "label",
              label: "Label / Nama unit",
              required: true,
              placeholder: "Unit 03 (Ruang Lab Kimia)",
            },
            {
              name: "status",
              label: "Status awal",
              type: "select",
              options: statusOptions,
              defaultValue: "AVAILABLE",
            },
            {
              name: "condition",
              label: "Kondisi",
              type: "select",
              options: conditionOptions,
              defaultValue: "GOOD",
            },
            {
              name: "notes",
              label: "Catatan (opsional)",
              placeholder: "Contoh: Rak C baris 2",
            },
            {
              name: "active",
              label: "Aktif",
              type: "checkbox",
              defaultValue: true,
            },
          ]}
          submitLabel="Tambah unit fisik"
          successMessage="Unit fisik berhasil ditambahkan."
        />
      </Panel>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#212121]">
            Daftar Unit Fisik
          </h2>
          <p className="text-[12px] text-[#6B6B6B]">
            Menampilkan {units.length} dari {allUnits.length} unit. {maintenanceCount} unit sedang dalam pemeliharaan (MAINTENANCE).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterAsset && (
            <Link
              href="/admin/equipment/units"
              className="inline-flex min-h-9 items-center rounded-lg border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#6B6B6B] hover:bg-[#F5F5F5]"
            >
              Hapus filter asset
            </Link>
          )}
          {filterStatus && (
            <Link
              href={filterAsset ? `/admin/equipment/units?asset=${filterAsset}` : "/admin/equipment/units"}
              className="inline-flex min-h-9 items-center rounded-lg border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#6B6B6B] hover:bg-[#F5F5F5]"
            >
              Hapus filter status
            </Link>
          )}
          {!filterStatus && maintenanceCount > 0 && (
            <Link
              href={filterAsset ? `/admin/equipment/units?asset=${filterAsset}&status=MAINTENANCE` : "/admin/equipment/units?status=MAINTENANCE"}
              className="inline-flex min-h-9 items-center rounded-lg border border-[#F5D0D0] bg-[#FFF7F7] px-3 text-[11px] font-bold text-[#9E3636] hover:bg-[#FDE9E9]"
            >
              Filter Unit Maintenance ({maintenanceCount})
            </Link>
          )}
        </div>
      </div>

      <Panel context={`${units.length} unit`} title="Semua Unit Fisik" padded={false}>
        {units.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada unit fisik"
              description="Tambahkan unit pertama lewat formulir di atas."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Daftar unit fisik alat laboratorium</caption>
              <thead>
                <tr className="border-b border-[#EEEEEE] bg-[#FAFAF8] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                  <th scope="col" className="px-4 py-3 font-semibold">Kode Unit</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Label</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Asset Induk</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Kondisi</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Catatan</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-[#FAFAF8]">
                    <th scope="row" className="px-4 py-3 font-mono text-[12px] font-bold text-[#212121]">
                      {unit.code}
                    </th>
                    <td className="px-4 py-3 text-[12px] text-[#212121]">
                      {unit.label}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#212121]">
                      <span className="font-semibold">{unit.assetCode}</span>
                      <span className="text-[#6B6B6B]"> · {unit.assetName}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                          unit.status === "AVAILABLE" &&
                            "bg-[#E5F5ED] text-[#03683A]",
                          unit.status === "MAINTENANCE" &&
                            "bg-[#FDE9E9] text-[#9E3636]",
                          unit.status === "DAMAGED" &&
                            "bg-[#FDE9E9] text-[#9E3636]",
                          unit.status !== "AVAILABLE" &&
                            unit.status !== "MAINTENANCE" &&
                            unit.status !== "DAMAGED" &&
                            "bg-[#E9EEFC] text-[#38529B]",
                        )}
                      >
                        {unit.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#212121]">
                      {unit.condition.replaceAll("_", " ")}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[12px] text-[#6B6B6B]">
                      {unit.notes || "-"}
                      {!unit.active ? " (nonaktif)" : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EditDisclosure label="Edit">
                        <div className="w-80 text-left">
                          <h4 className="mb-2 text-[13px] font-bold text-[#212121]">
                            Ubah Unit {unit.code}
                          </h4>
                          <CrudForm
                            endpoint={`/api/admin/equipment-units/${unit.id}`}
                            method="PATCH"
                            resetOnSuccess={false}
                            columns={1}
                            fields={[
                              {
                                name: "code",
                                label: "Kode unit",
                                defaultValue: unit.code,
                                required: true,
                              },
                              {
                                name: "label",
                                label: "Label unit",
                                defaultValue: unit.label,
                                required: true,
                              },
                              {
                                name: "status",
                                label: "Status operasional",
                                type: "select",
                                options: statusOptions,
                                defaultValue: unit.status,
                              },
                              {
                                name: "condition",
                                label: "Kondisi fisik",
                                type: "select",
                                options: conditionOptions,
                                defaultValue: unit.condition ?? "GOOD",
                              },
                              {
                                name: "notes",
                                label: "Catatan perbaikan / lokasi",
                                defaultValue: unit.notes ?? "",
                              },
                              {
                                name: "active",
                                label: "Aktif",
                                type: "checkbox",
                                defaultValue: unit.active,
                              },
                            ]}
                            submitLabel="Simpan perubahan unit"
                            successMessage="Unit berhasil diperbarui."
                          />
                        </div>
                      </EditDisclosure>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
