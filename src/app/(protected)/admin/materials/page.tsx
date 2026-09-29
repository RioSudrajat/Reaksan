import type { Metadata } from "next";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { CatalogImage } from "@/components/catalog-image";
import { EmptyState, PageHeader, Panel } from "@/components/workspace";
import { listMaterialsAdmin } from "@/services/admin.service";
import { listCatalogImageRefs } from "@/services/media.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Materials" };

export default async function AdminMaterialsPage() {
  await requirePermission({ materials: ["manage-any"] });
  const [materials, imageRefs] = await Promise.all([
    listMaterialsAdmin(),
    listCatalogImageRefs(),
  ]);
  const materialImages = new Map(
    imageRefs.materials.map((row) => [row.id, row.imageMediaId]),
  );

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Materials"
        description="Material memakai ledger stok. Dispensing rule mengatur minimum, increment, dan maximum permintaan mahasiswa."
      />

      <Panel context="Tambah" title="Material baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/materials"
          columns={3}
          fields={[
            {
              name: "code",
              label: "Kode",
              required: true,
              placeholder: "MAT-050",
            },
            { name: "name", label: "Nama", required: true },
            { name: "category", label: "Kategori" },
            {
              name: "baseUnit",
              label: "Base unit",
              required: true,
              placeholder: "mL",
            },
            { name: "description", label: "Deskripsi", type: "textarea" },
            {
              name: "active",
              label: "Aktif",
              type: "checkbox",
              defaultValue: true,
            },
            {
              name: "rule.minimumQuantity",
              label: "Rule minimum",
              type: "number",
              step: "0.001",
              help: "Isi keempat field rule untuk membuat dispensing rule.",
            },
            {
              name: "rule.dispensingIncrement",
              label: "Rule increment",
              type: "number",
              step: "0.001",
            },
            {
              name: "rule.maximumQuantity",
              label: "Rule maximum",
              type: "number",
              step: "0.001",
            },
            { name: "rule.unit", label: "Rule unit", placeholder: "mL" },
            { name: "imageMediaId", label: "Gambar", type: "hidden" },
          ]}
          submitLabel="Tambah material"
          successMessage="Material ditambahkan."
        >
          <ImageUploadField help="Satu gambar utama per material. PNG, JPEG, atau WebP, maksimal 5 MB." />
        </CrudForm>
      </Panel>

      <Panel
        context={`${materials.length} material`}
        title="Daftar"
        padded={false}
      >
        {materials.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada material"
              description="Tambahkan material pertama lewat form di atas."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {materials.map((material) => (
              <li key={material.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <CatalogImage
                      mediaId={materialImages.get(material.id) ?? null}
                      alt={`Gambar ${material.name}`}
                      size={56}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#212121]">
                        {material.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#929292]">
                        {material.code} ·{" "}
                        {material.category ?? "Tanpa kategori"} ·{" "}
                        {material.active ? "aktif" : "nonaktif"} ·{" "}
                        {material.batchCount} batch · fisik{" "}
                        {Number(material.physical)} {material.baseUnit}
                      </p>
                      <p className="mt-1 text-[12px] text-[#6B6B6B]">
                        {material.minimumQuantity
                          ? `Rule: min ${Number(material.minimumQuantity)} · increment ${Number(material.dispensingIncrement)} · max ${Number(material.maximumQuantity)} ${material.ruleUnit}`
                          : "Belum ada dispensing rule"}
                      </p>
                    </div>
                  </div>
                  <EditDisclosure>
                    <CrudForm
                      endpoint={`/api/admin/materials/${material.id}`}
                      method="PATCH"
                      resetOnSuccess={false}
                      columns={3}
                      fields={[
                        {
                          name: "code",
                          label: "Kode",
                          defaultValue: material.code,
                        },
                        {
                          name: "name",
                          label: "Nama",
                          defaultValue: material.name,
                        },
                        {
                          name: "category",
                          label: "Kategori",
                          defaultValue: material.category ?? "",
                        },
                        {
                          name: "baseUnit",
                          label: "Base unit",
                          defaultValue: material.baseUnit,
                        },
                        {
                          name: "description",
                          label: "Deskripsi",
                          type: "textarea",
                          defaultValue: material.description ?? "",
                        },
                        {
                          name: "active",
                          label: "Aktif",
                          type: "checkbox",
                          defaultValue: material.active,
                        },
                        {
                          name: "rule.minimumQuantity",
                          label: "Rule minimum",
                          type: "number",
                          step: "0.001",
                          defaultValue: material.minimumQuantity
                            ? Number(material.minimumQuantity)
                            : "",
                        },
                        {
                          name: "rule.dispensingIncrement",
                          label: "Rule increment",
                          type: "number",
                          step: "0.001",
                          defaultValue: material.dispensingIncrement
                            ? Number(material.dispensingIncrement)
                            : "",
                        },
                        {
                          name: "rule.maximumQuantity",
                          label: "Rule maximum",
                          type: "number",
                          step: "0.001",
                          defaultValue: material.maximumQuantity
                            ? Number(material.maximumQuantity)
                            : "",
                        },
                        {
                          name: "rule.unit",
                          label: "Rule unit",
                          defaultValue: material.ruleUnit ?? "",
                        },
                        {
                          name: "imageMediaId",
                          label: "Gambar",
                          type: "hidden",
                        },
                      ]}
                      submitLabel="Simpan perubahan"
                      successMessage="Material diperbarui."
                    >
                      <ImageUploadField
                        label="Gambar material"
                        defaultMediaId={materialImages.get(material.id) ?? null}
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
