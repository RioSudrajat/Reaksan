"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Menu,
  PackageSearch,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { cn } from "cn";
import {
  ScheduleCalendar,
  ScheduleEventPopover,
  ScheduleRequestForm,
  type RequestFormDefaults,
  type ScheduleCardContext,
} from "@/components/schedule-calendar";
import { EquipmentGlyph } from "@/components/equipment-glyph";
import { CatalogImage } from "@/components/catalog-image";
import { CalendarRefresh } from "@/components/calendar-refresh";
import { LabCatalogProvider } from "@/components/lab-catalog-context";
import { apiRequest, errorMessage } from "@/components/student-api";
import {
  displayBadgeClasses,
  displayDotClasses,
  eventDisplayState,
  formatRangeLabel,
  requestStatusLabels,
} from "@/components/schedule-data";
import type {
  IncidentView,
  LabCatalog,
  ReservationView,
  ScheduleEvent,
  SharedUsagePageView,
} from "@/components/schedule-data";
import { SectionTitle, Sidebar, StatusBadge } from "@/components/reaksan-dashboard";

const incidentStatusLabel: Record<string, string> = {
  REPORTED: "Dilaporkan",
  INVESTIGATING: "Dalam Pemeriksaan",
  RESOLVED: "Selesai",
};

export type ReaksanFlowKind =
  | "room-detail"
  | "equipment-detail"
  | "material-detail"
  | "shared-usage"
  | "incident-new"
  | "incident-detail";

function FlowHeader({
  title,
  eyebrow,
  userName,
  onOpenMenu,
}: {
  title: string;
  eyebrow: string;
  userName: string;
  onOpenMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E1E1E1]/90 bg-[#F5F5F5]/95 backdrop-blur-sm">
      <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          className="flex size-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white text-[#6B6B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] lg:hidden"
          onClick={onOpenMenu}
          aria-label="Buka menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#929292] sm:block">
            {eyebrow}
          </p>
          <h1 className="truncate text-[20px] font-bold tracking-[-0.03em] text-[#212121] sm:text-[24px]">
            {title}
          </h1>
        </div>
        <Link
          href="/student/notifications"
          className="relative flex size-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white text-[#6B6B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          aria-label="Notifications"
        >
          <span className="text-[17px]" aria-hidden="true">
            •
          </span>
        </Link>
        <span
          className="flex size-10 items-center justify-center rounded-full bg-[#D9E2F8] text-[12px] font-bold text-[#38529B]"
          aria-label={`Profil ${userName}`}
        >
          {userName.slice(0, 1).toUpperCase()}
        </span>
      </div>
    </header>
  );
}

function FlowShell({
  catalog,
  children,
}: {
  title?: string;
  eyebrow?: string;
  userName?: string;
  activeKey?: string;
  catalog: LabCatalog;
  children: React.ReactNode;
}) {
  return (
    <LabCatalogProvider value={catalog}>
      <div className="space-y-6">
        {children}
      </div>
    </LabCatalogProvider>
  );
}

