"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Filter,
  Menu,
  PackageSearch,
  Search,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { cn } from "cn";
import {
  ScheduleCalendar,
  ScheduleEventPopover,
} from "@/components/schedule-calendar";
import { EquipmentGlyph } from "@/components/equipment-glyph";
import { CalendarRefresh } from "@/components/calendar-refresh";
import { formatRangeLabel } from "@/components/schedule-data";
import type {
  IncidentView,
  LabCatalog,
  NotificationView,
  ScheduleEvent,
} from "@/components/schedule-data";
import { apiRequest } from "@/components/student-api";
import {
  SectionTitle,
  Sidebar,
  StatusBadge,
  toneClasses,
} from "@/components/reaksan-dashboard";
import type { BadgeTone } from "@/components/status-badge";

export type ReaksanPage =
  | "calendar"
  | "incidents"
  | "notifications"
  | "equipment"
  | "materials";

const pageCopy: Record<
  ReaksanPage,
  { eyebrow: string; title: string; description: string }
> = {
  calendar: {
    eyebrow: "Ruang Kerja",
    title: "Kalender Saya",
    description: "Pantau pengajuan dan jadwal reservasi laboratorium dalam satu tempat.",
  },
  incidents: {
    eyebrow: "Bantuan & Layanan",
    title: "Laporan Kendala",
    description: "Laporkan kendala fasilitas atau kerusakan alat agar lab tetap aman dan siap pakai.",
  },
  notifications: {
    eyebrow: "Bantuan & Layanan",
    title: "Notifikasi",
    description:
      "Pembaruan status pengajuan, reservasi, dan koordinasi laboratorium.",
  },
  equipment: {
    eyebrow: "Inventaris",
    title: "Instrumen & Alat",
    description: "Ketersediaan instrumen serta lokasi laboratorium tempat alat berada.",
  },
  materials: {
    eyebrow: "Inventaris",
    title: "Bahan Kimia",
    description: "Cek ketersediaan stok bahan kimia sebelum mengajukan permohonan.",
  },
};

const incidentStatusTone: Record<
  IncidentView["status"],
  "rose" | "yellow" | "green" | "blue"
> = {
  REPORTED: "rose",
  UNDER_ASSESSMENT: "yellow",
  IN_MAINTENANCE: "yellow",
  RESOLVED: "green",
};

const incidentStatusLabel: Record<IncidentView["status"], string> = {
  REPORTED: "Dilaporkan",
  UNDER_ASSESSMENT: "Pemeriksaan",
  IN_MAINTENANCE: "Dalam Perbaikan",
  RESOLVED: "Selesai",
};

function PageHeader({
  copy,
  userName,
  searchTerm,
  onSearch,
  onOpenMenu,
  unreadCount,
}: {
  copy: (typeof pageCopy)[ReaksanPage];
  userName: string;
  searchTerm: string;
  onSearch: (value: string) => void;
  onOpenMenu: () => void;
  unreadCount: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E1E1E1]/90 bg-[#F5F5F5]/95 backdrop-blur-sm">
      <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          className="flex size-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white text-[#6B6B6B] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] lg:hidden"
          onClick={onOpenMenu}
          aria-label="Buka menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#929292] sm:block">
            {copy.eyebrow}
          </p>
          <h1 className="truncate text-[20px] font-bold tracking-[-0.03em] text-[#212121] sm:text-[24px]">
            {copy.title}
          </h1>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <label className="relative block w-[190px] lg:w-[238px]">
            <span className="sr-only">Search</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]"
              aria-hidden="true"
            />
            <input
              value={searchTerm}
              onChange={(event) => onSearch(event.target.value)}
              className="h-10 w-full rounded-xl border border-transparent bg-white pl-9 pr-3 text-[12px] text-[#212121] outline-none placeholder:text-[#929292] focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
              placeholder="Search workspace"
              suppressHydrationWarning
            />
          </label>
          <Link
            href="/student/notifications"
            className="relative flex size-10 items-center justify-center rounded-xl border border-transparent bg-white text-[#6B6B6B] hover:border-[#E1E1E1] hover:text-[#212121]"
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
            className="flex size-10 items-center justify-center rounded-xl border border-transparent bg-white text-[#6B6B6B]"
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
          <span className="sr-only">Cari workspace</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]"
            aria-hidden="true"
          />
          <input
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
            className="h-10 w-full rounded-xl border border-transparent bg-white pl-9 pr-3 text-[12px] outline-none placeholder:text-[#929292] focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
            placeholder="Cari workspace"
            suppressHydrationWarning
          />
        </label>
      </div>
    </header>
  );
}

