"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  FlaskConical,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Microscope,
  PackageCheck,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Undo2,
  UserCheck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { authClient } from "@/lib/auth-client";
import { ReaksanLogo, ReaksanSymbol } from "@/components/reaksan-logo";
import { SignOutButton } from "@/components/sign-out-button";

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  requests: ClipboardList,
  issue: PackageCheck,
  return: Undo2,
  schedule: CalendarDays,
  calendar: CalendarDays,
  instruments: Microscope,
  equipment: PackageSearch,
  assets: Wrench,
  units: Tag,
  materials: FlaskConical,
  batches: Boxes,
  incidents: ShieldAlert,
  notifications: Bell,
  history: History,
  users: Users,
  roles: ShieldCheck,
  permissions: KeyRound,
  labs: Building2,
  rooms: DoorOpen,
  assignments: UserCheck,
  configuration: Settings,
  audit: ScrollText,
};

export type NavItem = {
  label: string;
  href: string;
  icon: keyof typeof iconMap;
  badge?: number;
};

export type NavGroup = { label: string; items: NavItem[] };

function bestMatch(pathname: string, nav: NavGroup[]) {
  const items = nav.flatMap((group) => group.items);
  return items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function WorkspaceShell({
  nav,
  userName,
  userEmail,
  roleLabel,
  accountHref,
  unreadCount = 0,
  children,
}: {
  nav: NavGroup[];
  userName: string;
  userEmail?: string;
  roleLabel: string;
  accountHref: string;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  const firstName = userName.trim().split(/\s+/)[0] || "PENELITI";
  const formattedDate = useMemo(() => {
    try {
      const d = new Date();
      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MEI",
        "JUN",
        "JUL",
        "AGU",
        "SEP",
        "OKT",
        "NOV",
        "DES",
      ];
      const month = months[d.getMonth()] ?? "OKT";
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return "05 OKT 2026";
    }
  }, []);

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  const active = bestMatch(pathname, nav);

  return (
    <div className="dashboard-shell min-h-screen">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-[#212121]/25 lg:hidden"
          aria-label="Tutup menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E1E1E1] bg-white px-3 py-4 transition-transform duration-200 lg:translate-x-0 print:hidden",
          collapsed ? "lg:w-[72px]" : "lg:w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navigasi utama"
      >
        <div
          className={cn(
            "flex h-12 items-center gap-3 px-2",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          {collapsed && (
            <ReaksanSymbol
              className="hidden size-9 lg:block"
              title="Reaksan Unpad"
            />
          )}
          <div className={cn("min-w-0", collapsed && "lg:hidden")}>
            <ReaksanLogo className="text-[17px]" />
            <p className="mt-1 truncate text-[10px] font-medium uppercase leading-none tracking-[0.13em] text-[#929292]">
              {roleLabel}
            </p>
          </div>
          <button
            className={cn(
              "ml-auto flex size-9 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F3F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]",
              collapsed && "lg:hidden",
            )}
            aria-label="Tutup navigasi"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto px-1">
          {nav.map((group) => (
            <div key={group.label}>
              <p
                className={cn(
                  "mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]",
                  collapsed && "lg:hidden",
                )}
              >
                {group.label}
              </p>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon] ?? LayoutDashboard;
                  const isActive = item.href === active?.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-[#64748B] transition hover:bg-[#F8F9FA] hover:text-[#121826] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]",
                        isActive && "bg-[#FEF7E6] font-semibold text-[#121826] border border-[#FDE68A]/70 shadow-xs",
                        collapsed && "lg:justify-center lg:px-0",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className={cn(
                          "size-[17px] shrink-0",
                          isActive
                            ? "text-[#8D6500]"
                            : "text-[#94A3B8] group-hover:text-[#121826]",
                        )}
                        strokeWidth={isActive ? 2.3 : 1.8}
                        aria-hidden="true"
                      />
                      <span className={cn("truncate", collapsed && "lg:hidden")}>
                        {item.label}
                      </span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={cn(
                            "ml-auto rounded-full bg-[#FEF2F2] border border-[#FECACA]/70 px-2 py-0.5 text-[10px] font-bold text-[#991B1B]",
                            collapsed && "lg:hidden",
                          )}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "mt-4 border-t border-[#E5E7EB] pt-4",
            collapsed && "lg:flex lg:justify-center",
          )}
        >
          <div
            className={cn(
              "rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]/60 p-3",
              collapsed && "lg:bg-transparent lg:p-1 lg:border-none",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FEF7E6] border border-[#FDE68A] text-[12px] font-bold text-[#8D6500]">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <div className={cn("min-w-0", collapsed && "lg:hidden")}>
                <p className="truncate text-[12px] font-semibold text-[#121826]">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-[#64748B]">
                  {roleLabel}
                </p>
              </div>
            </div>
            <div
              className={cn("mt-3 [&_button]:w-full", collapsed && "lg:hidden")}
            >
              <SignOutButton />
            </div>
          </div>
        </div>
        <button
          className="absolute -right-4 top-20 hidden size-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#64748B] shadow-sm hover:bg-[#F8F9FA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] lg:flex"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand navigasi" : "Ciutkan navigasi"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </aside>

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200 lg:pl-[240px] print:pl-0 print:min-h-0",
          collapsed && "lg:pl-[72px]",
        )}
      >
        <header className="sticky top-0 z-30 pt-3 pb-2 px-3 sm:px-6 lg:px-8 print:hidden pointer-events-none">
          <div className="pointer-events-auto mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 rounded-full border border-[#E2E8F0] bg-white px-3 sm:px-5 shadow-xs transition-shadow">
            {/* Mobile menu button */}
            <button
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka navigasi"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>

            {/* Left: Greeting + Role & Date */}
            <div className="flex flex-col min-w-0 shrink-0">
              <h1 className="text-[13px] sm:text-[14px] font-black tracking-tight leading-none truncate">
                <span className="text-[#1E293B]">HALO, </span>
                <span className="text-[#F9B129] uppercase">{firstName}!</span>
              </h1>
              <p className="mt-1 text-[9px] sm:text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase leading-none truncate">
                {roleLabel.toUpperCase()} • {formattedDate}
              </p>
            </div>

            {/* Center: Search pill */}
            <div className="relative hidden md:flex items-center flex-1 max-w-sm lg:max-w-md mx-2 lg:mx-4">
              <Search
                className="pointer-events-none absolute left-3.5 size-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ruangan, instrumen, atau jadwal..."
                className="h-9 w-full rounded-full border border-[#E2E8F0]/80 bg-[#F8FAFC] pl-9 pr-4 text-xs text-[#1E293B] placeholder:text-[#94A3B8] outline-none transition focus:border-[#F9B129] focus:bg-white focus:ring-2 focus:ring-[#F9B129]/20"
              />
            </div>

            {/* Right: Notifications + Profile (replacing + JOIN EVENT) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
              <Link
                href={accountHref}
                className="relative flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
                aria-label={
                  unreadCount > 0
                    ? `Notifikasi, ${unreadCount} belum dibaca`
                    : "Notifikasi"
                }
              >
                <Bell className="size-4 sm:size-[17px]" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
                )}
              </Link>

              {/* Profile button (placed on the right, matching user specification) */}
              <div className="relative shrink-0" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] p-1 sm:pr-3 transition hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  aria-label="Menu profil pengguna"
                >
                  <div className="relative flex size-8 items-center justify-center rounded-full bg-[#FEF7E6] border border-[#FDE68A] text-xs font-bold text-[#8D6500]">
                    {userName.slice(0, 1).toUpperCase()}
                    <span
                      className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#84CC16] ring-2 ring-white"
                      title="Status: Online"
                    />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="max-w-[110px] truncate text-[12px] font-bold leading-tight text-[#1E293B]">
                      {userName}
                    </p>
                    <p className="max-w-[110px] truncate text-[10px] font-medium leading-none text-[#64748B] mt-0.5">
                      {roleLabel}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "hidden sm:block size-3.5 text-slate-400 transition-transform duration-150",
                      profileOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/50 z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="relative flex size-10 items-center justify-center rounded-full bg-[#FEF7E6] border border-[#FDE68A] text-sm font-bold text-[#8D6500]">
                        {userName.slice(0, 1).toUpperCase()}
                        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#84CC16] ring-2 ring-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#1E293B]">
                          {userName}
                        </p>
                        {userEmail && (
                          <p className="truncate text-[11px] text-slate-500">
                            {userEmail}
                          </p>
                        )}
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600 uppercase tracking-wider">
                          {roleLabel}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-1">
                      <Link
                        href={accountHref}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        role="menuitem"
                      >
                        <Bell className="size-4 text-slate-400" />
                        <span>Notifikasi & Aktivitas</span>
                        {unreadCount > 0 && (
                          <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-700">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        disabled={signingOut}
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                        role="menuitem"
                      >
                        <LogOut className="size-4" />
                        <span>{signingOut ? "Keluar..." : "Keluar Akun"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1680px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
