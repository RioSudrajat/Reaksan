"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { roleLabels } from "@/lib/permission-copy";

const roleOptions = [
  { value: "user", label: "Mahasiswa", desc: "Akses reservasi instrumen & izin praktikum/penelitian" },
  { value: "plp", label: "PLP Laboratorium", desc: "Operator lab, validasi peminjaman, stok bahan & insiden" },
  { value: "admin", label: "Administrator", desc: "Akses master data, penugasan, akun & konfigurasi sistem" },
];

export function UserCreateDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleOpen() {
    setError("");
    setSuccess("");
    setName("");
    setEmail("");
    setPassword("");
    setRole("user");
    setIsOpen(true);
  }

  function handleClose() {
    if (pending) return;
    setIsOpen(false);
  }

  function generateRandomPassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    if (!name.trim()) {
      setError("Nama pengguna wajib diisi.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Email valid wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setPending(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        },
      });

      setSuccess(`Akun untuk ${name.trim()} (${email.trim()}) berhasil didaftarkan!`);
      setName("");
      setEmail("");
      setPassword("");
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        setSuccess("");
      }, 1400);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#212121] px-4 text-[13px] font-bold text-white shadow-xs transition hover:bg-[#333333] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
      >
        <UserPlus className="size-4 text-[#F9B129]" aria-hidden="true" />
        <span>Tambah Pengguna</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-dialog-title"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#E1E1E1] bg-white p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EEEEEE] pb-4">
              <div>
                <h2
                  id="create-user-dialog-title"
                  className="text-[17px] font-bold tracking-tight text-[#212121]"
                >
                  Tambah Akun Pengguna Baru
                </h2>
                <p className="mt-1 text-[12px] text-[#6B6B6B]">
                  Pendaftaran akun dikelola terpusat oleh Admin. Pengguna dapat langsung login dengan kredensial ini.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="flex size-8 items-center justify-center rounded-lg text-[#929292] hover:bg-[#F5F5F5] hover:text-[#212121] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129]"
                aria-label="Tutup formulir"
              >
                <X className="size-4" />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-[#DC2626]">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-[#048444]">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="user-fullname"
                  className="block text-[12px] font-bold text-[#212121]"
                >
                  Nama Lengkap <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]" />
                  <input
                    id="user-fullname"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth. Budi Pratama, S.Si."
                    disabled={pending}
                    className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-9 pr-3 text-[13px] text-[#212121] placeholder-[#94A3B8] transition outline-none focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="user-email"
                  className="block text-[12px] font-bold text-[#212121]"
                >
                  Alamat Email <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]" />
                  <input
                    id="user-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cth. budi@unpad.ac.id"
                    disabled={pending}
                    className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-9 pr-3 text-[13px] text-[#212121] placeholder-[#94A3B8] transition outline-none focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="user-role"
                  className="block text-[12px] font-bold text-[#212121]"
                >
                  Peran / Akses Workspace <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="user-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={pending}
                    className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-[13px] font-medium text-[#212121] transition outline-none focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="user-password"
                    className="block text-[12px] font-bold text-[#212121]"
                  >
                    Kata Sandi Awal <span className="text-[#DC2626]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-semibold text-[#8D6500] hover:underline focus-visible:outline-none"
                  >
                    Buat Sandi Acak
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]" />
                  <input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    disabled={pending}
                    className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-9 pr-10 text-[13px] text-[#212121] placeholder-[#94A3B8] transition outline-none focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#929292] hover:text-[#212121]"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#6B6B6B]">
                  Sampaikan kredensial ini kepada pengguna secara aman. Pengguna dapat mengubah kata sandinya setelah login.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#EEEEEE] pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={pending}
                  className="h-10 rounded-xl border border-[#E1E1E1] bg-white px-4 text-[13px] font-semibold text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#212121] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-5 text-[13px] font-bold text-[#212121] shadow-xs hover:bg-[#E5A020] active:scale-[0.98] transition disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Daftarkan Akun</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