function MyCalendarPage({
  events,
  month,
}: {
  events: ScheduleEvent[];
  month: { year: number; month: number };
}) {
  return (
    <>
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">
            Jadwal Laboratorium · Status Pengajuan Real-time
          </p>
          <h2 className="mt-1 max-w-[650px] text-[24px] font-extrabold leading-tight tracking-tight text-[#1E293B] sm:text-[30px]">
            Pantau status setiap pengajuan dan reservasi Anda
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Denah Laboratorium
          </Link>
          <Link
            href="/student/shared-usage"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F7B742] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Sesi Bersama
          </Link>
        </div>
      </section>
      <ScheduleCalendar
        events={events}
        eventsMonth={month}
        ariaLabel="Kalender Saya"
        selectable={false}
        emptyLabel="Belum ada pengajuan atau reservasi di bulan ini. Persetujuan dari PLP akan muncul otomatis saat jadwal dikonfirmasi."
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-[#64748B]">
              Pilih blok jadwal untuk melihat status, catatan PLP, atau mengelola pengajuan.
            </p>
            <CalendarRefresh />
          </div>
        }
        renderCard={(context) => {
          if (context.source !== "event") return null;
          const event = context.events.find(
            (item) => item.id === context.eventId,
          );
          if (!event) return null;
          return (
            <ScheduleEventPopover
              key={`${event.id}-${context.selectionId}`}
              event={event}
              rangeLabel={formatRangeLabel(
                { start: event.startDay, end: event.endDay },
                context.month,
              )}
              month={context.month}
            />
          );
        }}
      />
    </>
  );
}

