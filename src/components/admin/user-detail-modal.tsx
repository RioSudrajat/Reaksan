"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { roleLabels } from "@/lib/permission-copy";
import { formatDateTime } from "@/components/workspace";

export type UserDetail = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role?: string | null;
  banned?: boolean | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

interface UserDetailModalProps {
  user: UserDetail;
  isSelf: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
}

const roleOptions = [
  { value: "user", label: "Mahasiswa", desc: "Akses reservasi & izin lab" },
  { value: "plp", label: "PLP Laboratorium", desc: "Operator lab & validasi" },
  {
    value: "admin",
    label: "Administrator",
    desc: "Akses master data & sistem",
  },
];

export function UserDetailModal({
  user,
  isSelf,
  onClose,
  onUserUpdated,
}: UserDetailModalProps) {
  const router = useRouter();

  // Role form state
  const [selectedRole, setSelectedRole] = useState(user.role ?? "user");
  const [rolePending, setRolePending] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState("");
  const [roleError, setRoleError] = useState("");

  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Copy helper state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, fieldName: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField((prev) => (prev === fieldName ? null : prev));
    }, 1800);
  }

  function generateStrongPassword() {
    const chars =
      "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
    setPasswordError("");
    setPasswordSuccess("");
  }

  async function handleUpdateRole() {
    if (selectedRole === (user.role ?? "user")) return;
    setRolePending(true);
    setRoleError("");
    setRoleSuccess("");
    try {
      await apiRequest(`/api/admin/users/${user.id}/role`, {
        method: "POST",
        body: { roles: [selectedRole] },
      });
      setRoleSuccess(
        `Peran berhasil diperbarui menjadi ${roleLabels[selectedRole] ?? selectedRole}.`,
      );
      router.refresh();
      onUserUpdated?.();
    } catch (err) {
      setRoleError(errorMessage(err));
    } finally {
      setRolePending(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("Kata sandi minimal 8 karakter.");
      return;
    }
    setPasswordPending(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await apiRequest(`/api/admin/users/${user.id}/password`, {
        method: "POST",
        body: { password: newPassword },
      });
      setPasswordSuccess("Kata sandi pengguna berhasil diperbarui!");
      setNewPassword("");
      router.refresh();
      onUserUpdated?.();
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setPasswordPending(false);
    }
  }

  async function handleDeleteUser() {
    if (isSelf) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      router.refresh();
      onUserUpdated?.();
      onClose();
    } catch (err) {
      setDeleteError(errorMessage(err));
      setDeletePending(false);
    }
  }

  // Visual initial and color tone
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleBadgeConfig: Record<
    string,
    { label: string; badge: string; bg: string; text: string }
  > = {
    admin: {
      label: "Administrator",
      badge: "⚙️ Admin",
      bg: "bg-amber-100 border-amber-300 text-amber-900",
      text: "text-amber-700",
    },
    plp: {
      label: "PLP Laboratorium",
      badge: "🔬 PLP Lab",
      bg: "bg-emerald-100 border-emerald-300 text-emerald-900",
      text: "text-emerald-700",
    },
    user: {
      label: "Mahasiswa",
      badge: "🎓 Mahasiswa",
      bg: "bg-blue-100 border-blue-300 text-blue-900",
      text: "text-blue-700",
    },
  };

  const activeRole =
    roleBadgeConfig[user.role ?? "user"] ?? roleBadgeConfig.user;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-[#E1E1E1] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="bg-[#FAF7F2] border-b border-[#E8E2D7] p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="size-13 rounded-2xl bg-white border border-[#E1E1E1] shadow-2xs flex items-center justify-center text-[#212121] font-bold text-base tracking-wider shrink-0">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="user-detail-title"
                  className="text-base font-bold text-[#212121] truncate"
                >
                  {user.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${activeRole.bg}`}
                >
                  {activeRole.badge}
                </span>
                {isSelf && (
                  <span className="rounded-full bg-[#212121] px-2 py-0.5 text-[10px] font-semibold text-white">
                    Akun Anda
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#6B6B6B] flex items-center gap-1.5 truncate">
                <Mail className="size-3.5 shrink-0 text-[#929292]" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-[#929292] hover:bg-[#E8E2D7] hover:text-[#212121] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129] shrink-0"
            aria-label="Tutup overview profil"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[calc(85vh-160px)] overflow-y-auto">
          {/* IDENTITAS PENGGUNA GRID */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#929292] mb-3 flex items-center gap-1.5">
              <User className="size-3.5 text-[#F9B129]" />
              <span>Detail Identitas Pengguna</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* NIM / NIP / Username */}
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#929292]">
                    NIM / NIP / Username
                  </span>
                  <p className="text-xs font-mono font-bold text-[#212121] mt-0.5">
                    {user.username || (
                      <span className="text-[#929292] italic font-sans font-normal">
                        Belum disetel
                      </span>
                    )}
                  </p>
                </div>
                {user.username && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user.username!, "username")}
                    title="Salin NIM/NIP"
                    className="size-7 rounded-lg bg-white border border-[#E1E1E1] flex items-center justify-center text-[#6B6B6B] hover:text-[#212121] transition"
                  >
                    {copiedField === "username" ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold uppercase text-[#929292]">
                    Alamat Email
                  </span>
                  <p className="text-xs font-semibold text-[#212121] mt-0.5 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(user.email, "email")}
                  title="Salin Email"
                  className="size-7 rounded-lg bg-white border border-[#E1E1E1] flex items-center justify-center text-[#6B6B6B] hover:text-[#212121] transition shrink-0"
                >
                  {copiedField === "email" ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>

              {/* Status Akun */}
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7]">
                <span className="text-[10px] font-bold uppercase text-[#929292]">
                  Status Akun
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-700">
                    Aktif
                  </span>
                </div>
              </div>

              {/* Waktu Pendaftaran */}
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7]">
                <span className="text-[10px] font-bold uppercase text-[#929292]">
                  Terdaftar Sejak
                </span>
                <p className="text-xs text-[#212121] font-medium mt-0.5 [font-variant-numeric:tabular-nums]">
                  {formatDateTime(user.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* AKSI 1: UBAH KATA SANDI (RESET PASSWORD) */}
          <div className="border-t border-[#EEEEEE] pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#929292] mb-3 flex items-center gap-1.5">
              <KeyRound className="size-3.5 text-[#F9B129]" />
              <span>Ubah Kata Sandi Pengguna</span>
            </h3>

            <form
              onSubmit={handleResetPassword}
              className="p-4 rounded-xl border border-[#E1E1E1] bg-white space-y-3"
            >
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`modal-pass-${user.id}`}
                  className="block text-xs font-bold text-[#212121]"
                >
                  Kata Sandi Baru
                </label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8D6500] hover:text-[#F9B129] transition"
                >
                  <Sparkles className="size-3.5" />
                  <span>Acak Password Kuat</span>
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#929292]" />
                <input
                  id={`modal-pass-${user.id}`}
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                  disabled={passwordPending}
                  placeholder="Masukkan kata sandi baru (min. 8 karakter)"
                  className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-9 pr-20 text-xs text-[#212121] placeholder-[#94A3B8] transition outline-none focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6B6B6B] hover:text-[#212121]"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {passwordError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-[#DC2626]">
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-[#048444]">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordPending || !newPassword}
                className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#212121] px-4 text-xs font-bold text-white transition hover:bg-[#333333] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {passwordPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-[#F9B129]" />
                    <span>Menyimpan Password...</span>
                  </>
                ) : (
                  <span>Perbarui Kata Sandi</span>
                )}
              </button>
            </form>
          </div>

          {/* AKSI 2: UBAH PERAN (ROLE) */}
          <div className="border-t border-[#EEEEEE] pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#929292] mb-3 flex items-center gap-1.5">
              <Shield className="size-3.5 text-[#F9B129]" />
              <span>Hak Akses & Peranan Akun</span>
            </h3>

            <div className="p-4 rounded-xl border border-[#E1E1E1] bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setRoleError("");
                    setRoleSuccess("");
                  }}
                  disabled={rolePending}
                  className="h-10 flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-medium text-[#212121] outline-none transition focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.desc})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleUpdateRole}
                  disabled={
                    rolePending || selectedRole === (user.role ?? "user")
                  }
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-xs font-bold text-[#212121] transition hover:bg-[#F7B742] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {rolePending ? "Menyimpan..." : "Simpan Peran"}
                </button>
              </div>

              {roleError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-[#DC2626]">
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                  <span>{roleError}</span>
                </div>
              )}

              {roleSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-[#048444]">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                  <span>{roleSuccess}</span>
                </div>
              )}
            </div>
          </div>

          {/* AKSI 3: HAPUS AKUN (DANGER ZONE) */}
          {!isSelf && (
            <div className="border-t border-[#EEEEEE] pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#DC2626] mb-3 flex items-center gap-1.5">
                <Trash2 className="size-3.5 text-[#DC2626]" />
                <span>Zona Bahaya</span>
              </h3>

              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#F3C7C7] bg-[#FEF2F2]">
                  <div>
                    <p className="text-xs font-bold text-[#991B1B]">
                      Hapus Akun Pengguna
                    </p>
                    <p className="text-[11px] text-[#7F1D1D] mt-0.5">
                      Hapus akun ini dan seluruh izin aksesnya secara permanen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-[#DC2626] px-3.5 text-[11px] font-bold text-white transition hover:bg-[#B91C1C] cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-[#F3C7C7] bg-[#FEF2F2] space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-[#991B1B]">
                    <AlertTriangle className="size-4 shrink-0 text-[#DC2626] mt-0.5" />
                    <div>
                      <p className="font-bold">
                        Apakah Anda yakin ingin menghapus akun {user.name}?
                      </p>
                      <p className="mt-1 text-[11px] text-[#7F1D1D] leading-relaxed">
                        Tindakan ini tidak dapat dibatalkan. Pengguna tidak akan
                        dapat lagi masuk ke sistem dan data autentikasinya akan
                        dibersihkan.
                      </p>
                    </div>
                  </div>

                  {deleteError && (
                    <div className="p-2 rounded-lg bg-red-100 text-[11px] text-[#DC2626]">
                      {deleteError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deletePending}
                      className="inline-flex min-h-[32px] items-center rounded-lg border border-[#E1E1E1] bg-white px-3 text-[11px] font-semibold text-[#212121] hover:bg-[#FAF7F2]"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={deletePending}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-[#DC2626] px-3.5 text-[11px] font-bold text-white hover:bg-[#B91C1C] disabled:opacity-50"
                    >
                      {deletePending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Menghapus...</span>
                        </>
                      ) : (
                        <span>Ya, Hapus Permanen</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-[#FAF7F2] border-t border-[#E8E2D7] px-6 py-3.5 flex items-center justify-between text-xs text-[#929292]">
          <span>ID: {user.id.slice(0, 8)}...</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg bg-white border border-[#E1E1E1] px-3.5 py-1.5 text-xs font-semibold text-[#212121] hover:bg-[#FAF7F2] transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
