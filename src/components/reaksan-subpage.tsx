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
    eyebrow: "Workspace",
    title: "My calendar",
    description: "See your requests and reservations in one place.",
  },
  incidents: {
    eyebrow: "Support",
    title: "Incidents",
    description: "Report issues early so the lab stays safe and ready.",
  },
  notifications: {
    eyebrow: "Support",
    title: "Notifications",
    description:
      "Important updates from your requests, reservations, and lab team.",
  },
  equipment: {
    eyebrow: "Inventory",
    title: "Equipment",
    description: "Browse equipment availability and operating locations.",
  },
  materials: {
    eyebrow: "Inventory",
    title: "Materials",
    description: "Check monitored stock before adding materials to a request.",
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
  REPORTED: "Reported",
  UNDER_ASSESSMENT: "Under assessment",
  IN_MAINTENANCE: "In maintenance",
  RESOLVED: "Resolved",
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
          <p className="text-[13px] font-medium text-[#6B6B6B]">
            Your lab schedule · request status real-time
          </p>
          <h2 className="mt-1 max-w-[650px] text-[26px] font-bold leading-tight tracking-[-0.04em] text-[#212121] sm:text-[32px]">
            Follow the status of every request you sent.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Open lab map
          </Link>
          <Link
            href="/student/shared-usage"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Shared usage
          </Link>
        </div>
      </section>
      <ScheduleCalendar
        events={events}
        eventsMonth={month}
        ariaLabel="My calendar"
        selectable={false}
        emptyLabel="Belum ada request atau reservation di bulan ini. Approval PLP muncul otomatis saat halaman aktif kembali."
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[#6B6B6B]">
              Pilih block untuk melihat status, alasan revisi, dan aksi edit,
              resubmit, atau cancel.
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
          <p className="text-[13px] font-medium text-[#6B6B6B]">
            Safety & support
          </p>
          <h2 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-[#212121] sm:text-[32px]">
            Keep every issue visible and actionable.
          </h2>
        </div>
        <Link
          href="/student/incidents/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F45959] px-4 text-[12px] font-bold text-white"
        >
          Report incident <ShieldAlert className="size-4" aria-hidden="true" />
        </Link>
      </section>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] text-[#6B6B6B]">
          {showResolved
            ? "Showing open and resolved incidents"
            : "Showing open incidents"}
        </p>
        <button
          onClick={() => setShowResolved((value) => !value)}
          className="min-h-10 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-semibold text-[#6B6B6B]"
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>
      {visible.length === 0 ? (
        <div className="dashboard-card border-dashed p-8 text-center">
          <ShieldAlert
            className="mx-auto size-6 text-[#929292]"
            aria-hidden="true"
          />
          <p className="mt-3 text-[13px] font-semibold">
            Tidak ada incident yang perlu ditindaklanjuti.
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B]">
            Laporkan kerusakan atau kejadian tidak aman lewat tombol Report
            incident.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((incident) => (
            <Link
              className="dashboard-card block p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(33,33,33,0.08)] sm:p-6"
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
              <p className="mt-5 text-[14px] font-bold">{incident.title}</p>
              <p className="mt-1 text-[12px] text-[#6B6B6B]">
                {incident.equipmentName ?? incident.roomName}{" "}
                {incident.roomName && incident.equipmentName
                  ? `· ${incident.roomName}`
                  : ""}{" "}
                · {new Date(incident.createdAt).toLocaleDateString("id-ID")}
              </p>
              {incident.assessment && (
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#6B6B6B]">
                  Assessment: {incident.assessment.assessment}
                </p>
              )}
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#929292]">
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
        <SectionTitle eyebrow="Need help?" title="Report an incident" />
        <p className="mt-2 max-w-[600px] text-[12px] leading-5 text-[#6B6B6B]">
          Include the room, equipment, and what happened. The lab coordinator
          will follow up with the next safe action. Reporting tidak otomatis
          mengubah status equipment.
        </p>
        <Link
          href="/student/incidents/new"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#212121] px-4 text-[12px] font-bold text-white"
        >
          Start report
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
          <p className="text-[13px] font-medium text-[#6B6B6B]">
            Stay in the loop
          </p>
          <h2 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-[#212121] sm:text-[32px]">
            Updates that deserve your attention.
          </h2>
        </div>
        <button
          onClick={markAll}
          disabled={pending === "all" || notifications.length === 0}
          className="min-h-11 rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] disabled:opacity-60"
        >
          {pending === "all" ? "Memproses..." : "Mark all as read"}
        </button>
      </section>
      {notifications.length === 0 ? (
        <div className="dashboard-card border-dashed p-8 text-center">
          <Bell className="mx-auto size-6 text-[#929292]" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-semibold">
            Belum ada notifikasi.
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B]">
            Update request, shared usage, dan incident akan muncul di sini.
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
                  "flex min-h-[94px] w-full items-start gap-3 p-5 text-left transition hover:bg-[#FAFAF8] sm:p-6",
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
                  <strong className="block text-[13px]">{item.title}</strong>
                  <span className="mt-1 block text-[12px] leading-5 text-[#6B6B6B]">
                    {item.message}
                  </span>
                  <span className="mt-2 block text-[10px] font-semibold text-[#929292]">
                    {new Date(item.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                {!isRead && (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-[#F45959]"
                    aria-label="Unread"
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
      aria-label={`${name} visual preview`}
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
      <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#6B6B6B]">
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
  const rooms = catalog.rooms;
  const items = isEquipment
    ? catalog.equipment.map((asset) => ({
        code: asset.id,
        name: asset.name,
        roomId: asset.roomId,
        room: asset.room,
        detail: asset.usage,
        stock: `${asset.availableUnits}/${asset.totalUnits} units free`,
        status: asset.status,
        tone: asset.tone,
        meta: asset.meta,
        mediaId: asset.imageMediaId,
      }))
    : catalog.materials.map((material) => ({
        code: material.id,
        name: material.name,
        roomId: material.roomId,
        room: material.room,
        detail: material.category,
        stock: `${material.available} ${material.unit} ready`,
        status:
          material.available <= 0
            ? "Out of stock"
            : material.tone === "yellow"
              ? "Low stock"
              : "Available",
        tone: material.tone,
        meta: material.rule,
        mediaId: material.imageMediaId,
      }));
  const filtered = items.filter(
    (item) =>
      (roomFilter === "all" || item.roomId === roomFilter) &&
      `${item.name} ${item.code} ${item.room} ${item.detail}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );
  return (
    <>
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-[#6B6B6B]">
            Laboratory inventory
          </p>
          <h2 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-[#212121] sm:text-[32px]">
            {isEquipment
              ? "Equipment ready for your next run."
              : "Materials with stock you can trust."}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <span className="sr-only">Filter room</span>
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]"
              aria-hidden="true"
            />
            <select
              value={roomFilter}
              onChange={(event) => setRoomFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#E1E1E1] bg-white pl-9 pr-3 text-[12px] font-semibold text-[#212121] outline-none focus:border-[#6E8EDA]"
            >
              <option value="all">All rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/student/calendar"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Send a request{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <div className="dashboard-card p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <PackageSearch
              className="mx-auto size-6 text-[#929292]"
              aria-hidden="true"
            />
            <p className="mt-3 text-[13px] font-semibold">No inventory match</p>
            <p className="mt-1 text-[11px] text-[#6B6B6B]">
              Coba kata kunci lain atau pilih room berbeda.
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
                className="group rounded-2xl border border-[#EEEEEE] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#D6C6A6] hover:shadow-[0_12px_28px_rgba(33,33,33,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
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
                      <strong className="block text-[14px] text-[#212121]">
                        {item.name}
                      </strong>
                      <small className="mt-1 block text-[11px] text-[#929292]">
                        {item.code}
                      </small>
                    </span>
                    <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                  </div>
                  <p className="mt-4 text-[11px] text-[#6B6B6B]">{item.room}</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#212121]">
                    {item.stock}
                  </p>
                  <span className="mt-4 inline-flex min-h-10 items-center text-[11px] font-bold text-[#38529B]">
                    View availability <ChevronRight className="ml-1 size-3.5" />
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
  catalog: LabCatalog;
  events?: ScheduleEvent[];
  incidents?: IncidentView[];
  notifications?: NotificationView[];
  unreadCount?: number;
  month: { year: number; month: number };
  initialRoom?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const copy = pageCopy[page];
  const content =
    page === "calendar" ? (
      <MyCalendarPage events={events} month={month} />
    ) : page === "incidents" ? (
      <IncidentsPage incidents={incidents} />
    ) : page === "notifications" ? (
      <NotificationsPage notifications={notifications} />
    ) : (
      <InventoryPage
        kind={page}
        searchTerm={searchTerm}
        catalog={catalog}
        initialRoom={initialRoom}
      />
    );

  return (
    <div className="dashboard-shell min-h-screen">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((value) => !value)}
        onClose={() => setMobileOpen(false)}
        userName={userName}
        activeKey={page}
      />
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200 lg:pl-[256px]",
          collapsed && "lg:pl-[80px]",
        )}
      >
        <PageHeader
          copy={copy}
          userName={userName}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          onOpenMenu={() => setMobileOpen(true)}
          unreadCount={unreadCount}
        />
        <main
          id="top"
          className="mx-auto max-w-[1680px] px-4 pb-10 pt-6 sm:px-6 lg:px-8"
        >
          {content}
        </main>
      </div>
    </div>
  );
}
