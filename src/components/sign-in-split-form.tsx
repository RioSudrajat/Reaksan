"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowLeft,
  Moon,
  LoaderCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ReaksanLogo } from "@/components/reaksan-logo";
import { LoginResearchIllustration } from "@/components/illustrations/login-research-illustration";
import { landingPathForRole } from "@/lib/landing";

const DEMO_ACCOUNTS = [
  {
    role: "Mahasiswa",
    badge: "🎓 Mahasiswa",
    email: "student1@reaksan.local",
    desc: "Reservasi & Izin Lab",
  },
  {
    role: "PLP",
    badge: "🔬 PLP Laboratorium",
    email: "plp@reaksan.local",
    desc: "Approval & Verifikasi",
  },
  {
    role: "Admin",
    badge: "⚙️ Admin Lab",
    email: "admin@reaksan.local",
    desc: "Manajemen Sistem",
  },
];

export function SignInSplitForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ssoNotice, setSsoNotice] = useState(false);

  function handleSelectDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Reaksan-demo-123!");
    setError("");
    setSsoNotice(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError("");
    setSsoNotice(false);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(
          result.error.message ||
            "Email atau kata sandi tidak valid. Silakan coba lagi.",
        );
        return;
      }

      // Check user role to navigate directly to their dedicated workspace
      let role = result.data?.user?.role;
      if (!role) {
        const session = await authClient.getSession();
        role = session.data?.user?.role;
      }

      const targetPath = landingPathForRole(role);
      router.replace(targetPath);
      router.refresh();
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF7F2] text-[#212121]">
      {/* LEFT PANE: Collaborative Chemistry Lab Research Illustration */}
      <div className="hidden lg:flex lg:w-7/12 flex-col justify-between p-8 lg:p-12 border-r border-[#E1E1E1] bg-[#FAF7F2]">
        {/* Top bar with back to home */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#212121] hover:text-[#8D6500] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129] rounded-md px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full bg-[#F9B129]" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8D6500]">
              Departemen Kimia FMIPA Unpad
            </span>
          </div>
        </div>

        {/* Center Chemistry Lab Illustration */}
        <div className="flex flex-col items-center justify-center my-auto py-8">
          <div className="w-full max-w-[500px]">
            <LoginResearchIllustration className="w-full h-auto drop-shadow-sm" />
          </div>
          <div className="text-center mt-6 max-w-md">
            <h3 className="font-bold text-lg text-[#212121]">
              Laboratorium Riset & Praktikum Terpadu Kimia
            </h3>
            <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed">
              Sistem terpusat koordinasi ruang laboratorium riset, instrumen analitik canggih, dan pengelolaan bahan kimia Departemen Kimia Universitas Padjadjaran.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-[#929292] flex items-center justify-between border-t border-[#E1E1E1] pt-4">
          <span>&copy; {new Date().getFullYear()} Reaksan Unpad</span>
          <span>Versi 1.2.0 • Akses Terisolasi Peran</span>
        </div>
      </div>

      {/* RIGHT PANE: Clean Form Card */}
      <div className="w-full lg:w-5/12 bg-white flex flex-col justify-between min-h-screen px-6 py-8 sm:px-10 lg:px-12 relative shadow-xl lg:shadow-none">
        {/* Top Bar for Right Pane */}
        <div className="flex items-center justify-between w-full">
          <Link
            href="/"
            className="lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold text-[#212121] hover:text-[#8D6500]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>

          <div
            className="ml-auto w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E1E1E1] flex items-center justify-center text-[#F9B129]"
            title="Sistem Terpadu Reaksan"
            aria-hidden="true"
          >
            <Moon className="w-3.5 h-3.5 fill-[#F9B129] text-[#F9B129]" />
          </div>
        </div>

        {/* Centered Login Card Content */}
        <div className="w-full max-w-sm mx-auto my-auto py-6">
          {/* Brand Logo in Center - Official Reaksan Unpad Wordmark */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link
              href="/"
              className="inline-flex flex-col items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129] rounded-md p-1"
            >
              <ReaksanLogo className="text-[28px]" />
            </Link>
            <span className="text-[11px] font-medium text-[#6B6B6B] mt-2">
              Sistem Manajemen Lab Terpadu Kimia Unpad
            </span>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#212121] tracking-tight">
              Halo, Selamat datang kembali!
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Login untuk akses laboratorium & penelitian.
            </p>
          </div>

          {/* SSO Unpad Section */}
          <div className="space-y-2 mb-5">
            <p className="text-[11px] text-[#6B6B6B] text-center">
              Mahasiswa, dosen, dan civitas akademika login melalui SSO.
            </p>
            <button
              type="button"
              onClick={() => setSsoNotice(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#F9B129] text-[#212121] text-xs font-bold shadow-xs hover:bg-[#E5A020] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129]"
            >
              <Shield className="w-4 h-4 text-[#212121]" />
              <span>Masuk melalui SSO Unpad</span>
            </button>

            {ssoNotice && (
              <div className="p-2.5 rounded-lg bg-[#FEF1CC] border border-[#FDE68A] text-[11px] text-[#8D6500] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#AE7C1D] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Simulasi SSO Unpad:</span>{" "}
                  Pada pengujian lokal ini, silakan klik tombol <strong>Pilih Akun Demo</strong> di bawah untuk langsung mencoba peran Mahasiswa, PLP, atau Admin.
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-[#E1E1E1]"></div>
            <span className="absolute bg-white px-3 text-[10px] uppercase font-bold text-[#929292] tracking-wider">
              login akun lokal (khusus non-SSO / demo)
            </span>
          </div>

          {/* Local Account Form */}
          <form onSubmit={onSubmit} className="space-y-3.5">
            {/* Username / Email Field */}
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="sr-only"
              >
                Username atau Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#929292]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Username / Email"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white placeholder-[#94A3B8] text-[#212121] focus:border-[#F9B129] focus:ring-1 focus:ring-[#F9B129] outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label
                htmlFor="login-password"
                className="sr-only"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#929292]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white placeholder-[#94A3B8] text-[#212121] focus:border-[#F9B129] focus:ring-1 focus:ring-[#F9B129] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#929292] hover:text-[#212121] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#F45959] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#F45959]" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pending}
              className="w-full py-2.5 px-4 rounded-lg bg-[#212121] hover:bg-[#333333] active:bg-[#000000] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 mt-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129]"
            >
              {pending ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin text-[#F9B129]" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Quick Demo Role Selector Pills */}
          <div className="mt-6 pt-4 border-t border-[#E1E1E1]">
            <p className="text-[10px] uppercase font-bold text-[#6B6B6B] tracking-wider text-center mb-2.5">
              Pilih Akun Demo (1-Klik):
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc.email)}
                  className={`w-full px-3 py-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                    email === acc.email
                      ? "border-[#F9B129] bg-[#FEF1CC] font-bold text-[#212121] shadow-2xs"
                      : "border-[#E1E1E1] bg-white hover:bg-[#FAF7F2] text-[#212121]"
                  }`}
                >
                  <span className="font-semibold text-[11px]">{acc.badge}</span>
                  <span className="text-[10px] text-[#6B6B6B] font-mono">
                    {acc.email.split("@")[0]}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-center text-[#929292] mt-2">
              Password demo default: <code className="bg-[#FAF7F2] border border-[#E1E1E1] px-1.5 py-0.5 rounded text-[#212121] font-mono">Reaksan-demo-123!</code>
            </p>
          </div>
        </div>

        {/* Bottom copyright for right pane */}
        <div className="text-center text-[10px] text-[#929292] py-2">
          Departemen Kimia FMIPA Universitas Padjadjaran
        </div>
      </div>
    </div>
  );
}
