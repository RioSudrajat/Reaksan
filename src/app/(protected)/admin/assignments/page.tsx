import type { Metadata } from "next";
import { headers } from "next/headers";
import { AssignmentScopeFields } from "@/components/admin/assignment-scope-fields";
import { CrudForm, EditDisclosure } from "@/components/admin/crud-form";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/workspace";
import { toDateInput } from "@/lib/date-input";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/session";
import {
  listActivityOptions,
  listAssignments,
  listLaboratories,
  listRoomsAdmin,
} from "@/services/admin.service";

export const metadata: Metadata = { title: "Penugasan Staf & PLP · Admin Reaksan" };

const typeOptions = [
  { value: "PLP", label: "PLP (Penanggung Jawab Operasional Lab)" },
  { value: "PIC", label: "PIC Ruangan Khusus" },
];

export default async function AdminAssignmentsPage() {
  await requirePermission({ assignments: ["manage-any"] });
  const [assignments, userList, laboratories, rooms, activities] =
    await Promise.all([
      listAssignments(),
      auth.api.listUsers({
        headers: await headers(),
        query: { limit: 100, sortBy: "name", sortDirection: "asc" },
      }),
      listLaboratories(),
      listRoomsAdmin(),
      listActivityOptions(),
    ]);
  const userOptions = (userList.users ?? []).map((account) => ({
    value: account.id,
    label: `${account.name} (${account.email})`,
  }));
  const scopeData = {
    laboratories: laboratories
      .filter((item) => item.active)
      .map((item) => ({ value: item.code, label: `${item.name} (${item.code})` })),
    rooms: rooms
      .filter((item) => item.active)
      .map((item) => ({ value: item.code, label: `${item.name} (${item.code})` })),
    activities: activities.map((item) => ({
      value: item.id,
      label: `${item.title} · ${item.studentName}`,
    })),
  };
  const scopeFields = [
    { name: "scopeType", label: "Cakupan Penugasan", type: "external" as const },
    { name: "scopeId", label: "Target Wewenang", type: "external" as const },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operasional & SDM"
        title="Penugasan PLP & Penanggung Jawab Lab"
        description="Penugasan menghubungkan akun PLP dan Penanggung Jawab Ruangan (PIC) dengan laboratorium yang menjadi wewenang operasionalnya. PLP hanya dapat memvalidasi inventaris dan request pada lab yang ditugaskan."
      />

      <Panel context="Formulir" title="Tambah Penugasan Baru" className="mb-5">
        <CrudForm
          endpoint="/api/admin/assignments"
          columns={3}
          fields={[
            {
              name: "userId",
              label: "Pengguna / Staf Lab",
              type: "select",
              required: true,
              options: userOptions,
            },
            ...scopeFields,
            {
              name: "assignmentType",
              label: "Tipe Penugasan",
              type: "select",
              required: true,
              options: typeOptions,
              help: "Pilih peran penugasan yang sesuai dengan SK atau tanggung jawab staf.",
            },
            { name: "startDate", label: "Tanggal Mulai", type: "date" },
            { name: "endDate", label: "Tanggal Berakhir", type: "date" },
            { name: "notes", label: "Catatan Penugasan", type: "textarea", placeholder: "Nomor SK penugasan atau rincian wewenang..." },
            { name: "active", label: "Status Aktif", type: "checkbox", defaultValue: true },
          ]}
          submitLabel="Simpan Penugasan"
          successMessage="Penugasan staf berhasil ditambahkan."
        >
          <AssignmentScopeFields {...scopeData} />
        </CrudForm>
      </Panel>

      <Panel context={`${assignments.length} penugasan`} title="Daftar Penugasan Laboratorium" padded={false}>
        {assignments.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada penugasan terdaftar"
              description="Tambahkan penugasan pertama melalui formulir di atas."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#212121]">
                      {assignment.userName} · {assignment.assignmentType}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#929292]">
                      {assignment.scopeType} · {assignment.scopeLabel} ·{" "}
                      {assignment.active ? "aktif" : "nonaktif"} ·{" "}
                      {formatDate(assignment.startDate)} sampai{" "}
                      {formatDate(assignment.endDate)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                      {assignment.userEmail}
                    </p>
                    {assignment.notes && (
                      <p className="mt-1 text-[12px] text-[#6B6B6B]">
                        {assignment.notes}
                      </p>
                    )}
                  </div>
                  <EditDisclosure>
                    <CrudForm
                      endpoint={`/api/admin/assignments/${assignment.id}`}
                      method="PATCH"
                      resetOnSuccess={false}
                      columns={3}
                      fields={[
                        ...scopeFields,
                        {
                          name: "assignmentType",
                          label: "Tipe",
                          type: "select",
                          options: typeOptions,
                          defaultValue: assignment.assignmentType,
                        },
                        {
                          name: "startDate",
                          label: "Mulai",
                          type: "date",
                          defaultValue: toDateInput(
                            assignment.startDate?.toISOString(),
                          ),
                        },
                        {
                          name: "endDate",
                          label: "Selesai",
                          type: "date",
                          defaultValue: toDateInput(
                            assignment.endDate?.toISOString(),
                          ),
                        },
                        {
                          name: "notes",
                          label: "Catatan",
                          type: "textarea",
                          defaultValue: assignment.notes ?? "",
                        },
                        {
                          name: "active",
                          label: "Aktif",
                          type: "checkbox",
                          defaultValue: assignment.active,
                        },
                      ]}
                      submitLabel="Simpan Perubahan"
                      successMessage="Penugasan berhasil diperbarui."
                    >
                      <AssignmentScopeFields
                        {...scopeData}
                        defaultScopeType={assignment.scopeType}
                        defaultScopeId={assignment.scopeId}
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
