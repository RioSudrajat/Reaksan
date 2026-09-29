import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { CatalogImage } from "@/components/catalog-image";
import { EmptyState, PageHeader, Panel } from "@/components/workspace";
import {
  listEquipmentAssetsAdmin,
  listEquipmentTypes,
  listRoomsAdmin,
} from "@/services/admin.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Equipment Assets" };

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

export default async function AdminEquipmentAssetsPage() {
  await requirePermission({ equipment: ["manage-any"] });
  const [assets, types, rooms] = await Promise.all([
    listEquipmentAssetsAdmin(),
    listEquipmentTypes(),
    listRoomsAdmin(),
  ]);

  const typeOptions = types.map((type) => ({
    value: type.id,
    label: `${type.name} (${type.usageType === "BORROWABLE" ? "borrowable" : "usage only"})`,
  }));

  const roomOptions = rooms.map((room) => ({
    value: room.code,
    label: room.name,
  }));

  const totalAssets = assets.length;
  const totalUnits = assets.reduce(
    (sum, a) => sum + (a.unitCount ?? a.units?.length ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Equipment assets"
        description="Equipment Asset adalah entitas penempatan jenis alat di ruangan tertentu. Setiap asset memiliki unit fisik (stok bernomor seri) yang terdaftar dan siap direservasi."
        actions={
          <Link
            href="/admin/equipment/units"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Kelola Semua Unit Fisik →
          </Link>
        }
      />

      <Panel context="Tambah" title="Asset baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/equipment-assets"
          columns={3}
          fields={[
            {
              name: "equipmentTypeId",
              label: "Equipment type",
              type: "select",
              required: true,
              options: typeOptions,
            },
            {
              name: "roomCode",
              label: "Room",
              type: "select",
              required: true,
              options: roomOptions,
            },
            {
              name: "assetCode",
              label: "Kode asset",
              required: true,
              placeholder: "OVN-003",
            },
            { name: "serialNumber", label: "Serial number" },
            {
              name: "status",
              label: "Status",
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
            { name: "notes", label: "Catatan", type: "textarea" },
            {
              name: "active",
              label: "Aktif",
              type: "checkbox",
              defaultValue: true,
            },
            { name: "imageMediaId", label: "Gambar", type: "hidden" },
          ]}
          submitLabel="Tambah asset"
          successMessage="Asset ditambahkan."
        >
          <ImageUploadField help="Opsional. Secara default, asset otomatis menggunakan foto katalog dari Equipment Type terpilih. Unggah di sini hanya jika ingin foto kustom khusus asset ini." />
        </CrudForm>
      </Panel>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#212121]">
            Daftar Aset per Ruangan
          </h2>
          <p className="text-[12px] text-[#6B6B6B]">
            Total {totalAssets} asset terdaftar dengan {totalUnits} unit fisik di seluruh laboratorium.
          </p>
        </div>
      </div>

      {totalAssets === 0 ? (
        <Panel title="Daftar" padded={true}>
          <EmptyState
            title="Belum ada asset"
            description="Tambahkan asset pertama lewat formulir di atas."
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {rooms.map((room) => {
            const roomAssets = assets.filter((a) => a.roomCode === room.code);
            if (roomAssets.length === 0) return null;
            const roomTotalUnits = roomAssets.reduce(
              (sum, a) => sum + (a.unitCount ?? a.units?.length ?? 0),
              0,
            );

            return (
              <div
                key={room.code}
                className="overflow-hidden rounded-2xl border border-[#E1E1E1] bg-white shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEEEEE] bg-[#FAFAF8] px-5 py-3.5">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#212121]">
                      {room.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                      Kode ruangan: <span className="font-semibold text-[#212121]">{room.code}</span> · {roomAssets.length} asset terdaftar · {roomTotalUnits} unit fisik
                    </p>
                  </div>
                  <span className="rounded-xl border border-[#E1E1E1] bg-white px-3 py-1 text-[11px] font-bold text-[#212121]">
                    {roomTotalUnits} Unit Fisik
                  </span>
                </div>

                <ul className="divide-y divide-[#EEEEEE]">
                  {roomAssets.map((asset) => (
                    <li key={asset.id} className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3.5">
                          <div className="relative shrink-0">
                            <CatalogImage
                              mediaId={asset.imageMediaId}
                              alt={`Gambar ${asset.assetCode}`}
                              size={58}
                            />
                            {!asset.assetImageMediaId && (
                              <span
                                title="Foto diwarisi dari tipe induk"
                                className="absolute -bottom-1 -right-1 rounded-md border border-[#D5DFFA] bg-[#EEF1F8] px-1 py-0.2 text-[8px] font-bold text-[#38529B]"
                              >
                                Tipe
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-[#212121] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
                                {asset.assetCode}
                              </span>
                              <strong className="text-[14px] font-bold text-[#212121]">
                                {asset.typeName}
                              </strong>
                              <span className="rounded-md border border-[#E1E1E1] bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-medium text-[#6B6B6B]">
                                {asset.usageType === "BORROWABLE"
                                  ? "Dapat Dipinjam"
                                  : "Pakai di Tempat"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#6B6B6B]">
                              Kondisi:{" "}
                              <span className="font-semibold text-[#212121]">
                                {asset.condition.replaceAll("_", " ")}
                              </span>{" "}
                              · Status:{" "}
                              <span className="font-semibold text-[#212121]">
                                {asset.status.replaceAll("_", " ")}
                              </span>{" "}
                              · {asset.unitCount} unit fisik
                            </p>
                            {asset.notes && (
                              <p className="mt-1 text-[12px] text-[#6B6B6B]">
                                {asset.notes}
                              </p>
                            )}

                            {/* Daftar unit fisik di bawah asset */}
                            <div className="mt-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#929292]">
                                  Unit Fisik Terdaftar ({asset.units?.length ?? 0}):
                                </p>
                                <EditDisclosure label="+ Tambah Unit">
                                  <div className="mb-2">
                                    <h4 className="text-[13px] font-bold text-[#212121]">
                                      Tambah unit fisik untuk {asset.assetCode}
                                    </h4>
                                    <p className="text-[11px] text-[#6B6B6B]">
                                      Unit fisik memiliki kode unik dan nomor seri nyata untuk dipinjam/direservasi.
                                    </p>
                                  </div>
                                  <CrudForm
                                    endpoint="/api/admin/equipment-units"
                                    columns={2}
                                    fields={[
                                      {
                                        name: "assetCode",
                                        label: "Asset code",
                                        type: "hidden",
                                        defaultValue: asset.assetCode,
                                      },
                                      {
                                        name: "code",
                                        label: "Kode unit",
                                        required: true,
                                        placeholder: `${asset.assetCode}-U${String((asset.units?.length ?? 0) + 1).padStart(2, "0")}`,
                                        defaultValue: `${asset.assetCode}-U${String((asset.units?.length ?? 0) + 1).padStart(2, "0")}`,
                                      },
                                      {
                                        name: "label",
                                        label: "Label unit",
                                        required: true,
                                        placeholder: `Unit ${String((asset.units?.length ?? 0) + 1).padStart(2, "0")}`,
                                        defaultValue: `Unit ${String((asset.units?.length ?? 0) + 1).padStart(2, "0")}`,
                                      },
                                      {
                                        name: "status",
                                        label: "Status",
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
                                        placeholder: "Contoh: Di rak A3",
                                      },
                                      {
                                        name: "active",
                                        label: "Aktif",
                                        type: "checkbox",
                                        defaultValue: true,
                                      },
                                    ]}
                                    submitLabel="Simpan unit"
                                    successMessage="Unit berhasil ditambahkan."
                                  />
                                </EditDisclosure>
                              </div>

                              {(!asset.units || asset.units.length === 0) ? (
                                <p className="mt-1 text-[11px] text-[#9E3636]">
                                  Belum ada unit fisik. Klik <strong>+ Tambah Unit</strong> di atas agar alat ini memiliki stok yang bisa direservasi.
                                </p>
                              ) : (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {asset.units.map((unit) => (
                                    <div
                                      key={unit.id}
                                      className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-[#FAFAF8] p-1.5 text-[11px]"
                                    >
                                      <span className="font-mono font-bold text-[#212121]">
                                        {unit.code}
                                      </span>
                                      <span className="text-[#6B6B6B]">
                                        {unit.label}
                                      </span>
                                      <span
                                        className={cn(
                                          "rounded px-1.5 py-0.2 text-[9px] font-bold",
                                          unit.status === "AVAILABLE" &&
                                            "bg-[#E5F5ED] text-[#03683A]",
                                          unit.status === "MAINTENANCE" &&
                                            "bg-[#FDE9E9] text-[#9E3636]",
                                          unit.status !== "AVAILABLE" &&
                                            unit.status !== "MAINTENANCE" &&
                                            "bg-[#E9EEFC] text-[#38529B]",
                                        )}
                                      >
                                        {unit.status}
                                      </span>
                                      <EditDisclosure label="Edit">
                                        <div className="w-72">
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
                                                label: "Status",
                                                type: "select",
                                                options: statusOptions,
                                                defaultValue: unit.status,
                                              },
                                              {
                                                name: "condition",
                                                label: "Kondisi",
                                                type: "select",
                                                options: conditionOptions,
                                                defaultValue: unit.condition ?? "GOOD",
                                              },
                                              {
                                                name: "notes",
                                                label: "Catatan",
                                                defaultValue: unit.notes ?? "",
                                              },
                                            ]}
                                            submitLabel="Simpan status"
                                            successMessage="Status unit diperbarui."
                                          />
                                        </div>
                                      </EditDisclosure>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <EditDisclosure>
                          <CrudForm
                            endpoint={`/api/admin/equipment-assets/${asset.id}`}
                            method="PATCH"
                            resetOnSuccess={false}
                            columns={3}
                            fields={[
                              {
                                name: "equipmentTypeId",
                                label: "Equipment type",
                                type: "select",
                                options: typeOptions,
                                defaultValue: asset.equipmentTypeId,
                              },
                              {
                                name: "roomCode",
                                label: "Room",
                                type: "select",
                                options: roomOptions,
                                defaultValue: asset.roomCode,
                              },
                              {
                                name: "assetCode",
                                label: "Kode asset",
                                defaultValue: asset.assetCode,
                              },
                              {
                                name: "serialNumber",
                                label: "Serial number",
                                defaultValue: asset.serialNumber ?? "",
                              },
                              {
                                name: "status",
                                label: "Status",
                                type: "select",
                                options: statusOptions,
                                defaultValue: asset.status,
                              },
                              {
                                name: "condition",
                                label: "Kondisi",
                                type: "select",
                                options: conditionOptions,
                                defaultValue: asset.condition,
                              },
                              {
                                name: "notes",
                                label: "Catatan",
                                type: "textarea",
                                defaultValue: asset.notes ?? "",
                              },
                              {
                                name: "active",
                                label: "Aktif",
                                type: "checkbox",
                                defaultValue: asset.active,
                              },
                              {
                                name: "imageMediaId",
                                label: "Gambar",
                                type: "hidden",
                              },
                            ]}
                            submitLabel="Simpan perubahan"
                            successMessage="Asset diperbarui."
                          >
                            <ImageUploadField
                              defaultMediaId={asset.assetImageMediaId ?? null}
                              help={
                                asset.assetImageMediaId
                                  ? "Foto kustom khusus asset ini. Kosongkan untuk kembali memakai gambar dari Equipment Type."
                                  : `Saat ini menggunakan foto katalog tipe alat (${asset.typeName}). Unggah berkas jika ingin foto kustom khusus aset ini.`
                              }
                            />
                          </CrudForm>
                        </EditDisclosure>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
