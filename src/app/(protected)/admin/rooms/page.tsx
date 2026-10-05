import type { Metadata } from "next";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { EmptyState, PageHeader, Panel } from "@/components/workspace";
import { listLaboratories, listRoomsAdmin } from "@/services/admin.service";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Data Master Ruangan · Admin Reaksan" };

const toneOptions = [
  { value: "yellow", label: "Kuning (Yellow)" },
  { value: "blue", label: "Biru (Blue)" },
  { value: "green", label: "Hijau (Green)" },
  { value: "cream", label: "Krim (Cream)" },
  { value: "rose", label: "Merah Muda (Rose)" },
];

export default async function AdminRoomsPage() {
  await requirePermission({ rooms: ["manage-any"] });
  const [rooms, laboratories] = await Promise.all([
    listRoomsAdmin(),
    listLaboratories(),
  ]);
  const labOptions = laboratories.map((lab) => ({
    value: lab.code,
    label: `${lab.name} (${lab.code})`,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Data Master"
        title="Master Ruangan Laboratorium"
        description="Ruangan adalah lokasi fisik penempatan instrumen, glassware, dan bahan kimia. Tone warna menentukan visualisasi pada denah interaktif Reaksan."
      />

      <Panel context="Formulir" title="Tambah Ruangan Baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/rooms"
          columns={3}
          fields={[
            {
              name: "laboratoryCode",
              label: "Laboratorium Induk",
              type: "select",
              required: true,
              options: labOptions,
            },
            { name: "code", label: "Kode Ruangan", required: true, placeholder: "lab-organik" },
            { name: "name", label: "Nama Ruangan", required: true, placeholder: "Laboratorium Kimia Organik" },
            { name: "shortName", label: "Nama Singkat", required: true, placeholder: "Kimia Organik" },
            { name: "floor", label: "Lantai Gedung", placeholder: "Lantai 1" },
            { name: "tone", label: "Warna Denah", type: "select", options: toneOptions },
            { name: "description", label: "Deskripsi", type: "textarea", placeholder: "Penjelasan fungsi ruangan dan kapasitas..." },
            { name: "active", label: "Status Aktif", type: "checkbox", defaultValue: true },
          ]}
          submitLabel="Simpan Ruangan"
          successMessage="Ruangan berhasil ditambahkan."
        />
      </Panel>

      <Panel context={`${rooms.length} ruangan`} title="Daftar Ruangan Terdaftar" padded={false}>
        {rooms.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada ruangan terdaftar"
              description="Tambahkan ruangan pertama melalui formulir di atas."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {rooms.map((room) => (
              <li key={room.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#212121]">
                      {room.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#929292]">
                      {room.code} · {room.laboratoryName} ·{" "}
                      {room.active ? "aktif" : "nonaktif"} · tone {room.tone}
                    </p>
                    {room.description && (
                      <p className="mt-1 text-[12px] text-[#6B6B6B]">
                        {room.description}
                      </p>
                    )}
                  </div>
                  <EditDisclosure>
                    <CrudForm
                      endpoint={`/api/admin/rooms/${room.id}`}
                      method="PATCH"
                      resetOnSuccess={false}
                      columns={3}
                      fields={[
                        {
                          name: "laboratoryCode",
                          label: "Laboratory",
                          type: "select",
                          options: labOptions,
                          defaultValue: room.laboratoryCode,
                        },
                        { name: "code", label: "Kode", defaultValue: room.code },
                        { name: "name", label: "Nama", defaultValue: room.name },
                        {
                          name: "shortName",
                          label: "Nama pendek",
                          defaultValue: room.shortName,
                        },
                        {
                          name: "floor",
                          label: "Lantai",
                          defaultValue: room.floor ?? "",
                        },
                        {
                          name: "tone",
                          label: "Tone",
                          type: "select",
                          options: toneOptions,
                          defaultValue: room.tone,
                        },
                        {
                          name: "description",
                          label: "Deskripsi",
                          type: "textarea",
                          defaultValue: room.description ?? "",
                        },
                        {
                          name: "active",
                          label: "Aktif",
                          type: "checkbox",
                          defaultValue: room.active,
                        },
                      ]}
                      submitLabel="Simpan Perubahan"
                      successMessage="Data ruangan berhasil diperbarui."
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
