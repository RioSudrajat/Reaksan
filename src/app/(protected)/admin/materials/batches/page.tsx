import type { Metadata } from "next";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { CatalogImage } from "@/components/catalog-image";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/workspace";
import { toDateInput } from "@/lib/date-input";
import {
  listBatchesAdmin,
  listMaterialsAdmin,
  listRoomsAdmin,
} from "@/services/admin.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Material Batches" };

export default async function AdminMaterialBatchesPage() {
  await requirePermission({ materials: ["manage-any"] });
  const [batches, materials, rooms] = await Promise.all([
    listBatchesAdmin(),
    listMaterialsAdmin(),
    listRoomsAdmin(),
  ]);
  const materialOptions = materials.map((material) => ({
    value: material.code,
    label: `${material.name} (${material.code})`,
  }));
  const roomOptions = rooms.map((room) => ({
    value: room.code,
    label: room.name,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Material batches"
        description="Batch membawa lot, expiry, dan stok fisik. Penerimaan baru otomatis menulis transaksi RECEIVE ke ledger."
      />

      <Panel context="Tambah" title="Batch baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/material-batches"
          columns={3}
          fields={[
            {
              name: "materialCode",
              label: "Material",
              type: "select",
              required: true,
              options: materialOptions,
            },
            {
              name: "roomCode",
              label: "Room penyimpanan",
              type: "select",
              required: true,
              options: roomOptions,
            },
            { name: "lotNumber", label: "Lot number" },
            {
              name: "quantity",
              label: "Jumlah diterima",
              type: "number",
              required: true,
              step: "0.001",
              defaultValue: 0,
            },
            { name: "expiryDate", label: "Expiry", type: "date" },
            { name: "active", label: "Aktif", type: "checkbox", defaultValue: true },
          ]}
          submitLabel="Tambah batch"
          successMessage="Batch ditambahkan dan stok dicatat."
        />
      </Panel>

      <Panel context={`${batches.length} batch`} title="Daftar" padded={false}>
        {batches.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada batch"
              description="Tambahkan batch pertama lewat form di atas."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {batches.map((batch) => (
              <li key={batch.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <CatalogImage
                      mediaId={batch.imageMediaId}
                      alt={`Gambar ${batch.materialName}`}
                      size={52}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#212121]">
                        {batch.materialName} · {batch.lotNumber ?? "tanpa lot"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#929292]">
                        {batch.roomName} · {Number(batch.quantity)}{" "}
                        {batch.unit} · expiry {formatDate(batch.expiryDate)} ·{" "}
                        {batch.active ? "aktif" : "nonaktif"}
                      </p>
                    </div>
                  </div>
                  <EditDisclosure>
                    <CrudForm
                      endpoint={`/api/admin/material-batches/${batch.id}`}
                      method="PATCH"
                      resetOnSuccess={false}
                      columns={3}
                      fields={[
                        {
                          name: "lotNumber",
                          label: "Lot number",
                          defaultValue: batch.lotNumber ?? "",
                        },
                        {
                          name: "quantity",
                          label: "Jumlah fisik",
                          type: "number",
                          step: "0.001",
                          defaultValue: Number(batch.quantity),
                          help: "Perubahan jumlah menulis transaksi ADJUST.",
                        },
                        {
                          name: "expiryDate",
                          label: "Expiry",
                          type: "date",
                          defaultValue: toDateInput(batch.expiryDate?.toISOString()),
                        },
                        {
                          name: "active",
                          label: "Aktif",
                          type: "checkbox",
                          defaultValue: batch.active,
                        },
                      ]}
                      submitLabel="Simpan perubahan"
                      successMessage="Batch diperbarui."
                    />
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
