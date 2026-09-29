"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, errorMessage } from "@/components/student-api";
import { roleLabels } from "@/lib/permission-copy";

const roleOptions = ["user", "plp", "lecturer", "aslab", "admin"];

function rolesOf(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => roleOptions.includes(item));
}

export function UserRoleForm({
  userId,
  email,
  currentRole,
}: {
  userId: string;
  email: string;
  currentRole: string;
}) {
  const router = useRouter();
  const initial = rolesOf(currentRole);
  const [selectedRole, setSelectedRole] = useState(
    initial[0] ?? "user",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dirty = selectedRole !== (initial[0] ?? "user");

  async function save() {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: { roles: [selectedRole] },
      });
      setSuccess(`Peran ${email} diperbarui.`);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`role-select-${userId}`} className="sr-only">
          Pilih peran untuk {email}
        </label>
        <select
          id={`role-select-${userId}`}
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setSuccess("");
            setError("");
          }}
          className="h-10 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] font-medium text-[#212121] outline-none transition focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role] ?? role}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex min-h-10 items-center rounded-xl bg-[#F9B129] px-3.5 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-50"
        >
          {pending ? "Menyimpan..." : "Simpan peran"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] px-3 py-1.5 text-[11px] font-medium text-[#9E3636]"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#BFE3CE] bg-[#E5F5ED] px-3 py-1.5 text-[11px] font-medium text-[#03683A]"
        >
          {success}
        </p>
      )}
    </div>
  );
}
