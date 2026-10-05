"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "cn";
import { ReaksanLogo, ReaksanSymbol } from "@/components/reaksan-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { CatalogImage } from "@/components/catalog-image";
import { StatusBadge, toneClasses } from "@/components/status-badge";
import {
  requestStatusLabels,
  requestStatusTone,
  type IncidentView,
  type LabCatalog,
  type RoomView,
  type ScheduleEvent,
} from "@/components/schedule-data";

export type Room = RoomView;

const navGroups = [
  {
    label: "Workspace",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/student",
      },
      {
        label: "My calendar",
        icon: CalendarDays,
        key: "calendar",
        href: "/student/calendar",
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        label: "Incidents",
        icon: ShieldAlert,
        key: "incidents",
        href: "/student/incidents",
      },
      {
        label: "Notifications",
        icon: Bell,
        key: "notifications",
        href: "/student/notifications",
      },
    ],
  },
];

export { StatusBadge, toneClasses };

export function SectionTitle({
  eyebrow: _eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[17px] sm:text-[18px] font-bold tracking-tight text-[#1E293B]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onClose,
  userName,
  activeKey = "dashboard",
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  userName: string;
  activeKey?: string;
}) {
  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-[#212121]/25 lg:hidden"
          aria-label="Tutup menu"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-[#E1E1E1] bg-white px-3 py-4 transition-transform duration-200 lg:translate-x-0",
          collapsed ? "lg:w-[80px]" : "lg:w-[256px]",
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
              Lab coordination
            </p>
          </div>
          <button
            className={cn(
              "ml-auto flex size-9 items-center justify-center rounded-lg text-[#6B6B6B] transition hover:bg-[#F1F0EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
              collapsed && "lg:hidden",
            )}
            aria-label="Tutup navigasi"
            onClick={onClose}
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-7 flex-1 space-y-7 overflow-y-auto px-1">
          {navGroups.map((group) => (
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
                  const Icon = item.icon;
                  const isActive = item.key === activeKey;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
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
                      <span
                        className={cn("truncate", collapsed && "lg:hidden")}
                      >
                        {item.label}
                      </span>
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
              collapsed && "lg:p-1 lg:bg-transparent",
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
                  Student researcher
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
          onClick={onToggle}
          aria-label={collapsed ? "Expand navigasi" : "Ciutkan navigasi"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </aside>
    </>
  );
}

export function LabMap({
  rooms,
  selectedRoom,
  onSelectRoom,
  searchTerm,
}: {
  rooms: RoomView[];
  selectedRoom: RoomView | null;
  onSelectRoom: (room: RoomView | null) => void;
  searchTerm: string;
}) {
  const [rotation, setRotation] = useState({ yaw: -8, pitch: 18 });

  const visibleRooms = rooms.filter((room) =>
    `${room.name} ${room.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const updateRotation = (yawDelta: number, pitchDelta: number) => {
    setRotation((current) => ({
      yaw: current.yaw + yawDelta,
      pitch: Math.max(-80, Math.min(80, current.pitch + pitchDelta)),
    }));
  };

  return (
    <div
      id="map"
      className="dashboard-card relative min-h-[470px] overflow-hidden p-3 sm:p-4"
    >
      <div className="relative h-[430px] overflow-hidden rounded-[13px] map-grid">
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 py-2 shadow-sm">
          <MapPin className="size-4 text-[#AE7C1D]" aria-hidden="true" />
          <div>
            <p className="text-[12px] font-semibold text-[#212121]">
              Laboratorium Kimia
            </p>
            <p className="text-[10px] text-[#6B6B6B]">
              {rooms.length} lab · klik untuk pilih / lepas seleksi
            </p>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            className="flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 text-[11px] font-semibold text-[#6B6B6B] shadow-sm transition hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            aria-label="Filter denah laboratorium"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button
            className="flex size-10 items-center justify-center rounded-xl border border-white/80 bg-white/95 text-[#6B6B6B] shadow-sm transition hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            aria-label="Kembalikan sudut pandang denah"
            onClick={() => setRotation({ yaw: -8, pitch: 18 })}
            title="Reset sudut pandang"
          >
            <span className="text-[16px]" aria-hidden="true">
              ↺
            </span>
          </button>
        </div>

        <div className="absolute right-4 top-[68px] z-20 flex items-center gap-1 rounded-xl border border-white/80 bg-white/95 p-1 shadow-sm">
          <button
            className="flex size-9 items-center justify-center rounded-lg text-[16px] text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            onClick={() => updateRotation(-18, 0)}
            aria-label="Putar denah ke kiri"
            title="Putar ke kiri"
          >
            ←
          </button>
          <button
            className="flex size-9 items-center justify-center rounded-lg text-[16px] text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            onClick={() => updateRotation(18, 0)}
            aria-label="Putar denah ke kanan"
            title="Putar ke kanan"
          >
            →
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 rounded-xl border border-white/80 bg-white/95 p-2 shadow-sm">
          <StatusBadge tone="green">Tersedia</StatusBadge>
          <StatusBadge tone="blue">Direservasi</StatusBadge>
          <StatusBadge tone="yellow">Digunakan</StatusBadge>
        </div>

        <div
          className="lab-floor absolute inset-[7%] select-none cursor-default"
          role="region"
          aria-label="Denah interaktif laboratorium. Klik ruangan untuk memilih, klik sekali lagi atau area kosong untuk membatalkan."
          style={{
            transform: `perspective(1200px) rotateX(${rotation.pitch}deg) rotateY(${rotation.yaw}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          onClick={() => {
            if (selectedRoom) {
              onSelectRoom(null);
            }
          }}
        >
          <div className="absolute inset-[5%] rounded-[6%] border-[10px] border-[#E8E4DB] bg-[#D9D1C1] shadow-2xl shadow-[#6B5A3A]/20" />
          <div className="absolute inset-[8%] rounded-[4%] border border-[#B8AE9D] bg-[#D8D0C2]" />
          {visibleRooms.map((room) => {
            const isSelected = selectedRoom?.id === room.id;
            return (
              <button
                key={room.id}
                type="button"
                className={cn(
                  "lab-room absolute z-20 flex flex-col justify-between rounded-md border-2 p-3 text-left transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#212121]",
                  room.tone === "yellow" && "border-[#D3A02D] bg-[#F8E3A9] hover:bg-[#F3DC9B]",
                  room.tone === "blue" && "border-[#91A9E6] bg-[#C9D6F5] hover:bg-[#BCD0F5]",
                  room.tone === "green" && "border-[#8FC9A5] bg-[#C8E7D1] hover:bg-[#BBE2C6]",
                  room.tone === "cream" && "border-[#BAB6AC] bg-[#F0EEE8] hover:bg-[#EAE7DF]",
                  room.tone === "rose" && "border-[#D7A0A0] bg-[#F7D7D7] hover:bg-[#F5CCCC]",
                  isSelected
                    ? "z-30 ring-4 ring-[#F9B129] ring-offset-2 scale-[1.04] shadow-lg brightness-105"
                    : "hover:scale-[1.02] active:scale-[0.98]",
                )}
                style={room.position}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectRoom(isSelected ? null : room);
                }}
                aria-label={`Pilih ${room.name}`}
                aria-pressed={isSelected}
              >
                <div className="pointer-events-none flex items-start justify-between gap-2">
                  <span className="max-w-[75%] text-[10px] font-bold uppercase tracking-[0.09em] text-[#4F4B43] sm:text-[11px]">
                    {room.shortName}
                  </span>
                  <span
                    className="size-2 rounded-full bg-[#048444] ring-2 ring-white/70"
                    aria-label="tersedia"
                  />
                </div>
                <div className="pointer-events-none space-y-1 text-[10px] font-medium text-[#5D5B53]">
                  <div className="h-2 w-2/3 rounded-full bg-white/50" />
                  <div className="h-2 w-1/2 rounded-full bg-white/50" />
                  <div className="flex items-center gap-1 pt-1">
                    <PackageSearch className="size-3" aria-hidden="true" />
                    {room.available} siap pakai
                  </div>
                </div>
              </button>
            );
          })}
          <div className="absolute left-[34%] top-[46%] flex h-[10%] w-[38%] items-center justify-center rounded-sm border border-[#C6B99F] bg-[#EFE9DC] text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A7B61] shadow-sm">
            Sirkulasi Utama
          </div>
          <div className="absolute left-[30%] top-[18%] h-[8%] w-[5%] rounded-sm bg-[#B8D9AE] shadow-sm" />
          <div className="absolute right-[22%] bottom-[16%] h-[9%] w-[6%] rounded-sm bg-[#B8D9AE] shadow-sm" />
          <div className="absolute left-[73%] top-[51%] flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#F9B129] text-[#212121] shadow-md">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
          </div>
        </div>

        {visibleRooms.length === 0 && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#F6EFE1]/90 p-6 text-center">
            <div>
              <Search
                className="mx-auto size-7 text-[#929292]"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-semibold text-[#212121]">
                Ruangan tidak ditemukan
              </p>
              <p className="mt-1 text-xs text-[#6B6B6B]">
                Coba kata kunci lain.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReaksanDashboard({
  userName,
  catalog,
  events,
  unreadCount: _unreadCount,
  latestIncident,
}: {
  userName: string;
  catalog: LabCatalog;
  events: ScheduleEvent[];
  unreadCount: number;
  latestIncident: IncidentView | null;
}) {
  const rooms = catalog.rooms;
  const [selectedRoom, setSelectedRoom] = useState<RoomView | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [requestView, setRequestView] = useState<"upcoming" | "requests">(
    "upcoming",
  );
  const currentRoom =
    selectedRoom && rooms.some((room) => room.id === selectedRoom.id)
      ? selectedRoom
      : null;
  const myEvents = events;
  const lab = {
    availableUnits: catalog.equipment.reduce(
      (total, item) => total + item.availableUnits,
      0,
    ),
    totalUnits: catalog.equipment.reduce(
      (total, item) => total + item.totalUnits,
      0,
    ),
    typeCount: catalog.equipment.length,
  };
  const pendingEvents = myEvents.filter(
    (event) =>
      event.status === "PENDING_PLP" || event.status === "REQUEST_REVISION",
  );
  const approvedEvents = myEvents.filter(
    (event) => event.status === "APPROVED" || event.status === "ACTIVE",
  );
  const reservationRows = approvedEvents.map((event) => ({
    id: event.id,
    time: `${event.time}`,
    mediaId: event.imageMediaId ?? null,
    title:
      event.resourceId && event.resourceUnit
        ? `${event.title} · ${event.resourceUnit}`
        : event.title,
    detail: `${event.roomName} · ${
      event.equipment?.length
        ? `${event.equipment.length} alat/instrumen`
        : "tanpa instrumen"
    }`,
    status: requestStatusLabels[event.status],
    tone: requestStatusTone(event.status),
  }));
  const requestRows = myEvents.map((event) => ({
    id: event.resourceUnit ?? event.resourceId ?? event.requestCode ?? event.id,
    key: event.id,
    mediaId: event.imageMediaId ?? null,
    title: event.title,
    detail:
      [
        event.requestCode,
        event.equipment?.length ? `${event.equipment.length} instrumen` : null,
        event.materials?.length ? `${event.materials.length} bahan` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Belum ada instrumen/bahan",
    status: requestStatusLabels[event.status],
    tone: requestStatusTone(event.status),
  }));

  const firstName = userName.trim().split(/\s+/)[0] || "Peneliti";
  const searchMatches = useMemo(
    () =>
      rooms.filter((room) =>
        `${room.name} ${room.description}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [rooms, searchTerm],
  );
  const selectedRoomMatchesSearch = currentRoom
    ? searchMatches.some((room) => room.id === currentRoom.id)
    : false;
  const visibleSelectedRoom =
    (searchTerm.trim() && currentRoom && !selectedRoomMatchesSearch
      ? (searchMatches[0] ?? currentRoom)
      : currentRoom) ?? null;
  const selectedTone = visibleSelectedRoom ? toneClasses[visibleSelectedRoom.tone] : null;
  const roomOpenPercent =
    visibleSelectedRoom && visibleSelectedRoom.equipment > 0
      ? Math.round(
          (visibleSelectedRoom.available / visibleSelectedRoom.equipment) * 100,
        )
      : 0;

  return (
    <div id="top" className="space-y-6">
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">
            Selamat datang kembali, {firstName}
          </p>
          <h2 className="mt-1 max-w-[650px] text-[24px] font-extrabold leading-tight tracking-tight text-[#1E293B] sm:text-[30px]">
            Pusat Reservasi & Koordinasi Laboratorium Kimia
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="relative block w-52 sm:w-72">
            <span className="sr-only">Cari ruangan atau instrumen</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]"
              aria-hidden="true"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-[12px] text-[#1E293B] outline-none placeholder:text-[#94A3B8] transition focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
              placeholder="Cari ruangan atau instrumen..."
            />
          </label>
          <div className="hidden sm:flex items-center gap-2 text-[12px] font-medium text-[#64748B]">
            <span
              className="flex size-2 rounded-full bg-[#048444]"
              aria-hidden="true"
            />
            <span>Status Terkini</span>
          </div>
        </div>
      </section>

          <section
            className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
            aria-labelledby="lab-overview-title"
          >
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2
                    id="lab-overview-title"
                    className="text-[18px] font-bold tracking-tight text-[#1E293B]"
                  >
                    Denah Laboratorium & Status Ruangan
                  </h2>
                </div>
                <a
                  className="hidden items-center gap-1 text-[12px] font-semibold text-[#64748B] hover:text-[#1E293B] sm:flex"
                  href="#map"
                >
                  Buka denah lengkap{" "}
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </a>
              </div>
              <LabMap
                rooms={rooms}
                selectedRoom={visibleSelectedRoom}
                onSelectRoom={setSelectedRoom}
                searchTerm={searchTerm}
              />
            </div>

            {visibleSelectedRoom && selectedTone ? (
              <motion.aside
                key={visibleSelectedRoom.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="dashboard-card flex flex-col p-5"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#AE7C1D]">
                      Ruang Terpilih
                    </span>
                    <h3 className="mt-1 text-[20px] font-bold leading-tight tracking-tight text-[#1E293B]">
                      {visibleSelectedRoom.name}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      selectedTone.soft,
                    )}
                  >
                    <FlaskConical className="size-[18px]" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
                  {visibleSelectedRoom.description}
                </p>

                <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] font-semibold text-[#64748B]">
                    Total Instrumen ·{" "}
                    <span className="font-bold tabular-nums text-[#1E293B]">
                      {visibleSelectedRoom.equipment} unit
                    </span>{" "}
                    dari {visibleSelectedRoom.typeCount} jenis terdata
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white p-2.5 text-center border border-slate-100 shadow-2xs">
                      <p className="text-[18px] font-bold tabular-nums text-[#048444]">
                        {visibleSelectedRoom.available}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#64748B]">Tersedia</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 text-center border border-slate-100 shadow-2xs">
                      <p className="text-[18px] font-bold tabular-nums text-[#6E8EDA]">
                        {visibleSelectedRoom.reserved}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#64748B]">Reservasi</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 text-center border border-slate-100 shadow-2xs">
                      <p className="text-[18px] font-bold tabular-nums text-[#AE7C1D]">
                        {visibleSelectedRoom.inUse}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#64748B]">Dipakai</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 text-center border border-slate-100 shadow-2xs">
                      <p className="text-[18px] font-bold tabular-nums text-[#9E3636]">
                        {visibleSelectedRoom.awaitingReturn}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#64748B]">Kembali</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 text-center border border-slate-100 shadow-2xs">
                      <p className="text-[18px] font-bold tabular-nums text-[#9E3636]">
                        {visibleSelectedRoom.maintenance}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#64748B]">Perbaikan</p>
                    </div>
                    <div className="rounded-lg bg-[#1E293B] p-2.5 text-center text-white">
                      <p className="text-[18px] font-bold tabular-nums">
                        {visibleSelectedRoom.equipment}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/70">Total Unit</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[#64748B]">
                      Kesiapan Penggunaan
                    </span>
                    <span className="font-semibold text-[#048444]">
                      {roomOpenPercent}% siap pakai
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-[#EEEEEE]"
                    aria-label={`${visibleSelectedRoom.available} dari ${visibleSelectedRoom.equipment} unit siap digunakan di ${visibleSelectedRoom.name}`}
                  >
                    <div
                      className="h-full rounded-full bg-[#048444] transition-all"
                      style={{ width: `${roomOpenPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <Link
                    href={`/student/laboratory/rooms/${visibleSelectedRoom.id}`}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                  >
                    Lihat Jadwal Ruangan{" "}
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedRoom(null)}
                    className="mt-2 text-center w-full text-[11px] font-semibold text-[#94A3B8] hover:text-[#64748B] transition"
                  >
                    Tutup detail ruangan (tampilkan ikhtisar)
                  </button>
                </div>
              </motion.aside>
            ) : (
              <motion.aside
                key="facility-overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="dashboard-card flex flex-col p-5"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#AE7C1D]">
                      Ikhtisar Fasilitas
                    </span>
                    <h3 className="mt-1 text-[20px] font-bold leading-tight tracking-tight text-[#1E293B]">
                      Laboratorium Kimia
                    </h3>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#FEF1CC] text-[#AE7C1D]">
                    <MapPin className="size-[18px]" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
                  Pilih ruangan pada denah atau daftar di bawah untuk memeriksa ketersediaan instrumen, spesifikasi teknis, serta jadwal pemakaian aktif.
                </p>

                <div className="mt-5 space-y-2">
                  <p className="text-[11px] font-semibold text-[#64748B]">
                    Pilih Ruangan Cepat
                  </p>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoom(room)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 text-left transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/20 focus-visible:outline-2 focus-visible:outline-[#6E8EDA]"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-[12px] font-bold text-[#1E293B]">
                            {room.name}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {room.available} unit siap pakai · {room.equipment} total
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#E5F5ED] px-2 py-0.5 text-[10px] font-semibold text-[#048444]">
                          {room.available > 0 ? "Tersedia" : "Penuh"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <Link
                    href="/student/calendar"
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                  >
                    Buka Kalender Laboratorium{" "}
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                  <p className="mt-2.5 text-center text-[11px] text-[#94A3B8]">
                    {rooms.length} ruang laboratorium terintegrasi
                  </p>
                </div>
              </motion.aside>
            )}
          </section>

          <section
            className="mb-6 grid gap-4 md:grid-cols-3"
            aria-label="Ringkasan sumber daya"
          >
            <div className="dashboard-card flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-[12px] font-semibold text-[#64748B]">
                  Instrumen & Alat Siap Pakai
                </p>
                <p className="mt-2 text-[28px] font-bold tracking-tight tabular-nums text-[#1E293B]">
                  {lab.availableUnits}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E5F5ED] px-2.5 py-1 text-[11px] font-semibold text-[#03683A]">
                  {lab.typeCount} jenis instrumen · {lab.totalUnits} unit total
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#E5F5ED] text-[#048444]">
                <PackageSearch className="size-[18px]" aria-hidden="true" />
              </span>
            </div>
            <div className="dashboard-card flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-[12px] font-semibold text-[#64748B]">
                  Reservasi Terkonfirmasi
                </p>
                <p className="mt-2 text-[28px] font-bold tracking-tight tabular-nums text-[#1E293B]">
                  {approvedEvents.length}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E9EEFC] px-2.5 py-1 text-[11px] font-semibold text-[#38529B]">
                  Tercatat resmi di jadwal laboratorium
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#E9EEFC] text-[#6E8EDA]">
                <CalendarDays className="size-[18px]" aria-hidden="true" />
              </span>
            </div>
            <div className="dashboard-card flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-[12px] font-semibold text-[#64748B]">
                  Menunggu Verifikasi PLP
                </p>
                <p className="mt-2 text-[28px] font-bold tracking-tight tabular-nums text-[#1E293B]">
                  {pendingEvents.length}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D9] px-2.5 py-1 text-[11px] font-semibold text-[#705012]">
                  Dalam proses verifikasi pengurus lab
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF4D9] text-[#AE7C1D]">
                <ClipboardList className="size-[18px]" aria-hidden="true" />
              </span>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <div id="reservations" className="dashboard-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <SectionTitle
                  title={
                    requestView === "upcoming"
                      ? "Reservasi Terdekat"
                      : "Permintaan Saya"
                  }
                  action={
                    <Link
                      href="/student/calendar"
                      className="text-[12px] font-semibold text-[#64748B] hover:text-[#1E293B]"
                    >
                      Buka Kalender Mahasiswa
                    </Link>
                  }
                />
                <div
                  className="flex rounded-xl bg-[#F5F5F5] p-1"
                  role="tablist"
                  aria-label="Tampilan aktivitas mahasiswa"
                >
                  <button
                    className={cn(
                      "min-h-9 rounded-lg px-3 text-[11px] font-semibold transition",
                      requestView === "upcoming"
                        ? "bg-white text-[#212121] shadow-xs"
                        : "text-[#929292] hover:text-[#212121]",
                    )}
                    onClick={() => setRequestView("upcoming")}
                    role="tab"
                    aria-selected={requestView === "upcoming"}
                  >
                    Jadwal Terdekat
                  </button>
                  <button
                    className={cn(
                      "min-h-9 rounded-lg px-3 text-[11px] font-semibold transition",
                      requestView === "requests"
                        ? "bg-white text-[#212121] shadow-xs"
                        : "text-[#929292] hover:text-[#212121]",
                    )}
                    onClick={() => setRequestView("requests")}
                    role="tab"
                    aria-selected={requestView === "requests"}
                  >
                    Semua Pengajuan
                  </button>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {requestView === "upcoming" ? (
                  <motion.div
                    key="upcoming"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-6 divide-y divide-[#EEEEEE]"
                  >
                    {reservationRows.length === 0 ? (
                      <p className="py-6 text-[12px] text-[#64748B]">
                        Belum ada reservasi aktif yang terkonfirmasi. Ajukan permintaan jadwal melalui Kalender Mahasiswa untuk memulai.
                      </p>
                    ) : (
                      reservationRows.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {reservation.mediaId ? (
                              <CatalogImage
                                mediaId={reservation.mediaId}
                                alt={reservation.title}
                                size={40}
                                className="shrink-0 rounded-xl"
                              />
                            ) : (
                              <span
                                className={cn(
                                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                                  toneClasses[
                                    reservation.tone as keyof typeof toneClasses
                                  ].soft,
                                )}
                              >
                                <CalendarDays
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-[#212121]">
                                {reservation.title}
                              </p>
                              <p className="mt-1 truncate text-[11px] text-[#64748B]">
                                {reservation.detail}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <p className="text-[11px] font-medium text-[#64748B]">
                              {reservation.time}
                            </p>
                            <StatusBadge
                              tone={
                                reservation.tone as keyof typeof toneClasses
                              }
                            >
                              Terkonfirmasi
                            </StatusBadge>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="requests"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-6 divide-y divide-[#EEEEEE]"
                  >
                    {requestRows.length === 0 ? (
                      <p className="py-6 text-[12px] text-[#64748B]">
                        Belum ada permintaan di Kalender Mahasiswa. Buka kalender untuk memilih tanggal dan mengajukan perizinan.
                      </p>
                    ) : (
                      requestRows.map((request) => (
                        <div
                          key={request.key}
                          className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {request.mediaId && (
                              <CatalogImage
                                mediaId={request.mediaId}
                                alt={request.title}
                                size={36}
                                className="shrink-0 rounded-lg"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#212121]">
                                {request.title}
                              </p>
                              <p className="mt-1 text-[11px] text-[#64748B]">
                                {request.id} · {request.detail}
                              </p>
                            </div>
                          </div>
                          <StatusBadge
                            tone={request.tone as keyof typeof toneClasses}
                          >
                            {request.status}
                          </StatusBadge>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div id="research" className="dashboard-card p-5 sm:p-6">
              <SectionTitle
                title="Aktivitas Penelitian & Riset"
                action={
                  <Link
                    href="/student/calendar"
                    className="text-[12px] font-semibold text-[#64748B] hover:text-[#212121]"
                  >
                    Buka Kalender
                  </Link>
                }
              />
              <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#FEF7E6] text-[#8D6500]">
                    <GraduationCap className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#048444]">
                    Aktif
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-[#1E293B] tracking-tight">
                  {myEvents[0]?.title ?? "Aktivitas Penelitian & Praktikum"}
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                  {myEvents[0]?.supervisor
                    ? `Penelitian · Pembimbing: ${myEvents[0].supervisor}`
                    : (myEvents[0]?.purpose ?? "Penelitian laboratorium aktif")}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-[11px]">
                  <span className="text-[#64748B]">
                    {myEvents.length} pengajuan terdaftar
                  </span>
                  <span className="font-semibold text-[#1E293B]">
                    {(() => {
                      const evt = myEvents.find((e) => e.status === "ACTIVE" || e.status === "APPROVED") ?? myEvents[0];
                      if (!evt?.startAt) return "Oktober 2026";
                      try {
                        const s = new Date(evt.startAt);
                        const e = new Date(evt.endAt);
                        const sStr = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short" }).format(s);
                        const eStr = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }).format(e);
                        return `${sStr} – ${eStr}`;
                      } catch {
                        return "Oktober 2026";
                      }
                    })()}
                  </span>
                </div>
              </div>
              <Link
                href="/student/calendar"
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#1E293B] transition hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Lihat Kalender Saya{" "}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div id="requests" className="dashboard-card p-5 sm:p-6">
              <SectionTitle
                title="Alur Pengajuan Reservasi"
                action={
                  <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">
                    Panduan
                  </span>
                }
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[14px] font-bold text-[#1E293B]">
                    Pilih jadwal, tentukan instrumen, lalu kirim pengajuan.
                  </p>
                  <p className="mt-1 max-w-[480px] text-[12px] leading-5 text-[#64748B]">
                    Pengajuan akan masuk ke antrean PLP untuk diverifikasi sebelum jadwal resmi ruangan diterbitkan.
                  </p>
                </div>
                <Link
                  href="/student/calendar"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  Buka Kalender{" "}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-[#64748B]">
                <span className="rounded-lg bg-[#F8FAFC] border border-slate-200/60 px-3 py-2">
                  1. Pilih Tanggal
                </span>
                <span className="text-[#94A3B8] self-center" aria-hidden="true">
                  →
                </span>
                <span className="rounded-lg bg-[#F8FAFC] border border-slate-200/60 px-3 py-2">
                  2. Pilih Instrumen & Bahan
                </span>
                <span className="text-[#94A3B8] self-center" aria-hidden="true">
                  →
                </span>
                <span className="rounded-lg bg-[#F8FAFC] border border-slate-200/60 px-3 py-2">
                  3. Verifikasi PLP
                </span>
              </div>
            </div>
            <div id="incidents" className="dashboard-card p-5 sm:p-6">
              <SectionTitle
                title="Laporan Kendala Laboratorium"
                action={
                  <Link
                    href="/student/incidents"
                    className="text-[11px] font-bold text-[#9E3636] hover:underline"
                  >
                    Lihat Semua
                  </Link>
                }
              />
              {latestIncident ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#F5D0D0] bg-[#FFF7F7] p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FDE9E9] text-[#F45959]">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1E293B]">
                      {latestIncident.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                      {latestIncident.roomName ?? latestIncident.equipmentCode} ·{" "}
                      {latestIncident.status.replaceAll("_", " ").toLowerCase()}
                    </p>
                    <Link
                      href="/student/incidents"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#9E3636] hover:underline"
                    >
                      Lihat Rincian Kendala{" "}
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#FAFAF8] p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E5F5ED] text-[#048444]">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1E293B]">
                      Tidak ada laporan kendala aktif
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#64748B]">
                      Laporkan segera jika menemukan kerusakan alat atau tumpahan bahan untuk menjaga keselamatan lab bersama.
                    </p>
                    <Link
                      href="/student/incidents/new"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#9E3636] hover:underline"
                    >
                      Lapor Kendala Baru{" "}
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div id="notifications" className="sr-only" aria-live="polite">
            Notifications are available from the header.
          </div>
    </div>
  );
}
