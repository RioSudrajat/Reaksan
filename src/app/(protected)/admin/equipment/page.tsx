import type { Metadata } from "next";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { CatalogImage } from "@/components/catalog-image";
import { EmptyState, PageHeader, Panel } from "@/components/workspace";
import { listEquipmentTypes } from "@/services/admin.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Equipment Types" };

const usageOptions = [
  { value: "BORROWABLE", label: "Borrowable (dibawa keluar, wajib return)" },
  { value: "USAGE_ONLY", label: "Usage only (dipakai di tempat)" },
];

export default async function AdminEquipmentTypesPage() {
  await requirePermission({ equipment: ["manage-any"] });
  const types = await listEquipmentTypes();

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Equipment types"
        description="Tipe menentukan usage type. Borrowable wajib lewat return dan inspeksi; usage only selesai tanpa return."
      />

      <Panel context="Tambah" title="Equipment type baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/equipment-types"
          fields={[
            { name: "name", label: "Nama", required: true },
            { name: "category", label: "Kategori", placeholder: "Heating" },
            {
              name: "usageType",
              label: "Usage type",
              type: "select",
              required: true,
              options: usageOptions,
            },
            { name: "description", label: "Deskripsi", type: "textarea" },
            {
              name: "active",
              label: "Aktif",
              type: "checkbox",
              defaultValue: true,
            },
            { name: "imageMediaId", label: "Gambar", type: "hidden" },
          ]}
          submitLabel="Tambah type"
          successMessage="Equipment type ditambahkan."
        >
          <ImageUploadField help="Gambar katalog tipe. Asset dapat memakai gambar sendiri sebagai penimpa. Maksimal 5 MB." />
        </CrudForm>
      </Panel>

      <Panel context={`${types.length} type`} title="Daftar" padded={false}>
        {types.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada equipment type"
              description="Tambahkan type pertama lewat form di atas."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {types.map((type) => (
              <li key={type.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <CatalogImage
                      mediaId={type.imageMediaId}
                      alt={`Gambar ${type.name}`}
                      size={56}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#212121]">
                        {type.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#929292]">
                        {type.category ?? "Tanpa kategori"} ·{" "}
                        {type.usageType === "BORROWABLE"
                          ? "Borrowable"
                          : "Usage only"}{" "}
                        · {type.active ? "aktif" : "nonaktif"}
                      </p>
                      {type.description && (
                        <p className="mt-1 text-[12px] text-[#6B6B6B]">
                          {type.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <EditDisclosure>
                    <CrudForm
                      endpoint={`/api/admin/equipment-types/${type.id}`}
                      method="PATCH"
                      resetOnSuccess={false}
                      fields={[
                        {
                          name: "name",
                          label: "Nama",
                          defaultValue: type.name,
                        },
                        {
                          name: "category",
                          label: "Kategori",
                          defaultValue: type.category ?? "",
                        },
                        {
                          name: "usageType",
                          label: "Usage type",
                          type: "select",
                          options: usageOptions,
                          defaultValue: type.usageType,
                        },
                        {
                          name: "description",
                          label: "Deskripsi",
                          type: "textarea",
                          defaultValue: type.description ?? "",
                        },
                        {
                          name: "active",
                          label: "Aktif",
                          type: "checkbox",
                          defaultValue: type.active,
                        },
                        {
                          name: "imageMediaId",
                          label: "Gambar",
                          type: "hidden",
                        },
                      ]}
                      submitLabel="Simpan perubahan"
                      successMessage="Equipment type diperbarui."
                    >
                      <ImageUploadField
                        label="Gambar equipment type"
                        defaultMediaId={type.imageMediaId}
                      />
                    </CrudForm>
                  </EditDisclosure>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
