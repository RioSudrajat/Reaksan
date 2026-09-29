"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  Boxes,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  FlaskConical,
  History,
  KeyRound,
  LayoutDashboard,
  Menu,
  PackageCheck,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
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
import { ReaksanLogo, ReaksanSymbol } from "@/components/reaksan-logo";
import { SignOutButton } from "@/components/sign-out-button";

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  requests: ClipboardList,
  issue: PackageCheck,
  return: Undo2,
  schedule: CalendarDays,
  equipment: PackageSearch,
  assets: Wrench,
  units: Tag,
  materials: FlaskConical,
  batches: Boxes,
  incidents: ShieldAlert,
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
  roleLabel,
  accountHref,
  unreadCount = 0,
  children,
}: {
  nav: NavGroup[];
  userName: string;
  roleLabel: string;
  accountHref: string;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = bestMatch(pathname, nav);
  const current = nav
    .flatMap((group) => group.items)
    .find((item) => item.href === active?.href);

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
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E1E1E1] bg-white px-3 py-4 transition-transform duration-200 lg:translate-x-0",
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
              "ml-auto flex size-9 items-center justify-center rounded-lg text-[#6B6B6B] transition hover:bg-[#F1F0EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
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
                  "mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#929292]",
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
                        "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-[#6B6B6B] transition hover:bg-[#F5F5F5] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
                        isActive && "bg-[#FEF1CC] font-semibold text-[#212121]",
                        collapsed && "lg:justify-center lg:px-0",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className={cn(
                          "size-[17px] shrink-0",
                          isActive
                            ? "text-[#AE7C1D]"
                            : "text-[#929292] group-hover:text-[#212121]",
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
                            "ml-auto rounded-full bg-[#FDE9E9] px-2 py-0.5 text-[10px] font-bold text-[#9E3636]",
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
            "mt-4 border-t border-[#EEEEEE] pt-4",
            collapsed && "lg:flex lg:justify-center",
          )}
        >
          <div
            className={cn(
              "rounded-xl bg-[#F5F5F5] p-3",
              collapsed && "lg:bg-transparent lg:p-1",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#D9E2F8] text-[12px] font-bold text-[#38529B]">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <div className={cn("min-w-0", collapsed && "lg:hidden")}>
                <p className="truncate text-[12px] font-semibold text-[#212121]">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-[#6B6B6B]">
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
          className="absolute -right-4 top-20 hidden size-8 items-center justify-center rounded-full border border-[#E1E1E1] bg-white text-[#6B6B6B] shadow-sm hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] lg:flex"
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
          "min-h-screen transition-[padding] duration-200 lg:pl-[240px]",
          collapsed && "lg:pl-[72px]",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-[#E1E1E1]/90 bg-[#F5F5F5]/95 backdrop-blur-sm">
          <div className="flex min-h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="flex size-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white text-[#212121] lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka navigasi"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#212121]">
                {current?.label ?? "Reaksan"}
              </p>
              <p className="truncate text-[11px] text-[#6B6B6B]">{roleLabel}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={accountHref}
                className="relative flex size-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white text-[#6B6B6B] transition hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                aria-label={
                  unreadCount > 0
                    ? `Notifikasi, ${unreadCount} belum dibaca`
                    : "Notifikasi"
                }
              >
                <Bell className="size-[18px]" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#F45959] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1680px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