function BackLink({ href = "/student" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl text-[12px] font-bold text-[#64748B] hover:text-[#1E293B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129] transition"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Kembali
    </Link>
  );
}

function StudentDayOverviewCard({
  context,
  defaults,
  onCancel,
}: {
  context: ScheduleCardContext;
  defaults?: RequestFormDefaults;
  onCancel: () => void;
}) {
  const [activeEvent, setActiveEvent] = useState<ScheduleEvent | null>(null);
  const [mode, setMode] = useState<"list" | "add">("list");

  if (activeEvent) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveEvent(null)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#38529B] hover:text-[#283C72] transition cursor-pointer"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Kembali ke daftar jadwal</span>
        </button>
        <ScheduleEventPopover
          key={activeEvent.id}
          event={activeEvent}
          rangeLabel={formatRangeLabel(
            { start: activeEvent.startDay, end: activeEvent.endDay },
            context.month,
          )}
          month={context.month}
        />
      </div>
    );
  }

  if (mode === "add") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setMode("list")}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#38529B] hover:text-[#283C72] transition cursor-pointer"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Kembali ke daftar jadwal</span>
        </button>
        <ScheduleRequestForm
          key={`${context.range.start}-${context.range.end}-${context.selectionId}`}
          range={context.range}
          label={context.label}
          month={context.month}
          defaults={defaults}
          onCancel={onCancel}
        />
      </div>
    );
  }

  const events = context.events;

  return (
    <article className="space-y-3">
      <div className="border-b border-[#EEEEEE] pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#929292]">
            Daftar Request & Jadwal
          </p>
          <span className="rounded-full bg-[#FEF1CC] px-2 py-0.5 text-[10px] font-bold text-[#AE7C1D]">
            {events.length} Terjadwal
          </span>
        </div>
        <h4 className="mt-1 text-[15px] font-bold text-[#212121]">
          {context.label}
        </h4>
        <p className="text-[11px] text-[#6B6B6B]">
          Semua kegiatan dan peminjaman yang berlangsung pada tanggal ini.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl bg-[#FAFAF8] p-4 text-center">
          <p className="text-[12px] font-semibold text-[#212121]">
            Tidak ada kegiatan di tanggal ini
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B]">
            Slot waktu kosong dan siap dipinjam.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {events.map((evt) => {
            const display = eventDisplayState(evt);
            return (
              <div
                key={evt.id}
                className="rounded-xl border border-[#EEEEEE] bg-[#FAFAF8] p-2.5 hover:border-[#D8D8D8] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn("size-2 rounded-full", displayDotClasses[display])}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          displayBadgeClasses[display],
                        )}
                      >
                        {requestStatusLabels[display]}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] font-bold text-[#212121] leading-tight">
                      {evt.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#6B6B6B]">
                      {evt.time} · {evt.actor}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveEvent(evt)}
                    className="shrink-0 rounded-lg bg-white border border-[#E1E1E1] px-2.5 py-1 text-[10px] font-bold text-[#212121] hover:bg-[#F5F5F5] transition cursor-pointer"
                  >
                    Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-[#EEEEEE] pt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setMode("add")}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#F9B129] px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F7B742] transition cursor-pointer"
        >
          + Buat Request di Tanggal Ini
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-semibold text-[#6B6B6B] hover:bg-[#F5F5F5] transition cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </article>
  );
}

export function RoomDetailPage({
  roomId,
  catalog,
  events,
  month,
  userName,
}: {
  roomId: string;
  catalog: LabCatalog;
  events: ScheduleEvent[];
  month: { year: number; month: number };
  userName: string;
}) {
  const room = catalog.rooms.find((item) => item.id === roomId) ?? catalog.rooms[0];
  const roomAssets = catalog.equipment.filter(
    (asset) => asset.roomId === room?.id,
  );
  const roomMaterials = catalog.materials.filter(
    (material) => material.roomId === room?.id,
  );
  const roomMaintenanceUnits = roomAssets.flatMap((asset) =>
    asset.units
      .filter((unit) => unit.status === "Maintenance")
      .map((unit) => ({
        ...unit,
        assetId: asset.id,
        assetName: asset.name,
      })),
  );
  const [expandedAssetId, setExpandedAssetId] = useState<string>("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const selectedAsset =
    roomAssets.find((asset) => asset.id === selectedAssetId) ?? null;
  const filteredEvents = events.filter((event) => {
    if (selectedAssetId) {
      const matchesAsset =
        event.resourceId === selectedAssetId ||
        event.equipment?.some((item) => item.id === selectedAssetId);
      if (!matchesAsset) return false;
    }
    if (selectedUnitId) {
      const matchesUnit =
        event.resourceUnit === selectedUnitId ||
        event.equipment?.some((item) => item.unitId === selectedUnitId);
      if (!matchesUnit) return false;
    }
    return true;
  });

  const chooseAsset = (assetId: string) => {
    setExpandedAssetId((current) => (current === assetId ? "" : assetId));
    setSelectedAssetId((current) => (current === assetId ? null : assetId));
    setSelectedUnitId(null);
  };

  const chooseUnit = (assetId: string, unitId: string) => {
    setExpandedAssetId(assetId);
    setSelectedAssetId(assetId);
    setSelectedUnitId((current) => (current === unitId ? null : unitId));
  };

  if (!room) return null;

  return (
    <FlowShell
      title={room.name}
      eyebrow="Room schedule"
      userName={userName}
      activeKey="dashboard"
      catalog={catalog}
    >
      <BackLink href="/student" />
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">
            Laboratorium Kimia FMIPA Unpad
          </p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#1E293B] sm:text-[30px]">
            {room.name}
          </h2>
          <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-[#64748B]">
            {room.description} Informasi unit instrumen yang tersedia, sedang digunakan, serta agenda kegiatan lab.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="#schedule"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F7B742] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Lihat Jadwal <ChevronRight className="size-4" aria-hidden="true" />
          </a>
          <Link
            href="/student/calendar"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Kalender Saya
          </Link>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          [
            "Total Unit",
            room.equipment,
            "#E9EEFC",
            `${room.typeCount} jenis terdaftar`,
          ],
          ["Tersedia", room.available, "#E5F5ED", "Siap diajukan"],
          ["Direservasi", room.reserved, "#E9EEFC", "Telah disetujui PLP"],
          ["Digunakan", room.inUse, "#FEF1CC", "Sedang berjalan"],
          [
            "Menunggu Kembali",
            room.awaitingReturn,
            "#FDE9E9",
            "Selesai, belum kembali",
          ],
          ["Perbaikan", room.maintenance, "#FDE9E9", "Tidak dapat dipilih"],
        ].map(([label, value, background, hint]) => (
          <div
            className="dashboard-card p-5"
            key={label}
            style={{ backgroundColor: background as string }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#64748B]">
              {label}
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums text-[#1E293B]">
              {value}
            </p>
            <p className="mt-1 text-[10px] text-[#64748B]">{hint}</p>
          </div>
        ))}
      </div>

      {roomMaintenanceUnits.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#FDE9E9] bg-[#FFF8F8] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[#9E3636]">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <h4 className="text-[13px] font-bold">
              {roomMaintenanceUnits.length} unit dalam perbaikan / pemeriksaan teknis
            </h4>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Unit berikut sedang dalam penanganan teknisi atau kalibrasi berkala dan tidak dapat dipilih untuk reservasi sampai diselesaikan oleh PLP.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roomMaintenanceUnits.map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-3 rounded-xl border border-[#F7D0D0] bg-white p-3 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-bold text-[#1E293B]">
                      {u.label}
                    </p>
                    <span className="rounded-md bg-[#FDE9E9] px-1.5 py-0.5 text-[10px] font-semibold text-[#9E3636]">
                      {u.condition ? u.condition.replace(/_/g, " ") : "Perbaikan"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                    {u.assetName}
                  </p>
                  {u.notes && (
                    <p className="mt-1.5 rounded-lg bg-[#FAF9F6] px-2 py-1 text-[10px] text-[#64748B] italic">
                      &quot;{u.notes}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section id="schedule" className="mt-4 dashboard-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Agenda Ruangan
            </p>
            <h3 className="mt-1 text-[20px] font-bold tracking-tight text-[#1E293B]">
              Jadwal Reservasi & Penggunaan Terkonfirmasi
            </h3>
            <p className="mt-2 max-w-[680px] text-[12px] leading-5 text-[#64748B]">
              Hanya menampilkan reservasi yang telah disetujui PLP. Pengajuan baru dapat dibuat dengan memilih tanggal pada kalender di bawah.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(selectedAssetId || selectedUnitId) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAssetId(null);
                  setSelectedUnitId(null);
                }}
                className="min-h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[11px] font-bold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition cursor-pointer"
              >
                Tampilkan Semua Instrumen
              </button>
            )}
            <Link
              href="/student/calendar"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-3 text-[11px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
            >
              Kalender Saya
            </Link>
          </div>
        </div>
        <div className="mt-5">
          <ScheduleCalendar
            events={filteredEvents}
            eventsMonth={month}
            ariaLabel={`Agenda ${room.shortName}`}
            emptyLabel="Tidak ada jadwal yang sesuai dengan filter instrumen ini. Tampilkan semua instrumen atau pilih unit lain."
            toolbar={<CalendarRefresh />}
            renderCard={(context) => {
              if (context.source === "event") {
                const event =
                  context.events.find((item) => item.id === context.eventId) ??
                  filteredEvents.find((item) => item.id === context.eventId);
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
              }
              const availableUnit = selectedUnitId
                ? selectedAsset?.units.find((u) => u.id === selectedUnitId)
                : selectedAsset?.units.find((unit) => unit.status === "Available");

              const formDefaults = {
                roomCode: room.id,
                equipment:
                  selectedAsset && availableUnit
                    ? [
                        {
                          id: selectedAsset.id,
                          name: selectedAsset.name,
                          unitId: availableUnit.id,
                          unitLabel: availableUnit.label,
                          classification: selectedAsset.classification,
                          imageMediaId: selectedAsset.imageMediaId,
                        },
                      ]
                    : [],
              };

              if (context.source === "more") {
                return (
                  <StudentDayOverviewCard
                    key={`${context.range.start}-${context.range.end}-${context.selectionId}`}
                    context={context}
                    defaults={formDefaults}
                    onCancel={context.close}
                  />
                );
              }

              return (
                <ScheduleRequestForm
                  key={`${context.range.start}-${context.range.end}-${context.selectionId}`}
                  range={context.range}
                  label={context.label}
                  month={context.month}
                  defaults={formDefaults}
                  onCancel={context.close}
                />
              );
            }}
          />
        </div>
      </section>

      <section id="equipment" className="mt-4 dashboard-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Instrumen & Alat di Ruangan Ini
            </p>
            <h3 className="mt-1 text-[20px] font-bold tracking-tight text-[#1E293B]">
              Pilih unit untuk menyaring agenda kalender
            </h3>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {roomAssets.length ? (
            roomAssets.map((asset) => {
              const units = asset.units;
              const availableCount = units.filter(
                (unit) => unit.status === "Available",
              ).length;
              const expanded = expandedAssetId === asset.id;
              const isSelected = selectedAssetId === asset.id;
              return (
                <div
                  key={asset.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white transition-colors",
                    isSelected
                      ? "border-[#F9B129] ring-2 ring-[#F9B129]/20"
                      : "border-[#E1E1E1]",
                  )}
                >
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E1E1E1] bg-[#FAFAF8]">
                      {asset.imageMediaId ? (
                        <img
                          src={`/api/media/${asset.imageMediaId}`}
                          alt={asset.name}
                          className="size-full object-contain p-1"
                          loading="lazy"
                        />
                      ) : (
                        <EquipmentGlyph
                          name={asset.name}
                          className="size-6 text-[#38529B]"
                        />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => chooseAsset(asset.id)}
                      className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129] cursor-pointer"
                      aria-expanded={expanded}
                      aria-controls={`units-${asset.id}`}
                    >
                      <strong className="block truncate text-[14px] font-bold text-[#1E293B]">
                        {asset.name}
                      </strong>
                      <span className="mt-1 block text-[11px] text-[#64748B]">
                        {asset.id} · {availableCount} dari {units.length} unit siap digunakan
                      </span>
                    </button>
                    <StatusBadge tone={asset.tone}>
                      {asset.status === "Available" ? "Tersedia" : asset.status === "Maintenance" ? "Perbaikan" : asset.status}
                    </StatusBadge>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAssetId(expanded ? "" : asset.id)
                      }
                      className="flex size-10 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition cursor-pointer"
                      aria-label={`${expanded ? "Ciutkan" : "Perluas"} unit ${asset.name}`}
                      aria-expanded={expanded}
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          expanded && "rotate-90",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  {expanded && (
                    <div
                      id={`units-${asset.id}`}
                      className="grid gap-2 border-t border-[#EEEEEE] bg-[#FAFAF8] p-3 sm:grid-cols-2"
                    >
                      {units.map((unit) => {
                        const selected = selectedUnitId === unit.id;
                        const disabled = unit.status === "Maintenance";
                        return (
                          <button
                            type="button"
                            key={unit.id}
                            disabled={disabled}
                            onClick={() => chooseUnit(asset.id, unit.id)}
                            className={cn(
                              "flex min-h-14 items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                              selected && "border-[#F9B129] bg-[#FEF1CC]",
                              !selected &&
                                !disabled &&
                                "border-[#E1E1E1] bg-white hover:border-[#B7B7B7]",
                              disabled &&
                                "cursor-not-allowed border-[#F5D0D0] bg-[#FDE9E9] text-[#9E3636]",
                            )}
                          >
                            <span>
                              <strong className="block text-[11px]">
                                {unit.label}
                              </strong>
                              <span className="mt-1 block text-[10px] text-[#64748B]">
                                {unit.status === "Maintenance"
                                  ? unit.notes
                                    ? `${unit.condition ? unit.condition.replace(/_/g, " ") + " · " : ""}${unit.notes}`
                                    : unit.condition
                                      ? unit.condition.replace(/_/g, " ")
                                      : "Dalam perbaikan"
                                  : (unit.holder ?? "Siap untuk pengajuan baru")}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-[10px] font-bold",
                                unit.status === "Available" && "text-[#03683A]",
                                unit.status === "Maintenance" &&
                                  "text-[#9E3636]",
                                unit.status !== "Available" &&
                                  unit.status !== "Maintenance" &&
                                  "text-[#38529B]",
                              )}
                            >
                              {unit.status === "Available" ? "Tersedia" : unit.status === "Maintenance" ? "Perbaikan" : unit.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              title="Tidak ada instrumen di ruangan ini"
              detail="Pilih ruangan lain melalui denah laboratorium."
            />
          )}
        </div>
      </section>

      <section className="mt-4 dashboard-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Bahan Kimia & Reagen
            </p>
            <h3 className="mt-1 text-[18px] font-bold text-[#1E293B]">
              Stok Bahan Terpantau
            </h3>
          </div>
        </div>
        {roomMaterials.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Belum ada stok bahan kimia di ruangan ini"
              detail="Setiap lab menyimpan stoknya sendiri. Pilih bahan dari lab ini, atau hubungi PLP terkait ketersediaan bahan khusus."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {roomMaterials.map((material) => (
              <Link
                href={`/student/laboratory/materials/${material.id}?room=${material.roomId}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#EEEEEE] p-3 hover:bg-[#FAFAF8] transition"
                key={material.id}
              >
                <span className="flex items-center gap-3">
                  {material.imageMediaId ? (
                    <CatalogImage
                      mediaId={material.imageMediaId}
                      alt={material.name}
                      size={40}
                      className="rounded-xl"
                    />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#FEF1CC] text-[#A45C1B]">
                      <PackageSearch className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <span>
                    <strong className="block text-[12px] text-[#1E293B]">
                      {material.name}
                    </strong>
                    <small className="mt-1 block text-[11px] text-[#64748B]">
                      {material.available} {material.unit} tersedia
                    </small>
                  </span>
                </span>
                <StatusBadge tone={material.tone}>Stok</StatusBadge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </FlowShell>
  );
}

export function EquipmentDetailPage({
  assetId,
  catalog,
  userName,
}: {
  assetId: string;
  catalog: LabCatalog;
  userName: string;
}) {
  const asset = catalog.equipment.find(
    (item) => item.id.toLowerCase() === assetId.toLowerCase(),
  );
  if (!asset)
    return (
      <FlowShell
        title="Instrumen & Alat"
        eyebrow="Detail Fasilitas"
        userName={userName}
        activeKey="dashboard"
        catalog={catalog}
      >
        <BackLink href="/student" />
        <EmptyState
          title="Instrumen tidak ditemukan"
          detail="Cek kembali kode instrumen atau kembali ke denah laboratorium."
        />
      </FlowShell>
    );
  return (
    <FlowShell
      title={asset.name}
      eyebrow="Detail Fasilitas"
      userName={userName}
      activeKey="dashboard"
      catalog={catalog}
    >
      <BackLink href={asset ? `/student/laboratory/rooms/${asset.roomId}` : "/student"} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <div>
          <section className="dashboard-card p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                  Kode Aset: {asset.id}
                </p>
                <h2 className="mt-2 text-[24px] font-extrabold tracking-tight text-[#1E293B]">
                  {asset.name}
                </h2>
                <p className="mt-2 text-[12px] text-[#64748B]">
                  {asset.room} · {asset.usage}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <CatalogImage
                  mediaId={asset.imageMediaId}
                  alt={asset.name}
                  size={64}
                />
                <StatusBadge tone={asset.tone}>
                  {asset.status === "Available" ? "Tersedia" : asset.status === "Maintenance" ? "Perbaikan" : asset.status}
                </StatusBadge>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Kondisi Fisik" value={asset.condition} />
              <InfoTile label="Tipe Penggunaan" value={asset.usage} />
              <InfoTile label="Spesifikasi Teknis" value={asset.meta} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Total Unit Terdaftar" value={asset.totalUnits} />
              <InfoTile label="Sedang Digunakan" value={asset.inUseUnits} />
              <InfoTile label="Unit Siap Pakai" value={asset.availableUnits} />
            </div>
          </section>
          <section className="mt-4 dashboard-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-[#EEEEEE] pb-4">
              <div>
                <h3 className="text-[16px] font-bold text-[#1E293B]">Unit Terdaftar</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Status operasional tiap unit instrumen</p>
              </div>
              <StatusBadge tone={asset.tone}>
                {asset.availableUnits} unit siap
              </StatusBadge>
            </div>
            <ul className="mt-5 space-y-2">
              {asset.units.map((unit) => (
                <li
                  key={unit.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EEEEEE] p-3"
                >
                  <span className="min-w-0">
                    <strong className="block text-[12px] text-[#1E293B]">
                      {unit.label}
                    </strong>
                    <small className="mt-1 block text-[11px] text-[#94A3B8]">
                      {unit.id}
                      {unit.holder ? ` · ${unit.holder}` : ""}
                    </small>
                  </span>
                  <StatusBadge
                    tone={
                      unit.status === "Available"
                        ? "green"
                        : unit.status === "Maintenance" ||
                            unit.status === "Awaiting return"
                          ? "rose"
                          : unit.status === "In use"
                            ? "yellow"
                            : "blue"
                    }
                  >
                    {unit.status === "Available"
                      ? "Tersedia"
                      : unit.status === "Maintenance"
                        ? "Perbaikan"
                        : unit.status === "In use"
                          ? "Digunakan"
                          : unit.status === "Awaiting return"
                            ? "Menunggu Kembali"
                            : unit.status}
                  </StatusBadge>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-[11px] leading-5 text-[#64748B]">
              Data ketersediaan ini sinkron secara langsung dengan denah lab, kalender penjadwalan, dan formulir permohonan.
            </p>
          </section>
        </div>
        <aside className="dashboard-card p-5 sm:p-6">
          <h3 className="text-[16px] font-bold text-[#1E293B]">Perencanaan Jadwal</h3>
          <p className="mt-2 text-[12px] leading-5 text-[#64748B]">
            Pilih rentang tanggal pada agenda ruangan, lalu cantumkan instrumen ini saat mengisi formulir permohonan.
          </p>
          <Link
            href={`/student/laboratory/rooms/${asset.roomId}`}
            className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] text-[12px] font-bold text-[#1E293B] hover:bg-[#F7B742] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Buka Jadwal Ruangan
          </Link>
          <Link
            href="/student/shared-usage"
            className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Lihat Opsi Sesi Bersama
          </Link>
          <div className="mt-6 border-t border-[#EEEEEE] pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">
              Jadwal Terdekat Tersedia
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[#64748B]">
              {asset.nextAvailable}
            </p>
          </div>
        </aside>
      </div>
    </FlowShell>
  );
}

export function MaterialDetailPage({
  materialId,
  roomId,
  catalog,
  userName,
}: {
  materialId: string;
  roomId?: string;
  catalog: LabCatalog;
  userName: string;
}) {
  const material = catalog.materials.find(
    (item) =>
      item.id.toLowerCase() === materialId.toLowerCase() &&
      (!roomId || item.roomId === roomId),
  );
  if (!material)
    return (
      <FlowShell
        title="Bahan Kimia"
        eyebrow="Detail Fasilitas"
        userName={userName}
        activeKey="dashboard"
        catalog={catalog}
      >
        <BackLink href="/student" />
        <EmptyState
          title="Bahan kimia tidak ditemukan"
          detail="Cek kembali kode bahan kimia atau buka halaman laboratorium."
        />
      </FlowShell>
    );
  return (
    <FlowShell
      title={material.name}
      eyebrow="Detail Fasilitas"
      userName={userName}
      activeKey="dashboard"
      catalog={catalog}
    >
      <BackLink href={material ? `/student/laboratory/rooms/${material.roomId}` : "/student"} />
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
            {material.id} · {material.category}
          </p>
          <h2 className="mt-2 text-[24px] font-extrabold tracking-tight text-[#1E293B] sm:text-[30px]">
            {material.name}
          </h2>
          <p className="mt-2 text-[13px] text-[#64748B]">
            Tersimpan di {material.room}. Data stok dipisahkan antara stok fisik, alokasi reservasi, dan jumlah yang siap diajukan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CatalogImage
            mediaId={material.imageMediaId}
            alt={material.name}
            size={64}
          />
          <StatusBadge tone={material.tone}>
            {material.available} {material.unit} tersedia
          </StatusBadge>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <InfoTile
          label="Stok Fisik"
          value={`${material.physical} ${material.unit}`}
        />
        <InfoTile
          label="Alokasi Reservasi"
          value={`${material.reserved} ${material.unit}`}
        />
        <InfoTile
          label="Stok Siap Pakai"
          value={`${material.available} ${material.unit}`}
        />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <section className="dashboard-card p-5 sm:p-6">
          <h3 className="text-[16px] font-bold text-[#1E293B]">Ketentuan Pengambilan</h3>
          <div className="mt-4 rounded-xl bg-[#FEF1CC] p-4">
            <p className="text-[12px] font-semibold text-[#705012]">
              {material.rule}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#705012]">
              Aturan ini dikonfigurasi laboratorium dan divalidasi server saat pengajuan dikirim.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {material.options.slice(0, 6).map((value) => (
              <span
                key={value}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[11px] font-semibold tabular-nums text-[#1E293B]"
              >
                {value} {material.unit}
              </span>
            ))}
          </div>
          <Link
            href={`/student/laboratory/rooms/${material.roomId}`}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F7B742] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Ajukan Melalui Jadwal Ruangan
          </Link>
        </section>
        <aside className="dashboard-card p-5 sm:p-6">
          <h3 className="text-[16px] font-bold text-[#1E293B]">Catatan Inventaris & Batch</h3>
          <p className="mt-2 text-[12px] leading-5 text-[#64748B]">
            Stok siap pakai merupakan stok fisik dikurangi reservasi aktif yang telah disetujui. Pengambilan fisik akan memotong stok saat bahan diserahkan oleh PLP.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/60 p-3">
            <PackageSearch
              className="size-4 text-[#64748B]"
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium text-[#1E293B]">
              {material.expiry
                ? `Batch terdekat kedaluwarsa · ${new Date(
                    material.expiry,
                  ).toLocaleDateString("id-ID")}`
                : "Tidak ada catatan kedaluwarsa khusus"}
            </span>
          </div>
        </aside>
      </div>
    </FlowShell>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-2 text-[14px] font-bold text-[#1E293B]">{value}</p>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#FAFAF8] p-6 text-center">
      <PackageSearch
        className="mx-auto size-6 text-[#94A3B8]"
        aria-hidden="true"
      />
      <p className="mt-3 text-[13px] font-semibold text-[#1E293B]">{title}</p>
      <p className="mt-1 text-[11px] text-[#64748B]">{detail}</p>
    </div>
  );
}

const sharedStatusLabels: Record<string, string> = {
  PENDING: "Menunggu jawaban",
  ACCEPTED: "Diterima",
  DECLINED: "Ditolak",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

function toLocalInputValue(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(iso));
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return `${pick("year")}-${pick("month")}-${pick("day")}T${hour}:${pick("minute")}`;
}

function SharedUsageRequestCard({
  reservation,
}: {
  reservation: ReservationView & {
    myRequestId: string | null;
    myRequestStatus: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState(toLocalInputValue(reservation.startAt));
  const [endAt, setEndAt] = useState(toLocalInputValue(reservation.endAt));
  const [purpose, setPurpose] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <article className="dashboard-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        {reservation.imageMediaId ? (
          <CatalogImage
            mediaId={reservation.imageMediaId}
            alt={reservation.assetName}
            size={44}
            className="rounded-xl"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#E9EEFC] text-[#38529B]">
            <UsersRound className="size-5" aria-hidden="true" />
          </span>
        )}
        <StatusBadge tone={reservation.myRequestStatus ? "yellow" : "blue"}>
          {reservation.myRequestStatus
            ? sharedStatusLabels[reservation.myRequestStatus]
            : "Sedang Berjalan"}
        </StatusBadge>
      </div>
      <h3 className="mt-5 text-[15px] font-bold text-[#1E293B]">
        {reservation.unitCode} · {reservation.assetName}
      </h3>
      <p className="mt-1 text-[12px] text-[#64748B]">
        {reservation.roomName} ·{" "}
        {new Date(reservation.startAt).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        })}{" "}
        –{" "}
        {new Date(reservation.endAt).toLocaleTimeString("id-ID", {
          timeStyle: "short",
        })}
      </p>
      <div className="mt-5 space-y-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/60 p-3">
        <p className="text-[11px] font-semibold text-[#1E293B]">
          Pengguna Utama · {reservation.primaryUserName}
        </p>
        <p className="text-[11px] text-[#64748B]">{reservation.purpose}</p>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-[#FDE9E9] p-2.5 text-[11px] leading-5 text-[#9E3636]"
        >
          {error}
        </p>
      )}
      {sent ? (
        <p className="mt-4 rounded-xl bg-[#F4FCF7] p-3 text-[11px] leading-5 text-[#03683A]">
          Permintaan terkirim. Menunggu konfirmasi dari {reservation.primaryUserName}.
        </p>
      ) : open ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            try {
              await apiRequest("/api/shared-usage", {
                method: "POST",
                body: {
                  reservationId: reservation.id,
                  startAt: `${startAt}:00+07:00`,
                  endAt: `${endAt}:00+07:00`,
                  purpose: purpose.trim(),
                },
              });
              setSent(true);
              router.refresh();
            } catch (caught) {
              setError(errorMessage(caught));
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="block text-[11px] font-semibold text-[#1E293B]">
            Mulai
            <input
              type="datetime-local"
              value={startAt}
              min={toLocalInputValue(reservation.startAt)}
              max={toLocalInputValue(reservation.endAt)}
              onChange={(event) => setStartAt(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
              required
            />
          </label>
          <label className="block text-[11px] font-semibold text-[#1E293B]">
            Selesai
            <input
              type="datetime-local"
              value={endAt}
              min={startAt}
              max={toLocalInputValue(reservation.endAt)}
              onChange={(event) => setEndAt(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
              required
            />
          </label>
          <label className="block text-[11px] font-semibold text-[#1E293B]">
            Tujuan Penggunaan
            <input
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Uraikan bagian instrumen / riset yang akan dikerjakan"
              className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1E293B] px-4 text-[11px] font-bold text-white hover:bg-[#0F172A] transition disabled:opacity-70 cursor-pointer"
            >
              {pending ? "Memproses..." : "Kirim Permintaan"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E2E8F0] px-4 text-[11px] font-bold text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={Boolean(reservation.myRequestStatus)}
          className="mt-4 min-h-11 w-full rounded-xl bg-[#1E293B] text-[12px] font-bold text-white hover:bg-[#0F172A] transition disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] cursor-pointer"
        >
          {reservation.myRequestStatus
            ? sharedStatusLabels[reservation.myRequestStatus]
            : "Ajukan Sesi Bersama"}
        </button>
      )}
    </article>
  );
}

export function SharedUsagePage({
  data,
  catalog,
  userName,
}: {
  data: SharedUsagePageView;
  catalog: LabCatalog;
  userName: string;
}) {
  return (
    <FlowShell
      title="Sesi Bersama"
      eyebrow="Koordinasi Riset"
      userName={userName}
      activeKey="calendar"
      catalog={catalog}
    >
      <BackLink href="/student/calendar" />
      <section className="mb-7">
        <p className="text-[13px] font-medium text-[#64748B]">
          Koordinasi Penggunaan Bersama
        </p>
        <h2 className="mt-1 max-w-[720px] text-[24px] font-extrabold tracking-tight text-[#1E293B] sm:text-[30px]">
          Pengajuan Sesi Bersama (Shared Usage)
        </h2>
        <p className="mt-2 max-w-[720px] text-[13px] leading-5 text-[#64748B]">
          Ajukan izin untuk bergabung dalam slot waktu reservasi yang telah disetujui tanpa menimbulkan bentrok jadwal. Sesi bersama memerlukan persetujuan dari mahasiswa pemegang reservasi utama.
        </p>
      </section>

      {data.incoming.length > 0 && (
        <section className="mb-4 dashboard-card p-5 sm:p-6">
          <div className="border-b border-[#EEEEEE] pb-3 mb-4">
            <h3 className="text-[16px] font-bold text-[#1E293B]">
              Permintaan Masuk ({data.incoming.length})
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">Permintaan mahasiswa lain untuk berbagi sesi reservasi Anda</p>
          </div>
          <ul className="space-y-3">
            {data.incoming.map((item) => (
              <IncomingSharedUsageRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      <section className="mb-4">
        <div className="mb-3">
          <h3 className="text-[16px] font-bold text-[#1E293B]">
            Reservasi yang Tersedia
          </h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">Reservasi aktif mahasiswa lain yang dapat diajukan sesi bersama</p>
        </div>
        {data.available.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Belum ada reservasi aktif yang dapat dibagi"
              detail="Sesi bersama hanya dapat diajukan pada reservasi mahasiswa lain yang telah disetujui PLP. Periksa kembali saat ada jadwal aktif."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.available.map((reservation) => (
              <SharedUsageRequestCard
                key={reservation.id}
                reservation={reservation}
              />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-card p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3 mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#1E293B]">
              Permintaan Saya
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">Riwayat pengajuan sesi bersama yang Anda kirimkan</p>
          </div>
          <span className="text-[11px] font-semibold text-[#64748B]">
            {data.outgoing.length} pengajuan
          </span>
        </div>
        {data.outgoing.length === 0 ? (
          <p className="text-[12px] text-[#64748B] py-3">
            Anda belum pernah mengirimkan permintaan sesi bersama.
          </p>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {data.outgoing.map((item) => (
              <OutgoingSharedUsageRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </FlowShell>
  );
}

function IncomingSharedUsageRow({
  item,
}: {
  item: SharedUsagePageView["incoming"][number];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const respond = async (action: "accept" | "decline") => {
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/api/shared-usage/${item.id}/respond`, {
        method: "POST",
        body: { action },
      });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };
  return (
    <li className="rounded-2xl border border-[#E9EEFC] bg-[#FBFCFE] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {item.imageMediaId && (
            <CatalogImage
              mediaId={item.imageMediaId}
              alt={item.assetName}
              size={36}
              className="mt-0.5 rounded-lg"
            />
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#1E293B]">
              {item.requesterName} · {item.unitCode}
            </p>
            <p className="mt-1 text-[11px] text-[#64748B]">
              {item.roomName} ·{" "}
              {new Date(item.startAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              –{" "}
              {new Date(item.endAt).toLocaleTimeString("id-ID", {
                timeStyle: "short",
              })}
            </p>
            {item.purpose && (
              <p className="mt-1 text-[11px] text-[#64748B]">{item.purpose}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void respond("accept")}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#048444] px-4 text-[11px] font-bold text-white hover:bg-[#03683A] transition disabled:opacity-70 cursor-pointer"
          >
            Terima
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void respond("decline")}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-[11px] font-bold text-[#9E3636] hover:bg-[#FDF2F2] transition disabled:opacity-70 cursor-pointer"
          >
            Tolak
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-[#9E3636]">
          {error}
        </p>
      )}
    </li>
  );
}

function OutgoingSharedUsageRow({
  item,
}: {
  item: SharedUsagePageView["outgoing"][number];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const cancel = async () => {
    setPending(true);
    try {
      await apiRequest(`/api/shared-usage/${item.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
    }
  };
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {item.imageMediaId && (
          <CatalogImage
            mediaId={item.imageMediaId}
            alt={item.assetName}
            size={32}
            className="rounded-lg"
          />
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#1E293B]">
            {item.unitCode} · {item.roomName}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            {new Date(item.startAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            –{" "}
            {new Date(item.endAt).toLocaleTimeString("id-ID", {
              timeStyle: "short",
            })}{" "}
            · Pengguna Utama: {item.primaryUserName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge
          tone={
            item.status === "ACCEPTED"
              ? "green"
              : item.status === "DECLINED"
                ? "rose"
                : item.status === "PENDING"
                  ? "yellow"
                  : "cream"
          }
        >
          {sharedStatusLabels[item.status]}
        </StatusBadge>
        {item.status === "PENDING" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void cancel()}
            className="inline-flex min-h-9 items-center rounded-xl border border-[#E2E8F0] px-3 text-[11px] font-bold text-[#9E3636] hover:bg-[#FDF2F2] transition disabled:opacity-60 cursor-pointer"
          >
            {pending ? "..." : "Batalkan"}
          </button>
        )}
      </div>
    </li>
  );
}

export function IncidentFormPage({
  catalog,
  userName,
}: {
  catalog: LabCatalog;
  userName: string;
}) {
  const router = useRouter();
  const [equipmentCode, setEquipmentCode] = useState(
    catalog.equipment[0]?.id ?? "",
  );
  const [roomCode, setRoomCode] = useState(catalog.rooms[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [occurredAt, setOccurredAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const selectedAsset = catalog.equipment.find(
    (asset) => asset.id === equipmentCode,
  );

  if (submitted) {
    return (
      <FlowShell
        title="Laporkan Kendala"
        eyebrow="Bantuan & Layanan"
        userName={userName}
        activeKey="incidents"
        catalog={catalog}
      >
        <BackLink href="/student/incidents" />
        <div className="dashboard-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#048444]">
            Laporan Kendala Berhasil Dicatat
          </p>
          <h2 className="mt-2 text-[20px] font-bold text-[#1E293B]">{submitted}</h2>
          <p className="mt-2 max-w-[560px] text-[12px] leading-5 text-[#64748B]">
            Status operasional instrumen tidak otomatis berubah. PLP akan melakukan verifikasi teknis dan mencatat hasilnya pada timeline kendala.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/student/incidents"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#1E293B] px-4 text-[12px] font-bold text-white hover:bg-[#0F172A] transition"
            >
              Lihat Daftar Kendala
            </Link>
            <Link
              href="/student"
              className="inline-flex min-h-11 items-center rounded-xl border border-[#E2E8F0] px-4 text-[12px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell
      title="Laporkan Kendala"
      eyebrow="Bantuan & Layanan"
      userName={userName}
      activeKey="incidents"
      catalog={catalog}
    >
      <BackLink href="/student/incidents" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <form
          className="dashboard-card p-5 sm:p-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            try {
              const created = await apiRequest<{ code: string }>(
                "/api/incidents",
                {
                  method: "POST",
                  body: {
                    equipmentCode: equipmentCode || undefined,
                    roomCode: roomCode || undefined,
                    title: title.trim(),
                    description: description.trim(),
                    severity,
                    occurredAt: occurredAt
                      ? `${occurredAt}:00+07:00`
                      : undefined,
                  },
                },
              );
              setSubmitted(created.code);
              router.refresh();
            } catch (caught) {
              setError(errorMessage(caught));
            } finally {
              setPending(false);
            }
          }}
        >
          <h3 className="text-[18px] font-bold text-[#1E293B]">Apa kendala yang terjadi?</h3>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Laporan Anda akan ditinjau oleh petugas teknis (PLP). Pelaporan kendala oleh mahasiswa tidak otomatis mengubah status operasional instrumen hingga dikonfirmasi.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-[#F5D0D0] bg-[#FFF7F7] p-3 text-[12px] text-[#9E3636]"
            >
              {error}
            </p>
          )}
          <div className="mt-5 space-y-4">
            <label className="block text-[12px] font-semibold text-[#1E293B]">
              Instrumen / Alat Terkait
              <select
                value={equipmentCode}
                onChange={(event) => setEquipmentCode(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
              >
                <option value="">Tidak terkait instrumen tertentu</option>
                {catalog.equipment.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.id} · {asset.name} ({asset.room})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] font-semibold text-[#1E293B]">
              Ruangan Laboratorium
              <select
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
              >
                <option value="">Ikuti lokasi instrumen</option>
                {catalog.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] font-semibold text-[#1E293B]">
              Judul Kendala
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
                placeholder={selectedAsset ? `Kendala pada ${selectedAsset.name}` : "Ringkasan masalah yang terjadi"}
                className="mt-2 h-11 w-full rounded-xl border border-[#E2E8F0] px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#1E293B]">
              Tingkat Urgensi
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
              >
                <option value="LOW">Rendah (tidak mengganggu fungsi utama)</option>
                <option value="MEDIUM">Sedang (mengganggu sebagian operasional)</option>
                <option value="HIGH">Tinggi (alat tidak dapat digunakan)</option>
                <option value="CRITICAL">Kritis (kondisi darurat / bahaya keselamatan)</option>
              </select>
            </label>
            <label className="block text-[12px] font-semibold text-[#1E293B]">
              Waktu Kejadian
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E2E8F0] px-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#1E293B]">
              Kronologi & Detail Masalah
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={10}
                rows={5}
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] p-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                placeholder="Uraikan detail masalah, perilaku alat yang diamati, serta tindakan darurat yang telah dilakukan jika ada..."
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-6 min-h-11 rounded-xl bg-[#F45959] px-4 text-[12px] font-bold text-white hover:bg-[#E04848] transition disabled:opacity-70 cursor-pointer"
          >
            {pending ? "Memproses..." : "Kirim Laporan Kendala"}
          </button>
        </form>
        <aside className="dashboard-card h-fit p-5 sm:p-6">
          <h3 className="text-[16px] font-bold text-[#1E293B]">Prosedur Keselamatan Kerja</h3>
          <p className="mt-2 text-[12px] leading-5 text-[#64748B]">
            Jika terjadi bahaya langsung (asap, kebocoran zat kimia berbahaya, sengatan listrik), segera hentikan penggunaan instrumen, evakuasi area, dan beritahu staf PLP terdekat.
          </p>
          <div className="mt-5 flex gap-2 rounded-xl bg-[#FDE9E9] p-3 text-[11px] leading-5 text-[#9E3636]">
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            Informasi keselamatan kerja wajib diperhatikan oleh seluruh pengguna fasilitas lab kimia.
          </div>
        </aside>
      </div>
    </FlowShell>
  );
}

export function IncidentDetailPage({
  incident,
  catalog,
  userName,
}: {
  incident: IncidentView;
  catalog: LabCatalog;
  userName: string;
}) {
  const timeline = [
    {
      label: "Dilaporkan",
      detail: `${incident.reporterName} · ${new Date(
        incident.createdAt,
      ).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`,
      tone: "done" as const,
    },
    ...(incident.assessment
      ? [
          {
            label: "Pemeriksaan Teknis",
            detail: `${incident.assessment.assessment} · Oleh: ${incident.assessment.assessedByName}`,
            tone: "done" as const,
          },
        ]
      : []),
    ...(incident.resolution
      ? [
          {
            label: "Selesai Ditangani",
            detail: `${incident.resolution.action} · ${new Date(
              incident.resolution.resolvedAt,
            ).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}`,
            tone: "done" as const,
          },
        ]
      : [
          {
            label: "Tindak Lanjut",
            detail:
              incident.status === "REPORTED"
                ? "Menunggu verifikasi teknis PLP"
                : "Sedang dalam proses penanganan",
            tone: "current" as const,
          },
        ]),
  ];
  return (
    <FlowShell
      title={incident.code}
      eyebrow="Detail Kendala"
      userName={userName}
      activeKey="incidents"
      catalog={catalog}
    >
      <BackLink href="/student/incidents" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <section className="dashboard-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                Laporan Kendala Laboratorium
              </p>
              <h2 className="mt-2 text-[24px] font-extrabold tracking-tight text-[#1E293B]">
                {incident.title}
              </h2>
              <p className="mt-2 text-[12px] text-[#64748B]">
                {incident.code} · Dilaporkan oleh {incident.reporterName}
              </p>
            </div>
            <StatusBadge
              tone={
                incident.status === "RESOLVED"
                  ? "green"
                  : incident.status === "REPORTED"
                    ? "rose"
                    : "yellow"
              }
            >
              {incidentStatusLabel[incident.status] ?? incident.status}
            </StatusBadge>
          </div>
          <p className="mt-6 text-[13px] leading-6 text-[#64748B]">
            {incident.description}
          </p>
          {incident.assessment && (
            <div className="mt-6 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">
                Catatan Pemeriksaan PLP
              </p>
              <p className="mt-2 text-[12px] font-semibold text-[#1E293B]">
                {incident.assessment.finding}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                {incident.assessment.assessment}
              </p>
              {incident.assessment.recommendedAction && (
                <p className="mt-2 text-[11px] text-[#64748B]">
                  Tindakan lanjutan: {incident.assessment.recommendedAction}
                </p>
              )}
            </div>
          )}
          <div className="mt-6 border-t border-[#EEEEEE] pt-5">
            <h3 className="text-[16px] font-bold text-[#1E293B]">Kronologi Penanganan</h3>
            <div className="mt-5 space-y-4">
              {timeline.map((step) => (
                <div className="flex gap-3" key={step.label}>
                  <span
                    className={cn(
                      "mt-1 size-2.5 rounded-full",
                      step.tone === "current"
                        ? "bg-[#F45959]"
                        : "bg-[#048444]",
                    )}
                  />
                  <div>
                    <p className="text-[12px] font-semibold text-[#1E293B]">{step.label}</p>
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="dashboard-card h-fit p-5 sm:p-6">
          <h3 className="text-[16px] font-bold text-[#1E293B]">
            {incident.equipmentName ?? incident.roomName ?? "Fasilitas Terkait"}
          </h3>
          <p className="mt-2 text-[12px] text-[#64748B]">
            {[incident.equipmentCode, incident.roomName]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {incident.equipmentCode && (
            <Link
              href={`/student/laboratory/equipment/${incident.equipmentCode}`}
              className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition"
            >
              Lihat Detail Instrumen
            </Link>
          )}
          <Link
            href="/student/incidents/new"
            className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-[#1E293B] text-[12px] font-bold text-white hover:bg-[#0F172A] transition"
          >
            Laporkan Kendala Lain
          </Link>
          <div className="mt-5 flex gap-2 rounded-xl bg-[#FFF4D9] p-3 text-[11px] leading-5 text-[#705012]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Laporan mahasiswa menjadi dasar bagi PLP untuk inspeksi. Perubahan status resmi instrumen diperbarui setelah verifikasi teknis.
          </div>
        </aside>
      </div>
    </FlowShell>
  );
}

export function ReaksanFlowPage({
  kind,
  userName,
  catalog,
  id,
  roomId,
  events,
  month,
  sharedUsage,
  incident,
}: {
  kind: ReaksanFlowKind;
  userName: string;
  catalog: LabCatalog;
  id?: string;
  roomId?: string;
  events?: ScheduleEvent[];
  month: { year: number; month: number };
  sharedUsage?: SharedUsagePageView;
  incident?: IncidentView;
}) {
  switch (kind) {
    case "room-detail":
      return (
        <RoomDetailPage
          roomId={id ?? ""}
          catalog={catalog}
          events={events ?? []}
          month={month}
          userName={userName}
        />
      );
    case "equipment-detail":
      return (
        <EquipmentDetailPage
          assetId={id ?? ""}
          catalog={catalog}
          userName={userName}
        />
      );
    case "material-detail":
      return (
        <MaterialDetailPage
          materialId={id ?? ""}
          roomId={roomId}
          catalog={catalog}
          userName={userName}
        />
      );
    case "shared-usage":
      return (
        <SharedUsagePage
          data={sharedUsage ?? { available: [], incoming: [], outgoing: [] }}
          catalog={catalog}
          userName={userName}
        />
      );
    case "incident-new":
      return <IncidentFormPage catalog={catalog} userName={userName} />;
    case "incident-detail":
      return incident ? (
        <IncidentDetailPage
          incident={incident}
          catalog={catalog}
          userName={userName}
        />
      ) : null;
    default:
      return null;
  }
}
