"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { apiRequest, errorMessage } from "@/components/student-api";
import { roleLabels } from "@/lib/permission-copy";
import {
  RolePermissionEditor,
  type RolePermissions,
} from "@/components/admin/access/role-permission-editor";

export type RoleAccessItem = {
  name: string;
  label: string;
  description: string;
  permissions: RolePermissions;
  defaultPermissions: RolePermissions;
  customized: boolean;
  editable: boolean;
  updatedAt: string | null;
};

export type AccessMember = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

function rolesOf(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function MemberRow({
  member,
  roleNames,
  onSaved,
}: {
  member: AccessMember;
  roleNames: string[];
  onSaved: (id: string, roles: string[]) => void;
}) {
  const currentRoles = rolesOf(member.role);
  const [selectedRole, setSelectedRole] = useState(
    currentRoles[0] ?? roleNames[0] ?? "user",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = selectedRole !== (currentRoles[0] ?? "");

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest(`/api/admin/users/${member.id}/role`, {
        method: "POST",
        body: { roles: [selectedRole] },
      });
      onSaved(member.id, [selectedRole]);
      setMessage("Peran diperbarui.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-xl border border-[#EEEEEE] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#212121]">
            {member.name}
          </p>
          <p className="mt-0.5 break-all text-[11px] text-[#6B6B6B]">
            {member.email}
          </p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#929292]">
          {roleLabels[currentRoles[0]] ?? currentRoles[0] ?? "tanpa peran"}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <label htmlFor={`member-role-${member.id}`} className="sr-only">
          Pilih peran untuk {member.name}
        </label>
        <select
          id={`member-role-${member.id}`}
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setMessage(null);
          }}
          className="h-9 rounded-lg border border-[#E1E1E1] bg-white px-2.5 text-[12px] font-medium text-[#212121] outline-none transition focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
        >
          {roleNames.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role] ?? role}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
          className="inline-flex min-h-9 items-center rounded-lg bg-[#F9B129] px-3 text-[11px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan peran"}
        </button>
        {message && (
          <span className="text-[11px] text-[#03683A]">{message}</span>
        )}
      </div>
    </li>
  );
}

export function RoleAccessBoard({
  items,
  members: initialMembers,
}: {
  items: RoleAccessItem[];
  members: AccessMember[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [selectedName, setSelectedName] = useState(
    items.find((item) => item.name === "plp")?.name ?? items[0]?.name ?? "",
  );
  const [memberSearch, setMemberSearch] = useState("");

  const selected = items.find((item) => item.name === selectedName) ?? items[0];
  const roleNames = items.map((item) => item.name);

  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const member of members)
      for (const role of rolesOf(member.role))
        counts[role] = (counts[role] ?? 0) + 1;
    return counts;
  }, [members]);

  const selectedMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();
    return members
      .filter((member) => rolesOf(member.role).includes(selectedName))
      .filter(
        (member) =>
          !search ||
          member.name.toLowerCase().includes(search) ||
          member.email.toLowerCase().includes(search),
      );
  }, [members, memberSearch, selectedName]);

  if (!selected) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const active = item.name === selectedName;
          const permissionCount = Object.values(item.permissions).reduce(
            (total, actions) => total + actions.length,
            0,
          );
          return (
            <button
              key={item.name}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setSelectedName(item.name);
                setMemberSearch("");
              }}
              className={cn(
                "dashboard-card min-h-11 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
                active
                  ? "border-[#F9B129] bg-[#FFFCF3]"
                  : "hover:border-[#D6C6A6]",
              )}
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[14px] text-[#212121]">
                  {item.label}
                </strong>
                {item.name === "admin" ? (
                  <span className="rounded-full bg-[#EEEEEE] px-2 py-0.5 text-[10px] font-semibold text-[#6B6B6B]">
                    Terkunci
                  </span>
                ) : item.customized ? (
                  <span className="rounded-full bg-[#FEF1CC] px-2 py-0.5 text-[10px] font-semibold text-[#AE7C1D]">
                    Dikustom
                  </span>
                ) : (
                  <span className="rounded-full bg-[#E5F5ED] px-2 py-0.5 text-[10px] font-semibold text-[#03683A]">
                    Bawaan
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[12px] leading-5 text-[#6B6B6B]">
                {item.description}
              </span>
              <span className="mt-2 block text-[11px] font-semibold text-[#929292]">
                {memberCounts[item.name] ?? 0} anggota · {permissionCount} izin
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="dashboard-card p-5">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
              Izin peran
            </p>
            <h2 className="text-[16px] font-bold text-[#212121]">
              {selected.label}
            </h2>
          </div>
          <RolePermissionEditor
            key={selected.name}
            role={selected.name}
            label={selected.label}
            permissions={selected.permissions}
            defaultPermissions={selected.defaultPermissions}
            editable={selected.editable}
          />
        </section>

        <section className="dashboard-card p-5">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
              Anggota
            </p>
            <h2 className="text-[16px] font-bold text-[#212121]">
              Pengguna dengan peran {selected.label}
            </h2>
          </div>
          <label className="block">
            <span className="sr-only">Cari anggota</span>
            <input
              type="search"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Cari nama atau email"
              className="h-11 w-full rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] text-[#212121] placeholder:text-[#929292] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            />
          </label>
          {selectedMembers.length === 0 ? (
            <p className="mt-3 rounded-xl bg-[#FAFAF8] p-3 text-[12px] text-[#6B6B6B]">
              Belum ada pengguna dengan peran ini.
            </p>
          ) : (
            <ul className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {selectedMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  roleNames={roleNames}
                  onSaved={(id, roles) => {
                    setMembers((current) =>
                      current.map((item) =>
                        item.id === id ? { ...item, role: roles.join(",") } : item,
                      ),
                    );
                    router.refresh();
                  }}
                />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-5 text-[#929292]">
            Satu akun boleh punya beberapa peran sekaligus; izinnya digabung.
            Penugasan lab untuk PLP diatur di halaman Assignments.
          </p>
        </section>
      </div>
    </div>
  );
}
