import type { Metadata } from "next";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/workspace";
import { listLaboratories } from "@/services/admin.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Data Master Laboratorium · Admin Reaksan" };

export default async function AdminLaboratoriesPage() {
  await requirePermission({ labs: ["manage-any"] });
  const laboratories = await listLaboratories();

  return (
    <>
      <PageHeader
        eyebrow="Data Master"
        title="Master Laboratorium"
        description="Laboratorium induk yang menaungi berbagai ruangan praktikum dan riset Departemen Kimia FMIPA Unpad. Nonaktifkan status alih-alih menghapus data agar integritas riwayat tetap terjaga."
      />

      <Panel context="Formulir" title="Tambah Laboratorium Baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/laboratories"
          fields={[
            { name: "code", label: "Kode Lab", required: true, placeholder: "chem-lab" },
            { name: "name", label: "Nama Laboratorium", required: true, placeholder: "cth. Laboratorium Kimia Fisik" },
            { name: "description", label: "Deskripsi", type: "textarea", placeholder: "Penjelasan fungsi dan cakupan laboratorium..." },
            { name: "active", label: "Status Aktif", type: "checkbox", defaultValue: true },
          ]}
          submitLabel="Simpan Laboratorium"
          successMessage="Laboratorium berhasil ditambahkan."
        />
      </Panel>

      <Panel context={`${laboratories.length} laboratorium`} title="Daftar Laboratorium Terdaftar" padded={false}>
        {laboratories.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada laboratorium terdaftar"
              description="Tambahkan laboratorium pertama melalui formulir di atas."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {laboratories.map((laboratory) => (
              <li key={laboratory.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#212121]">
                      {laboratory.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#929292]">
                      {laboratory.code} ·{" "}
                      {laboratory.active ? "aktif" : "nonaktif"} · dibuat{" "}
                      {formatDate(laboratory.createdAt)}
                    </p>
                    {laboratory.description && (
                      <p className="mt-1 text-[12px] text-[#6B6B6B]">
                        {laboratory.description}
                      </p>
                    )}
                  </div>
                  <EditDisclosure>
                    <CrudForm
                      endpoint={`/api/admin/laboratories/${laboratory.id}`}
                      method="PATCH"
                      resetOnSuccess={false}
                      fields={[
                        {
                          name: "code",
                          label: "Kode",
                          defaultValue: laboratory.code,
                        },
                        {
                          name: "name",
                          label: "Nama",
                          defaultValue: laboratory.name,
                        },
                        {
                          name: "description",
                          label: "Deskripsi",
                          type: "textarea",
                          defaultValue: laboratory.description ?? "",
                        },
                        {
                          name: "active",
                          label: "Aktif",
                          type: "checkbox",
                          defaultValue: laboratory.active,
                        },
                      ]}
                      submitLabel="Simpan Perubahan"
                      successMessage="Data laboratorium berhasil diperbarui."
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