function IncidentsPage({ incidents }: { incidents: IncidentView[] }) {
  const [showResolved, setShowResolved] = useState(false);
  const visible = incidents.filter(
    (incident) => showResolved || incident.status !== "RESOLVED",
  );
  return (
    <>
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">
            Keselamatan & Kendala Fasilitas
          </p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#1E293B] sm:text-[30px]">
            Laporan Kendala Laboratorium
          </h2>
        </div>
        <Link
          href="/student/incidents/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F45959] px-4 text-[12px] font-bold text-white hover:bg-[#E04848] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F45959]"
        >
          Laporkan Kendala <ShieldAlert className="size-4" aria-hidden="true" />
        </Link>
      </section>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] text-[#64748B]">
          {showResolved
            ? "Menampilkan semua kendala (aktif & selesai)"
            : "Menampilkan kendala aktif"}
        </p>
        <button
          onClick={() => setShowResolved((value) => !value)}
          className="min-h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[11px] font-semibold text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition cursor-pointer"
        >
          {showResolved ? "Sembunyikan Selesai" : "Tampilkan Selesai"}
        </button>
      </div>
      {visible.length === 0 ? (
        <div className="dashboard-card border-dashed p-8 text-center">
          <ShieldAlert
            className="mx-auto size-6 text-[#94A3B8]"
            aria-hidden="true"
          />
          <p className="mt-3 text-[13px] font-semibold text-[#1E293B]">
            Tidak ada kendala aktif yang dilaporkan.
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Laporkan kerusakan alat atau kondisi tidak aman melalui tombol Laporkan Kendala di atas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((incident) => (
            <Link
              className="dashboard-card block p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              key={incident.id}
              href={`/student/incidents/${incident.code}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    incident.status === "RESOLVED"
                      ? "bg-[#E5F5ED] text-[#048444]"
                      : "bg-[#FDE9E9] text-[#F45959]",
                  )}
                >
                  <ShieldAlert className="size-5" />
                </span>
                <StatusBadge tone={incidentStatusTone[incident.status]}>
                  {incidentStatusLabel[incident.status]}
                </StatusBadge>
              </div>
              <p className="mt-5 text-[14px] font-bold text-[#1E293B]">{incident.title}</p>
              <p className="mt-1 text-[12px] text-[#64748B]">
                {incident.equipmentName ?? incident.roomName}{" "}
                {incident.roomName && incident.equipmentName
                  ? `· ${incident.roomName}`
                  : ""}{" "}
                · {new Date(incident.createdAt).toLocaleDateString("id-ID")}
              </p>
              {incident.assessment && (
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#64748B]">
                  Catatan PLP: {incident.assessment.assessment}
                </p>
              )}
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">
                {incident.code}
              </p>
            </Link>
          ))}
        </div>
      )}
      <div
        id="report-incident"
        className="mt-4 dashboard-card border-dashed p-5 sm:p-6"
      >
        <h3 className="text-[16px] font-bold text-[#1E293B]">Pelaporan Kendala Laboratorium</h3>
        <p className="mt-2 max-w-[600px] text-[12px] leading-5 text-[#64748B]">
          Sertakan ruangan, instrumen terkait, serta kronologi kejadian secara jelas. Koordinator lab (PLP) akan menindaklanjuti untuk tindakan perbaikan atau kalibrasi. Pelaporan mahasiswa tidak otomatis mengubah status operasional instrumen secara sepihak.
        </p>
        <Link
          href="/student/incidents/new"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#1E293B] px-4 text-[12px] font-bold text-white hover:bg-[#0F172A] transition"
        >
          Mulai Laporan Kendala
        </Link>
      </div>
    </>
  );
}

function NotificationsPage({
  notifications,
}: {
  notifications: NotificationView[];
}) {
  const router = useRouter();
  const [read, setRead] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const markRead = async (id: string) => {
    if (read.includes(id)) return;
    setPending(id);
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: "POST" });
      setRead((current) => [...current, id]);
      router.refresh();
    } finally {
      setPending(null);
    }
  };
  const markAll = async () => {
    setPending("all");
    try {
      await apiRequest("/api/notifications/read-all", { method: "POST" });
      setRead(notifications.map((item) => item.id));
      router.refresh();
    } finally {
      setPending(null);
    }
  };
  return (
    <>
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">
            Pemberitahuan & Aktivitas
          </p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#1E293B] sm:text-[30px]">
            Pembaruan Terkini
          </h2>
        </div>
        <button
          onClick={markAll}
          disabled={pending === "all" || notifications.length === 0}
          className="min-h-11 rounded-xl border border-[#E2E8F0] bg-white px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-60 transition cursor-pointer"
        >
          {pending === "all" ? "Memproses..." : "Tandai Semua Dibaca"}
        </button>
      </section>
      {notifications.length === 0 ? (
        <div className="dashboard-card border-dashed p-8 text-center">
          <Bell className="mx-auto size-6 text-[#94A3B8]" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-semibold text-[#1E293B]">
            Belum ada notifikasi.
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Pembaruan pengajuan jadwal, persetujuan sesi bersama, dan laporan kendala akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="dashboard-card divide-y divide-[#EEEEEE]">
          {notifications.map((item) => {
            const isRead = Boolean(item.readAt) || read.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => void markRead(item.id)}
                disabled={pending === item.id}
                className={cn(
                  "flex min-h-[94px] w-full items-start gap-3 p-5 text-left transition hover:bg-[#FAFAF8] sm:p-6 cursor-pointer",
                  !isRead && "bg-[#FFFCF3]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                    item.type.includes("REJECT")
                      ? toneClasses.rose.soft
                      : item.type.includes("INCIDENT")
                        ? toneClasses.rose.soft
                        : toneClasses.green.soft,
                  )}
                >
                  <Bell className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[13px] text-[#1E293B]">{item.title}</strong>
                  <span className="mt-1 block text-[12px] leading-5 text-[#64748B]">
                    {item.message}
                  </span>
                  <span className="mt-2 block text-[10px] font-semibold text-[#94A3B8]">
                    {new Date(item.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                {!isRead && (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-[#F45959]"
                    aria-label="Belum dibaca"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function ResourceThumb({
  isEquipment,
  name,
  status,
  mediaId,
}: {
  isEquipment: boolean;
  name: string;
  status: string;
  mediaId?: string | null;
}) {
  return (
    <div
      role="img"
      aria-label={`Pratinjau visual ${name}`}
      className={cn(
        "relative flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white/70",
        isEquipment
          ? "bg-[radial-gradient(circle_at_35%_25%,#FFFFFF_0,#D9E2F8_36%,#B5C5ED_100%)] text-[#38529B]"
          : "bg-[radial-gradient(circle_at_35%_25%,#FFFFFF_0,#FDE9C8_38%,#F9D39A_100%)] text-[#A45C1B]",
      )}
    >
      {mediaId ? (
        <img
          src={`/api/media/${mediaId}`}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-x-6 bottom-4 h-3 rounded-full bg-black/10 blur-sm" />
          <div className="relative flex size-20 items-center justify-center rounded-[28%] bg-white/70 shadow-[0_14px_24px_rgba(33,33,33,0.12)]">
            {isEquipment ? (
              <EquipmentGlyph name={name} className="size-9" strokeWidth={1.6} />
            ) : (
              <PackageSearch
                className="size-9"
                strokeWidth={1.6}
                aria-hidden="true"
              />
            )}
          </div>
        </>
      )}
      <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
        {status}
      </span>
    </div>
  );
}

function InventoryPage({
  kind,
  searchTerm,
  catalog,
  initialRoom,
}: {
  kind: "equipment" | "materials";
  searchTerm: string;
  catalog: LabCatalog;
  initialRoom?: string;
}) {
  const isEquipment = kind === "equipment";
  const [roomFilter, setRoomFilter] = useState(initialRoom ?? "all");
  const [classificationFilter, setClassificationFilter] = useState<"ALL" | "INSTRUMENT" | "TOOL">("ALL");
  const rooms = catalog.rooms;
  const items: Array<{
    code: string;
    name: string;
    classification?: "INSTRUMENT" | "TOOL";
    roomId: string;
    room: string;
    detail: string;
    stock: string;
    status: string;
    tone: BadgeTone;
    meta: string;
    mediaId?: string | null;
  }> = isEquipment
    ? catalog.equipment.map((asset) => ({
        code: asset.id,
        name: asset.name,
        classification: asset.classification,
        roomId: asset.roomId,
        room: asset.room,
        detail: asset.usage,
        stock: `${asset.availableUnits}/${asset.totalUnits} unit siap`,
        status: asset.status === "Available" ? "Tersedia" : asset.status === "Maintenance" ? "Perbaikan" : asset.status,
        tone: asset.tone,
        meta: asset.meta,
        mediaId: asset.imageMediaId,
      }))
    : catalog.materials.map((material) => ({
        code: material.id,
        name: material.name,
        classification: undefined,
        roomId: material.roomId,
        room: material.room,
        detail: material.category,
        stock: `${material.available} ${material.unit} tersedia`,
        status:
          material.available <= 0
            ? "Stok Habis"
            : material.tone === "yellow"
              ? "Stok Menipis"
              : "Tersedia",
        tone: material.tone,
        meta: material.rule,
        mediaId: material.imageMediaId,
      }));
  const filtered = items.filter(
    (item) =>
      (roomFilter === "all" || item.roomId === roomFilter) &&
      (!isEquipment || classificationFilter === "ALL" || item.classification === classificationFilter) &&
      `${item.name} ${item.code} ${item.room} ${item.detail}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );
  return (
    <>
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">
            Inventaris Laboratorium Kimia
          </p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#1E293B] sm:text-[30px]">
            {isEquipment
              ? "Katalog Instrumen & Alat Praktikum"
              : "Katalog Bahan Kimia & Reagen"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <span className="sr-only">Filter ruangan</span>
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]"
              aria-hidden="true"
            />
            <select
              value={roomFilter}
              onChange={(event) => setRoomFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-[12px] font-semibold text-[#1E293B] outline-none focus:border-[#F9B129]"
            >
              <option value="all">Semua Ruangan</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/student/calendar"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F7B742] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Ajukan Jadwal{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <div className="dashboard-card p-4 sm:p-6">
        {isEquipment && (
          <div className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-[#EEEEEE] pb-3">
            <button
              type="button"
              onClick={() => setClassificationFilter("ALL")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[12px] font-bold transition cursor-pointer",
                classificationFilter === "ALL"
                  ? "bg-[#1E293B] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]",
              )}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setClassificationFilter("INSTRUMENT")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[12px] font-bold transition cursor-pointer",
                classificationFilter === "INSTRUMENT"
                  ? "bg-[#F9B129] text-[#1E293B]"
                  : "bg-[#FEF1CC] text-[#AE7C1D] hover:bg-[#F9B129]/30",
              )}
            >
              Instrumen Laboratorium
            </button>
            <button
              type="button"
              onClick={() => setClassificationFilter("TOOL")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[12px] font-bold transition cursor-pointer",
                classificationFilter === "TOOL"
                  ? "bg-[#1E293B] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]",
              )}
            >
              Alat Praktikum & Glassware
            </button>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <PackageSearch
              className="mx-auto size-6 text-[#94A3B8]"
              aria-hidden="true"
            />
            <p className="mt-3 text-[13px] font-semibold text-[#1E293B]">Tidak ada data yang sesuai</p>
            <p className="mt-1 text-[11px] text-[#64748B]">
              Coba kata kunci pencarian lain atau pilih filter ruangan yang berbeda.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <Link
                href={
                  isEquipment
                    ? `/student/laboratory/equipment/${item.code}`
                    : `/student/laboratory/materials/${item.code}?room=${item.roomId}`
                }
                className="group rounded-2xl border border-[#EEEEEE] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#F9B129]/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
                key={`${item.code}:${item.roomId}`}
              >
                <ResourceThumb
                  isEquipment={isEquipment}
                  name={item.name}
                  status={item.status}
                  mediaId={item.mediaId}
                />
                <div className="px-1 pb-1 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <span>
                      <strong className="block text-[14px] text-[#1E293B]">
                        {item.name}
                      </strong>
                      <div className="mt-1 flex items-center gap-1.5">
                        <small className="block text-[11px] text-[#94A3B8]">
                          {item.code}
                        </small>
                        {isEquipment && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider",
                              item.classification === "INSTRUMENT"
                                ? "bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/30"
                                : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]",
                            )}
                          >
                            {item.classification === "INSTRUMENT"
                              ? "Instrumen"
                              : "Alat"}
                          </span>
                        )}
                      </div>
                    </span>
                    <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                  </div>
                  <p className="mt-4 text-[11px] text-[#64748B]">{item.room}</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#1E293B]">
                    {item.stock}
                  </p>
                  <span className="mt-4 inline-flex min-h-10 items-center text-[11px] font-bold text-[#38529B] group-hover:text-[#283C72]">
                    Lihat Ketersediaan <ChevronRight className="ml-1 size-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ReaksanSubpage({
  page,
  userName,
  catalog,
  events = [],
  incidents = [],
  notifications = [],
  unreadCount = 0,
  month,
  initialRoom,
}: {
  page: ReaksanPage;
  userName: string;
  catalog?: LabCatalog;
  events?: ScheduleEvent[];
  incidents?: IncidentView[];
  notifications?: NotificationView[];
  unreadCount?: number;
  month: { year: number; month: number };
  initialRoom?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const content =
    page === "calendar" ? (
      <MyCalendarPage events={events} month={month} />
    ) : page === "incidents" ? (
      <IncidentsPage incidents={incidents} />
    ) : page === "notifications" ? (
      <NotificationsPage notifications={notifications} />
    ) : catalog ? (
      <InventoryPage
        kind={page}
        searchTerm={searchTerm}
        catalog={catalog}
        initialRoom={initialRoom}
      />
    ) : null;

  return (
    <div id="top" className="space-y-6">
      {content}
    </div>
  );
}
