"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ReaksanLogo } from "@/components/reaksan-logo";
import { LoginResearchIllustration } from "@/components/illustrations/login-research-illustration";
import { landingPathForRole } from "@/lib/landing";

const DEMO_ACCOUNTS = [
  {
    role: "Mahasiswa",
    badge: "🎓 Mahasiswa",
    identifier: "140310210001",
    desc: "NIM: 140310210001 (Reservasi Lab)",
  },
  {
    role: "PLP",
    badge: "🔬 PLP Laboratorium",
    identifier: "198503152010121001",
    desc: "NIP: 198503152010121001 (Operator Lab)",
  },
  {
    role: "Admin",
    badge: "⚙️ Admin Lab",
    identifier: "admin",
    desc: "Username: admin (Manajemen Sistem)",
  },
];

export function SignInSplitForm() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ssoNotice, setSsoNotice] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Progressive lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  function handleFailedAttempt() {
    setFailedAttempts((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 5) {
        setLockoutSeconds(60);
        return 0; // Reset consecutive counter after lockout triggered
      }
      return nextCount;
    });
  }

  function handleSelectDemo(demoId: string) {
    if (lockoutSeconds > 0) return;
    setIdentifier(demoId);
    setPassword("Reaksan-demo-123!");
    setError("");
    setSsoNotice(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || lockoutSeconds > 0) return;

    setError("");
    setSsoNotice(false);

    // Client-side Sanitization & Validation (Defense in Depth)
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Silakan masukkan NIM / NIP atau Username Anda.");
      return;
    }

    if (!password) {
      setError("Silakan masukkan kata sandi.");
      return;
    }

    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setPending(true);

    try {
      let result;
      if (cleanId.includes("@")) {
        result = await authClient.signIn.email({
          email: cleanId.toLowerCase(),
          password,
          rememberMe: false,
        });
      } else {
        result = await authClient.signIn.username({
          username: cleanId.toLowerCase(),
          password,
          rememberMe: false,
        });
      }

      if (result.error) {
        handleFailedAttempt();
        // Prevent Account Enumeration: Return uniform message instead of leaking user existence
        if (result.error.status === 429) {
          setError(
            "Terlalu banyak percobaan masuk yang gagal. Mohon tunggu beberapa saat sebelum mencoba lagi.",
          );
        } else {
          setError(
            "NIM / NIP atau kata sandi tidak valid. Silakan periksa kembali.",
          );
        }
        return;
      }

      // Successful login: reset failed attempts
      setFailedAttempts(0);

      // Check user role to navigate directly to their dedicated workspace
      let role = result.data?.user?.role;
      if (!role) {
        const session = await authClient.getSession();
        role = session.data?.user?.role;
      }

      const targetPath = landingPathForRole(role);
      window.location.href = targetPath;
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setPending(false);
    }
  }

  const isDemoHidden = process.env.NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS === "true";

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
            <span
              className="h-0.5 w-4 rounded-full bg-[#F9B129]"
              aria-hidden="true"
            />
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
              Sistem terpusat koordinasi ruang laboratorium riset, instrumen
              analitik canggih, dan pengelolaan bahan kimia Departemen Kimia
              Universitas Padjadjaran.
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
                  <span className="font-bold">Simulasi SSO Unpad:</span> Pada
                  tahap evaluasi publik ini, silakan gunakan akun demo atau
                  kredensial yang terdaftar untuk menguji fitur.
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-[#E1E1E1]"></div>
            <span className="absolute bg-white px-3 text-[10px] uppercase font-bold text-[#929292] tracking-wider">
              login kredensial lab
            </span>
          </div>

          {/* Local Account Form */}
          <form onSubmit={onSubmit} className="space-y-3.5">
            {isExpired && !error && (
              <div
                role="status"
                className="p-2.5 rounded-lg bg-[#FEF1CC] border border-[#FDE68A] text-xs text-[#8D6500] flex items-center gap-2"
              >
                <Info className="w-4 h-4 shrink-0 text-[#AE7C1D]" />
                <span>
                  Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan
                  masuk kembali.
                </span>
              </div>
            )}

            {/* Lockout Warning */}
            {lockoutSeconds > 0 && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5 animate-pulse"
              >
                <Clock className="w-4 h-4 shrink-0 text-amber-700" />
                <div>
                  <span className="font-bold">Keamanan Akun:</span> Terlalu
                  banyak percobaan gagal. Formulir dikunci sementara selama{" "}
                  <span className="font-bold underline">
                    {lockoutSeconds} detik
                  </span>
                  .
                </div>
              </div>
            )}

            {/* NIM / NIP or Username Field */}
            <div className="space-y-1">
              <label htmlFor="login-identifier" className="sr-only">
                NIM / NIP, Username, atau Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#929292]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={pending || lockoutSeconds > 0}
                  maxLength={120}
                  spellCheck={false}
                  autoCapitalize="none"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="NIM / NIP, Username, atau Email"
                  aria-label="Email"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white placeholder-[#94A3B8] text-[#212121] focus:border-[#F9B129] focus:ring-1 focus:ring-[#F9B129] outline-none transition-all disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#929292]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={pending || lockoutSeconds > 0}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white placeholder-[#94A3B8] text-[#212121] focus:border-[#F9B129] focus:ring-1 focus:ring-[#F9B129] outline-none transition-all disabled:opacity-50 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  disabled={pending || lockoutSeconds > 0}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#929292] hover:text-[#212121] transition-colors focus:outline-none disabled:opacity-40"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
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
              <div
                role="alert"
                className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#F45959] text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#F45959]" />
                <span>{error}</span>
              </div>
            )}

            {/* Attempts Warning */}
            {failedAttempts >= 3 && lockoutSeconds === 0 && (
              <div
                role="status"
                className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-[#C2410C] text-[11px] flex items-center gap-2"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#C2410C]" />
                <span>
                  Peringatan keamanan: {5 - failedAttempts} percobaan tersisa
                  sebelum formulir dikunci sementara.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pending || lockoutSeconds > 0}
              className="w-full py-2.5 px-4 rounded-lg bg-[#212121] hover:bg-[#333333] active:bg-[#000000] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 mt-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin text-[#F9B129]" />
                  <span>Memverifikasi...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <span>Terkunci ({lockoutSeconds}s)</span>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Quick Demo Role Selector Pills - Wrapped in an evaluative, secure toggle */}
          {!isDemoHidden && (
            <div className="mt-6 pt-4 border-t border-[#E1E1E1]">
              <button
                type="button"
                onClick={() => setShowDemoSelector((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-[#6B6B6B] hover:text-[#212121] transition-colors py-1 px-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F9B129]"
              >
                <span className="uppercase tracking-wider text-[10px]">
                  Mode Evaluasi & Akun Demo
                </span>
                {showDemoSelector ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#6B6B6B]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#6B6B6B]" />
                )}
              </button>

              {showDemoSelector && (
                <div className="mt-2.5 space-y-2">
                  <div className="p-2 rounded-md bg-[#FAF7F2] border border-[#E8E2D7] text-[10px] text-[#6B6B6B] leading-relaxed">
                    <span className="font-semibold text-[#212121]">
                      Informasi Keamanan:
                    </span>{" "}
                    Akun demo disediakan untuk menguji peran civitas akademika
                    (Mahasiswa, PLP, Admin). Di lingkungan produksi resmi dengan
                    data riset sesungguhnya, opsi ini dapat disembunyikan.
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.identifier}
                        type="button"
                        disabled={lockoutSeconds > 0}
                        onClick={() => handleSelectDemo(acc.identifier)}
                        className={`w-full px-3 py-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                          identifier === acc.identifier
                            ? "border-[#F9B129] bg-[#FEF1CC] font-bold text-[#212121] shadow-2xs"
                            : "border-[#E1E1E1] bg-white hover:bg-[#FAF7F2] text-[#212121]"
                        } disabled:opacity-50`}
                      >
                        <span className="font-semibold text-[11px]">
                          {acc.badge}
                        </span>
                        <span className="text-[10px] text-[#6B6B6B] font-mono">
                          {acc.identifier}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-center text-[#929292] mt-1.5">
                    Password demo default:{" "}
                    <code className="bg-[#FAF7F2] border border-[#E1E1E1] px-1.5 py-0.5 rounded text-[#212121] font-mono">
                      Reaksan-demo-123!
                    </code>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom copyright for right pane */}
        <div className="text-center text-[10px] text-[#929292] py-2">
          Departemen Kimia FMIPA Universitas Padjadjaran
        </div>
      </div>
    </div>
  );
}
