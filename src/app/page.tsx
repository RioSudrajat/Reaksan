import Link from "next/link";
import { ArrowRight, Moon, ShieldCheck, FlaskConical, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { landingPathForRole } from "@/lib/landing";
import { ReaksanLogo } from "@/components/reaksan-logo";
import { LandingLabIllustration } from "@/components/illustrations/landing-lab-illustration";

export default async function Home() {
  const session = await getSession();
  const targetPath = session ? landingPathForRole(session.user.role) : "/sign-in";
  const userRoleLabel =
    session?.user.role === "admin"
      ? "Admin"
      : session?.user.role === "plp"
        ? "PLP Laboratorium"
        : "Mahasiswa";

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#212121] flex flex-col justify-between selection:bg-[#F9B129]/30">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
        {/* Brand Logo - Official Reaksan Unpad Wordmark */}
        <Link
          href="/"
          className="group inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F9B129]"
          aria-label="Reaksan Unpad Home"
        >
          <ReaksanLogo className="text-[24px]" />
        </Link>

        {/* Right Nav Action */}
        <div className="flex items-center gap-4">
          <div
            className="w-9 h-9 rounded-full bg-white border border-[#E1E1E1] flex items-center justify-center text-[#F9B129] shadow-2xs"
            title="Sistem Terpadu Reaksan"
            aria-hidden="true"
          >
            <Moon className="w-4 h-4 fill-[#F9B129] text-[#F9B129]" />
          </div>

          <Link
            href={targetPath}
            className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-[#F9B129] text-[#212121] text-sm font-bold shadow-xs hover:bg-[#E5A020] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129] focus-visible:ring-offset-2"
          >
            {session ? "Buka Dashboard" : "Login"}
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center flex-1">
        {/* Left Column: Description & Direct Access */}
        <div className="lg:col-span-6 flex flex-col items-start gap-6 lg:pr-4">
          {/* Institutional Header - Clean Typographic Kicker (No Pill Badge) */}
          <div className="flex items-center gap-3">
            <span className="h-0.5 w-6 rounded-full bg-[#F9B129]" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8D6500]">
              Departemen Kimia FMIPA Unpad
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#212121] tracking-tight leading-[1.18]">
            Sistem Manajemen Laboratorium Terpadu Kimia
          </h1>

          {/* Main Description */}
          <p className="text-base sm:text-lg text-[#6B6B6B] leading-relaxed">
            Reaksan Unpad adalah sebuah sistem manajemen laboratorium terpadu Departemen Kimia Universitas Padjadjaran yang dirancang untuk mempermudah civitas akademika dalam peminjaman ruang laboratorium riset, instrumen analitik canggih, peralatan khusus, dan pengelolaan bahan kimia secara digital, tertib, dan transparan.
          </p>

          {/* Role Feature Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-1">
            <div className="p-3.5 rounded-xl bg-white border border-[#E1E1E1] shadow-2xs flex flex-col gap-1.5 transition-all hover:border-[#F9B129]/60">
              <div className="flex items-center gap-2 text-xs font-bold text-[#212121]">
                <div className="w-6 h-6 rounded-md bg-[#FEF1CC] flex items-center justify-center text-[#8D6500]">
                  <Users className="w-3.5 h-3.5" />
                </div>
                Mahasiswa
              </div>
              <p className="text-[12px] text-[#6B6B6B] leading-snug">
                Reservasi instrumen & pengajuan izin lab tugas akhir
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E1E1E1] shadow-2xs flex flex-col gap-1.5 transition-all hover:border-[#048444]/60">
              <div className="flex items-center gap-2 text-xs font-bold text-[#212121]">
                <div className="w-6 h-6 rounded-md bg-[#E5F5ED] flex items-center justify-center text-[#048444]">
                  <FlaskConical className="w-3.5 h-3.5" />
                </div>
                PLP Lab
              </div>
              <p className="text-[12px] text-[#6B6B6B] leading-snug">
                Validasi peminjaman, stok bahan & serah terima alat
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E1E1E1] shadow-2xs flex flex-col gap-1.5 transition-all hover:border-[#6E8EDA]/60">
              <div className="flex items-center gap-2 text-xs font-bold text-[#212121]">
                <div className="w-6 h-6 rounded-md bg-[#E9EEFC] flex items-center justify-center text-[#4B70CE]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                Admin Lab
              </div>
              <p className="text-[12px] text-[#6B6B6B] leading-snug">
                Monitoring analitik, jadwal ruangan & manajemen akun
              </p>
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="pt-3 flex flex-wrap items-center gap-4">
            <Link
              href={targetPath}
              className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#F9B129] text-[#212121] font-bold shadow-md hover:bg-[#E5A020] hover:shadow-lg active:scale-95 transition-all text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129] focus-visible:ring-offset-2"
            >
              <span>{session ? `Masuk ke Workspace (${userRoleLabel})` : "Masuk ke Sistem Reaksan"}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            {!session && (
              <span className="text-xs text-[#6B6B6B] font-medium">
                Gunakan SSO Unpad atau akun terdaftar
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Hero Chemistry Lab Vector Illustration */}
        <div className="lg:col-span-6 flex justify-center items-center">
          <div className="w-full max-w-[580px] drop-shadow-sm">
            <LandingLabIllustration className="w-full h-auto" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E1E1E1] bg-[#FAF7F2]/90 mt-12 py-8">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Reaksan Brand Details */}
          <div className="flex items-center gap-4">
            <ReaksanLogo className="text-[20px]" />
            <div className="border-l border-[#D1D1D1] pl-4">
              <p className="text-xs font-semibold text-[#212121]">
                Departemen Kimia FMIPA Universitas Padjadjaran
              </p>
              <p className="text-xs text-[#6B6B6B]">
                Sistem Manajemen Laboratorium Terpadu
              </p>
            </div>
          </div>

          {/* Right: Department Contact Info */}
          <div className="text-left md:text-right text-xs text-[#6B6B6B] space-y-1">
            <div className="font-bold text-[#212121]">Contact Info</div>
            <p>Departemen Kimia FMIPA Universitas Padjadjaran</p>
            <p>Jl. Raya Bandung-Sumedang Km. 21, Jatinangor, Sumedang 45363</p>
            <p>
              Email:{" "}
              <a
                href="mailto:kimia@unpad.ac.id"
                className="text-[#8D6500] font-bold hover:underline"
              >
                kimia@unpad.ac.id
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
