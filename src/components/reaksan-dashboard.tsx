"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  ListFilter,
  MapPin,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
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
    label: "Inventory",
    items: [
      {
        label: "Equipment",
        icon: PackageSearch,
        key: "equipment",
        href: "/student/equipment",
      },
      {
        label: "Materials",
        icon: FlaskConical,
        key: "materials",
        href: "/student/materials",
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
  eyebrow,
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
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#929292]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#212121]">
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
  selectedRoom: RoomView;
  onSelectRoom: (room: RoomView) => void;
  searchTerm: string;
}) {
  const [rotation, setRotation] = useState({ yaw: -8, pitch: 18 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    yaw: number;
    pitch: number;
  } | null>(null);
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: rotation.yaw,
      pitch: rotation.pitch,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setRotation({
      yaw: drag.yaw + (event.clientX - drag.x) * 0.45,
      pitch: Math.max(
        -80,
        Math.min(80, drag.pitch - (event.clientY - drag.y) * 0.28),
      ),
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
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
              {rooms.length} lab · ringkasan langsung
            </p>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            className="flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 text-[11px] font-semibold text-[#6B6B6B] shadow-sm transition hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            aria-label="Filter lab map"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button
            className="flex size-10 items-center justify-center rounded-xl border border-white/80 bg-white/95 text-[#6B6B6B] shadow-sm transition hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            aria-label="Reset 3D map view"
            onClick={() => setRotation({ yaw: -8, pitch: 18 })}
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
            aria-label="Rotate map left"
          >
            ←
          </button>
          <button
            className="flex size-9 items-center justify-center rounded-lg text-[16px] text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            onClick={() => updateRotation(18, 0)}
            aria-label="Rotate map right"
          >
            →
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 rounded-xl border border-white/80 bg-white/95 p-2 shadow-sm">
          <StatusBadge tone="green">Available</StatusBadge>
          <StatusBadge tone="blue">Reserved</StatusBadge>
          <StatusBadge tone="yellow">In use</StatusBadge>
        </div>

        <div
          className={cn(
            "lab-floor absolute inset-[7%] cursor-grab select-none active:cursor-grabbing",
            isDragging && "cursor-grabbing",
          )}
          role="group"
          aria-label="Interactive 3D laboratory map. Hold and drag to rotate the map."
          style={{
            transform: `perspective(1200px) rotateX(${rotation.pitch}deg) rotateY(${rotation.yaw}deg)`,
            transformStyle: "preserve-3d",
            transition: isDragging ? "none" : "transform 160ms ease-out",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="absolute inset-[5%] rounded-[6%] border-[10px] border-[#E8E4DB] bg-[#D9D1C1] shadow-2xl shadow-[#6B5A3A]/20" />
          <div className="absolute inset-[8%] rounded-[4%] border border-[#B8AE9D] bg-[#D8D0C2]" />
          {visibleRooms.map((room) => {
            const isSelected = selectedRoom.id === room.id;
            return (
              <button
                key={room.id}
                className={cn(
                  "lab-room absolute z-10 flex flex-col justify-between rounded-md border-2 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#212121]",
                  room.tone === "yellow" && "border-[#D3A02D] bg-[#F8E3A9]",
                  room.tone === "blue" && "border-[#91A9E6] bg-[#C9D6F5]",
                  room.tone === "green" && "border-[#8FC9A5] bg-[#C8E7D1]",
                  room.tone === "cream" && "border-[#BAB6AC] bg-[#F0EEE8]",
                  room.tone === "rose" && "border-[#D7A0A0] bg-[#F7D7D7]",
                  isSelected && "ring-4 ring-[#F9B129]/70 ring-offset-2",
                )}
                style={room.position}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={() => onSelectRoom(room)}
                aria-label={`Pilih ${room.name}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="max-w-[75%] text-[10px] font-bold uppercase tracking-[0.09em] text-[#4F4B43] sm:text-[11px]">
                    {room.shortName}
                  </span>
                  <span
                    className="size-2 rounded-full bg-[#048444] ring-2 ring-white/70"
                    aria-label="available"
                  />
                </div>
                <div className="space-y-1 text-[10px] font-medium text-[#5D5B53]">
                  <div className="h-2 w-2/3 rounded-full bg-white/50" />
                  <div className="h-2 w-1/2 rounded-full bg-white/50" />
                  <div className="flex items-center gap-1 pt-1">
                    <PackageSearch className="size-3" aria-hidden="true" />
                    {room.available} free
                  </div>
                </div>
              </button>
            );
          })}
          <div className="absolute left-[34%] top-[46%] flex h-[10%] w-[38%] items-center justify-center rounded-sm border border-[#C6B99F] bg-[#EFE9DC] text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A7B61] shadow-sm">
            Main circulation
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
                Room tidak ditemukan
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
  unreadCount,
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [requestView, setRequestView] = useState<"upcoming" | "requests">(
    "upcoming",
  );
  const currentRoom =
    selectedRoom && rooms.some((room) => room.id === selectedRoom.id)
      ? selectedRoom
      : (rooms[1] ?? rooms[0] ?? null);
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
        ? `${event.equipment.length} equipment`
        : "no equipment"
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
        event.equipment?.length ? `${event.equipment.length} equipment` : null,
        event.materials?.length ? `${event.materials.length} materials` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "No resources yet",
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
  const emptyRoom: RoomView = {
    id: "",
    name: "Belum ada room",
    shortName: "No room",
    description:
      "Katalog laboratorium belum tersedia. Jalankan npm run db:seed lalu muat ulang halaman.",
    tone: "cream",
    position: {},
    equipment: 0,
    available: 0,
    reserved: 0,
    inUse: 0,
    awaitingReturn: 0,
    maintenance: 0,
    typeCount: 0,
  };
  const visibleSelectedRoom =
    (searchTerm.trim() && currentRoom && !selectedRoomMatchesSearch
      ? (searchMatches[0] ?? currentRoom)
      : currentRoom) ?? emptyRoom;
  const selectedTone = toneClasses[visibleSelectedRoom.tone];
  const roomOpenPercent =
    visibleSelectedRoom.equipment > 0
      ? Math.round(
          (visibleSelectedRoom.available / visibleSelectedRoom.equipment) * 100,
        )
      : 0;

  const roomMaintenanceUnits = useMemo(() => {
    if (!visibleSelectedRoom || !visibleSelectedRoom.id) return [];
    const roomEquip = catalog.equipment.filter(
      (e) => e.roomId === visibleSelectedRoom.id,
    );
    return roomEquip.flatMap((eq) =>
      eq.units
        .filter((u) => u.status === "Maintenance")
        .map((u) => ({
          unitId: u.id,
          unitLabel: u.label,
          assetName: eq.name,
          condition: u.condition ?? "Perlu perbaikan",
          notes: u.notes,
        })),
    );
  }, [catalog.equipment, visibleSelectedRoom]);

  return (
    <div className="dashboard-shell min-h-screen">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((value) => !value)}
        onClose={() => setMobileOpen(false)}
        userName={userName}
        activeKey="dashboard"
      />

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200 lg:pl-[256px]",
          collapsed && "lg:pl-[80px]",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-[#E1E1E1]/90 bg-[#F5F5F5]/95 backdrop-blur-sm">
          <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="flex size-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white text-[#6B6B6B] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#929292] sm:block">
                Student workspace
              </p>
              <h1 className="truncate text-[20px] font-bold tracking-[-0.03em] text-[#212121] sm:text-[24px]">
                Dashboard
              </h1>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <label className="relative block w-[190px] lg:w-[238px]">
                <span className="sr-only">Cari resource atau room</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]"
                  aria-hidden="true"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-10 w-full rounded-xl border border-transparent bg-white pl-9 pr-3 text-[12px] text-[#212121] outline-none placeholder:text-[#929292] focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
                  placeholder="Search room or resource"
                />
              </label>
              <button className="flex h-10 items-center gap-2 rounded-xl border border-transparent bg-white px-3 text-[12px] font-semibold text-[#6B6B6B] hover:border-[#E1E1E1] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]">
                <ListFilter className="size-4" aria-hidden="true" />
                Filter
              </button>
              <Link
                href="/student/notifications"
                className="relative flex size-10 items-center justify-center rounded-xl border border-transparent bg-white text-[#6B6B6B] hover:border-[#E1E1E1] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} unread notifications`
                    : "Notifications"
                }
              >
                <Bell className="size-[17px]" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#F45959]" />
                )}
              </Link>
              <button
                className="flex size-10 items-center justify-center rounded-xl border border-transparent bg-white text-[#6B6B6B] hover:border-[#E1E1E1] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                aria-label="Settings"
              >
                <Settings className="size-[17px]" aria-hidden="true" />
              </button>
              <span
                className="flex size-10 items-center justify-center rounded-full bg-[#D9E2F8] text-[12px] font-bold text-[#38529B]"
                aria-label={`Profil ${userName}`}
              >
                {userName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <button
              className="flex size-11 items-center justify-center rounded-xl border border-transparent bg-white text-[#6B6B6B] sm:hidden"
              aria-label="Search"
            >
              <Search className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
          <div className="border-t border-[#E1E1E1]/70 px-4 py-2 sm:hidden">
            <label className="relative block">
              <span className="sr-only">Cari resource atau room</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]"
                aria-hidden="true"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-xl border border-transparent bg-white pl-9 pr-3 text-[12px] text-[#212121] outline-none placeholder:text-[#929292] focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
                placeholder="Cari room atau resource"
              />
            </label>
          </div>
        </header>

        <main
          className="mx-auto max-w-[1680px] px-4 pb-10 pt-6 sm:px-6 lg:px-8"
          id="top"
        >
          <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[13px] font-medium text-[#6B6B6B]">
                Good morning, {firstName}.
              </p>
              <h2 className="mt-1 max-w-[650px] text-[26px] font-bold leading-tight tracking-[-0.04em] text-[#212121] sm:text-[32px]">
                Plan your next lab session with clarity.
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
              <span
                className="flex size-2 rounded-full bg-[#048444]"
                aria-hidden="true"
              />
              <span>Live resource overview</span>
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </div>
          </section>

          <section
            className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"
            aria-labelledby="lab-overview-title"
          >
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#929292]">
                    Visibility first
                  </p>
                  <h2
                    id="lab-overview-title"
                    className="mt-1 text-[18px] font-semibold tracking-[-0.02em]"
                  >
                    Explore the laboratory
                  </h2>
                </div>
                <a
                  className="hidden items-center gap-1 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#212121] sm:flex"
                  href="#map"
                >
                  Open full map{" "}
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#929292]">
                    Selected room
                  </p>
                  <h3 className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.03em]">
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
              <p className="mt-3 text-[13px] leading-5 text-[#6B6B6B]">
                {visibleSelectedRoom.description}
              </p>

              <div className="mt-6 rounded-xl border border-[#E1E1E1] bg-[#F5F5F5] p-3">
                <p className="text-[11px] font-semibold text-[#6B6B6B]">
                  Total equipment ·{" "}
                  <span className="font-bold tabular-nums text-[#212121]">
                    {visibleSelectedRoom.equipment} units
                  </span>{" "}
                  from {visibleSelectedRoom.typeCount} tracked types
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white p-3 text-center">
                    <p className="text-[20px] font-bold tabular-nums text-[#048444]">
                      {visibleSelectedRoom.available}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6B6B6B]">Available</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-center">
                    <p className="text-[20px] font-bold tabular-nums text-[#6E8EDA]">
                      {visibleSelectedRoom.reserved}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6B6B6B]">Reserved</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-center">
                    <p className="text-[20px] font-bold tabular-nums text-[#AE7C1D]">
                      {visibleSelectedRoom.inUse}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6B6B6B]">In use</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-center">
                    <p className="text-[20px] font-bold tabular-nums text-[#9E3636]">
                      {visibleSelectedRoom.awaitingReturn}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6B6B6B]">Return</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-center">
                    <p className="text-[20px] font-bold tabular-nums text-[#9E3636]">
                      {visibleSelectedRoom.maintenance}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6B6B6B]">
                      Maintenance
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#212121] p-3 text-center text-white">
                    <p className="text-[20px] font-bold tabular-nums">
                      {visibleSelectedRoom.equipment}
                    </p>
                    <p className="mt-1 text-[10px] text-white/70">Total units</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-[#6B6B6B]">
                    Available now
                  </span>
                  <span className="font-semibold text-[#048444]">
                    {roomOpenPercent}% open
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-[#EEEEEE]"
                  aria-label={`${visibleSelectedRoom.available} of ${visibleSelectedRoom.equipment} units available in ${visibleSelectedRoom.name}`}
                >
                  <div
                    className="h-full rounded-full bg-[#048444]"
                    style={{ width: `${roomOpenPercent}%` }}
                  />
                </div>
              </div>

              {roomMaintenanceUnits.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#FDE9E9] bg-[#FFF8F8] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-[#9E3636]">
                      {roomMaintenanceUnits.length} unit sedang maintenance
                    </p>
                    <span className="rounded-full bg-[#FDE9E9] px-2 py-0.5 text-[10px] font-semibold text-[#9E3636]">
                      Tidak dapat dipinjam
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {roomMaintenanceUnits.map((u) => (
                      <li
                        key={u.unitId}
                        className="rounded-lg border border-[#F7D0D0] bg-white p-2 text-[11px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#212121]">
                            {u.unitLabel} · {u.assetName}
                          </span>
                          <span className="text-[10px] font-medium text-[#9E3636]">
                            {u.condition.replace(/_/g, " ")}
                          </span>
                        </div>
                        {u.notes && (
                          <p className="mt-0.5 text-[10px] text-[#6B6B6B] italic">
                            &quot;{u.notes}&quot;
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-auto pt-7">
                <Link
                  href={`/student/laboratory/rooms/${visibleSelectedRoom.id}`}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  View room schedule{" "}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-center text-[11px] text-[#929292]">
                  {searchMatches.length} room
                  {searchMatches.length === 1 ? "" : "s"} match your search
                </p>
              </div>
            </motion.aside>
          </section>

          <section
            className="mb-6 grid gap-4 md:grid-cols-3"
            aria-label="Resource summary"
          >
            <div className="dashboard-card flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-[12px] font-medium text-[#6B6B6B]">
                  Available equipment
                </p>
                <p className="mt-2 text-[28px] font-bold tracking-[-0.04em] tabular-nums">
                  {lab.availableUnits}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E5F5ED] px-2.5 py-1 text-[11px] font-semibold text-[#03683A]">
                  {lab.typeCount} equipment types · {lab.totalUnits} units
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#E5F5ED] text-[#048444]">
                <PackageSearch className="size-[18px]" aria-hidden="true" />
              </span>
            </div>
            <div className="dashboard-card flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-[12px] font-medium text-[#6B6B6B]">
                  Approved reservations
                </p>
                <p className="mt-2 text-[28px] font-bold tracking-[-0.04em] tabular-nums">
                  {approvedEvents.length}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E9EEFC] px-2.5 py-1 text-[11px] font-semibold text-[#38529B]">
                  Shown in the room schedule
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#E9EEFC] text-[#6E8EDA]">
                <CalendarDays className="size-[18px]" aria-hidden="true" />
              </span>
            </div>
            <div className="dashboard-card flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-[12px] font-medium text-[#6B6B6B]">
                  Pending actions
                </p>
                <p className="mt-2 text-[28px] font-bold tracking-[-0.04em] tabular-nums">
                  {pendingEvents.length}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D9] px-2.5 py-1 text-[11px] font-semibold text-[#705012]">
                  Waiting for PLP approval
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
                  eyebrow="Stay coordinated"
                  title={
                    requestView === "upcoming"
                      ? "Upcoming reservations"
                      : "My requests"
                  }
                  action={
                    <Link
                      href="/student/calendar"
                      className="text-[12px] font-semibold text-[#6B6B6B] hover:text-[#212121]"
                    >
                      Open My calendar
                    </Link>
                  }
                />
                <div
                  className="flex rounded-xl bg-[#F5F5F5] p-1"
                  role="tablist"
                  aria-label="Dashboard activity view"
                >
                  <button
                    className={cn(
                      "min-h-9 rounded-lg px-3 text-[11px] font-semibold",
                      requestView === "upcoming"
                        ? "bg-white text-[#212121] shadow-sm"
                        : "text-[#929292]",
                    )}
                    onClick={() => setRequestView("upcoming")}
                    role="tab"
                    aria-selected={requestView === "upcoming"}
                  >
                    Upcoming
                  </button>
                  <button
                    className={cn(
                      "min-h-9 rounded-lg px-3 text-[11px] font-semibold",
                      requestView === "requests"
                        ? "bg-white text-[#212121] shadow-sm"
                        : "text-[#929292]",
                    )}
                    onClick={() => setRequestView("requests")}
                    role="tab"
                    aria-selected={requestView === "requests"}
                  >
                    Requests
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
                      <p className="py-6 text-[12px] text-[#6B6B6B]">
                        No approved reservation yet. Send a request from My
                        calendar and it will show up here after PLP approval.
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
                              <p className="mt-1 truncate text-[11px] text-[#6B6B6B]">
                                {reservation.detail}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <p className="text-[11px] font-medium text-[#6B6B6B]">
                              {reservation.time}
                            </p>
                            <StatusBadge
                              tone={
                                reservation.tone as keyof typeof toneClasses
                              }
                            >
                              Confirmed
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
                      <p className="py-6 text-[12px] text-[#6B6B6B]">
                        No request in My calendar yet. Drag across dates there
                        to send one.
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
                              <p className="mt-1 text-[11px] text-[#6B6B6B]">
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
                eyebrow="Research context"
                title="My research activity"
                action={
                  <Link
                    href="/student/calendar"
                    className="text-[12px] font-semibold text-[#6B6B6B] hover:text-[#212121]"
                  >
                    Open My calendar
                  </Link>
                }
              />
              <div className="mt-5 rounded-xl border border-[#E1E1E1] bg-[#F5F5F5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#FEF1CC] text-[#AE7C1D]">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#048444]">
                    Active
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.02em]">
                  Synthesis compound X
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-[#6B6B6B]">
                  Thesis research · supervised by Dr. Budi
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[#E1E1E1] pt-3 text-[11px]">
                  <span className="text-[#6B6B6B]">
                    {myEvents.length} request
                    {myEvents.length === 1 ? "" : "s"} in My calendar
                  </span>
                  <span className="font-semibold text-[#212121]">
                    18–30 Sep 2026
                  </span>
                </div>
              </div>
              <Link
                href="/student/calendar"
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E1E1E1] bg-white text-[12px] font-semibold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Review my requests{" "}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div id="requests" className="dashboard-card p-5 sm:p-6">
              <SectionTitle
                eyebrow="Next step"
                title="Calendar request flow"
                action={
                  <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[10px] font-semibold text-[#6B6B6B]">
                    Preview
                  </span>
                }
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[14px] font-semibold text-[#212121]">
                    Block dates, pick resources, send one request.
                  </p>
                  <p className="mt-1 max-w-[480px] text-[12px] leading-5 text-[#6B6B6B]">
                    Requests wait in My calendar until PLP approves them, then
                    they appear in the room schedule.
                  </p>
                </div>
                <Link
                  href="/student/calendar"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  Open My calendar{" "}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-[#6B6B6B]">
                <span className="rounded-lg bg-[#F5F5F5] px-3 py-2">
                  1. Block dates
                </span>
                <span className="text-[#B7B7B7]" aria-hidden="true">
                  →
                </span>
                <span className="rounded-lg bg-[#F5F5F5] px-3 py-2">
                  2. Resources
                </span>
                <span className="text-[#B7B7B7]" aria-hidden="true">
                  →
                </span>
                <span className="rounded-lg bg-[#F5F5F5] px-3 py-2">
                  3. Send
                </span>
              </div>
            </div>
            <div id="incidents" className="dashboard-card p-5 sm:p-6">
              <SectionTitle
                eyebrow="Keep the lab safe"
                title="My incident reports"
                action={
                  <Link
                    href="/student/incidents"
                    className="text-[11px] font-bold text-[#9E3636] hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              {latestIncident ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#F5D0D0] bg-[#FFF7F7] p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FDE9E9] text-[#F45959]">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#212121]">
                      {latestIncident.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#6B6B6B]">
                      {latestIncident.roomName ?? latestIncident.equipmentCode} ·{" "}
                      {latestIncident.status.replaceAll("_", " ").toLowerCase()}
                    </p>
                    <Link
                      href="/student/incidents"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#9E3636] hover:underline"
                    >
                      View incident detail{" "}
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E1E1E1] bg-[#FAFAF8] p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E5F5ED] text-[#048444]">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#212121]">
                      Tidak ada incident terbuka
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#6B6B6B]">
                      Laporkan masalah peralatan atau room supaya tim lab bisa
                      menindaklanjuti.
                    </p>
                    <Link
                      href="/student/incidents/new"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#9E3636] hover:underline"
                    >
                      Report incident{" "}
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
        </main>
      </div>
    </div>
  );
}
