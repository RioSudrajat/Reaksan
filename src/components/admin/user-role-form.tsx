"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { roleLabels } from "@/lib/permission-copy";

const roleOptions = ["user", "plp", "admin"];

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
  isSelf = false,
}: {
  userId: string;
  email: string;
  currentRole: string;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const initial = rolesOf(currentRole);
  const [selectedRole, setSelectedRole] = useState(initial[0] ?? "user");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
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

  async function handleDelete() {
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      setShowConfirmDelete(false);
      setSuccess(`Akun ${email} berhasil dihapus permanen dari database.`);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
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
          disabled={pending || deleting}
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
          disabled={pending || deleting || !dirty}
          className="inline-flex min-h-10 items-center rounded-xl bg-[#F9B129] px-3.5 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Menyimpan..." : "Simpan peran"}
        </button>

        {!isSelf ? (
          <button
            type="button"
            onClick={() => {
              setShowConfirmDelete(true);
              setError("");
              setSuccess("");
            }}
            disabled={pending || deleting}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[#F3C7C7] text-[#DC2626] transition hover:bg-[#FDE9E9] focus-visible:outline-2 focus-visible:outline-[#DC2626] disabled:opacity-50 cursor-pointer"
            title="Hapus akun pengguna dari database"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="sr-only">Hapus akun {email}</span>
          </button>
        ) : (
          <span className="text-[11px] text-[#929292] italic self-center">
            (Akun Anda)
          </span>
        )}
      </div>

      {/* Confirmation Box for Account Deletion */}
      {showConfirmDelete && (
        <div
          role="alertdialog"
          aria-labelledby={`delete-title-${userId}`}
          className="rounded-xl border border-[#F3C7C7] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B] space-y-2 shadow-xs"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 text-[#DC2626] mt-0.5" aria-hidden="true" />
            <div>
              <p id={`delete-title-${userId}`} className="font-bold">
                Hapus akun {email}?
              </p>
              <p className="mt-0.5 text-[11px] text-[#7F1D1D]">
                Tindakan ini permanen. Akun dan seluruh data yang terhubung dengannya akan dihapus secara tuntas dari database PostgreSQL.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 justify-end">
            <button
              type="button"
              onClick={() => setShowConfirmDelete(false)}
              disabled={deleting}
              className="inline-flex min-h-[30px] items-center rounded-lg border border-[#E1E1E1] bg-white px-2.5 text-[11px] font-semibold text-[#212121] hover:bg-[#F5F5F5] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex min-h-[30px] items-center rounded-lg bg-[#DC2626] px-3 text-[11px] font-bold text-white hover:bg-[#B91C1C] cursor-pointer disabled:opacity-50"
            >
              {deleting ? "Menghapus..." : "Ya, Hapus Akun"}
            </button>
          </div>
        </div>
      )}

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
