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
} from "@/components/schedule-calendar";
import { EquipmentGlyph } from "@/components/equipment-glyph";
import { CatalogImage } from "@/components/catalog-image";
import { CalendarRefresh } from "@/components/calendar-refresh";
import { LabCatalogProvider } from "@/components/lab-catalog-context";
import { apiRequest, errorMessage } from "@/components/student-api";
import { formatRangeLabel } from "@/components/schedule-data";
import type {
  IncidentView,
  LabCatalog,
  ReservationView,
  ScheduleEvent,
  SharedUsagePageView,
} from "@/components/schedule-data";
import { SectionTitle, Sidebar, StatusBadge } from "@/components/reaksan-dashboard";

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
  title,
  eyebrow,
  userName,
  activeKey,
  catalog,
  children,
}: {
  title: string;
  eyebrow: string;
  userName: string;
  activeKey: string;
  catalog: LabCatalog;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <LabCatalogProvider value={catalog}>
      <div className="dashboard-shell min-h-screen">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={() => setCollapsed((value) => !value)}
          onClose={() => setMobileOpen(false)}
          userName={userName}
          activeKey={activeKey}
        />
        <div
          className={cn(
            "min-h-screen transition-[padding] duration-200 lg:pl-[256px]",
            collapsed && "lg:pl-[80px]",
          )}
        >
          <FlowHeader
            title={title}
            eyebrow={eyebrow}
            userName={userName}
            onOpenMenu={() => setMobileOpen(true)}
          />
          <main className="mx-auto max-w-[1680px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </LabCatalogProvider>
  );
}

function BackLink({ href = "/student" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl text-[12px] font-bold text-[#6B6B6B] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Back
    </Link>
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
          <p className="text-[13px] font-medium text-[#6B6B6B]">
            Laboratorium Kimia · ringkasan lab
          </p>
          <h2 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-[#212121] sm:text-[32px]">
            {room.name}
          </h2>
          <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-[#6B6B6B]">
            {room.description} See what is available, what is in use, and when
            this room can support your activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="#schedule"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F7B742]"
          >
            View schedule <ChevronRight className="size-4" aria-hidden="true" />
          </a>
          <Link
            href="/student/calendar"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121]"
          >
            My calendar
          </Link>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          [
            "Total units",
            room.equipment,
            "#E9EEFC",
            `${room.typeCount} tracked types`,
          ],
          ["Available", room.available, "#E5F5ED", "Ready to request"],
          ["Reserved", room.reserved, "#E9EEFC", "Approved, not started"],
          ["In use", room.inUse, "#FEF1CC", "Running right now"],
          [
            "Awaiting return",
            room.awaitingReturn,
            "#FDE9E9",
            "Schedule done, unit not returned",
          ],
          ["Maintenance", room.maintenance, "#FDE9E9", "Not selectable"],
        ].map(([label, value, background, hint]) => (
          <div
            className="dashboard-card p-5"
            key={label}
            style={{ backgroundColor: background as string }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">
              {label}
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums text-[#212121]">
              {value}
            </p>
            <p className="mt-1 text-[10px] text-[#6B6B6B]">{hint}</p>
          </div>
        ))}
      </div>

      {roomMaintenanceUnits.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#FDE9E9] bg-[#FFF8F8] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[#9E3636]">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <h4 className="text-[13px] font-bold">
              {roomMaintenanceUnits.length} unit sedang dalam maintenance / pemeriksaan
            </h4>
          </div>
          <p className="mt-1 text-[11px] text-[#6B6B6B]">
            Unit berikut tidak dapat dipilih untuk reservasi sampai proses perbaikan atau kalibrasi diselesaikan oleh PLP.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roomMaintenanceUnits.map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-3 rounded-xl border border-[#F7D0D0] bg-white p-3 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-bold text-[#212121]">
                      {u.label}
                    </p>
                    <span className="rounded-md bg-[#FDE9E9] px-1.5 py-0.5 text-[10px] font-semibold text-[#9E3636]">
                      {u.condition ? u.condition.replace(/_/g, " ") : "Maintenance"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-[#6B6B6B]">
                    {u.assetName}
                  </p>
                  {u.notes && (
                    <p className="mt-1.5 rounded-lg bg-[#FAF9F6] px-2 py-1 text-[10px] text-[#6B6B6B] italic">
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
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
              Room schedule
            </p>
            <h3 className="mt-1 text-[20px] font-bold tracking-[-0.03em]">
              Reserved, running, and completed blocks
            </h3>
            <p className="mt-2 max-w-[680px] text-[12px] leading-5 text-[#6B6B6B]">
              Approved reservations only. Requests you send wait in My calendar
              until PLP approves them, so this agenda never shows pending ones.
              Drag across free dates to send a request for this room.
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
                className="min-h-10 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#6B6B6B] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Show all equipment
              </button>
            )}
            <Link
              href="/student/calendar"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              My calendar
            </Link>
          </div>
        </div>
        <div className="mt-5">
          <ScheduleCalendar
            events={filteredEvents}
            eventsMonth={month}
            ariaLabel={`${room.shortName} schedule`}
            emptyLabel="No blocks match this equipment filter. Show all equipment or pick another unit."
            toolbar={<CalendarRefresh />}
            renderCard={(context) => {
              if (context.source === "event") {
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
              }
              const availableUnit = selectedUnitId
                ? selectedAsset?.units.find((u) => u.id === selectedUnitId)
                : selectedAsset?.units.find((unit) => unit.status === "Available");
              return (
                <ScheduleRequestForm
                  key={`${context.range.start}-${context.range.end}-${context.selectionId}`}
                  range={context.range}
                  label={context.label}
                  month={context.month}
                  defaults={{
                    roomCode: room.id,
                    equipment:
                      selectedAsset && availableUnit
                        ? [
                            {
                              id: selectedAsset.id,
                              name: selectedAsset.name,
                              unitId: availableUnit.id,
                              unitLabel: availableUnit.label,
                              imageMediaId: selectedAsset.imageMediaId,
                            },
                          ]
                        : [],
                  }}
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
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
              Equipment in this room
            </p>
            <h3 className="mt-1 text-[20px] font-bold tracking-[-0.03em]">
              Select a stock unit to filter the agenda
            </h3>
          </div>
          <Link
            href={`/student/equipment?room=${room.id}`}
            className="text-[11px] font-bold text-[#38529B]"
          >
            View all equipment
          </Link>
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
                      className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                      aria-expanded={expanded}
                      aria-controls={`units-${asset.id}`}
                    >
                      <strong className="block truncate text-[14px] font-bold text-[#212121]">
                        {asset.name}
                      </strong>
                      <span className="mt-1 block text-[11px] text-[#6B6B6B]">
                        {asset.id} · {availableCount} of {units.length} shown units available to plan
                      </span>
                    </button>
                    <StatusBadge tone={asset.tone}>{asset.status}</StatusBadge>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAssetId(expanded ? "" : asset.id)
                      }
                      className="flex size-10 items-center justify-center rounded-xl border border-[#E1E1E1] text-[#6B6B6B] hover:bg-[#F5F5F5]"
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${asset.name} stock units`}
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
                              "flex min-h-14 items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors",
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
                              <span className="mt-1 block text-[10px] text-[#6B6B6B]">
                                {unit.status === "Maintenance"
                                  ? unit.notes
                                    ? `${unit.condition ? unit.condition.replace(/_/g, " ") + " · " : ""}${unit.notes}`
                                    : unit.condition
                                      ? unit.condition.replace(/_/g, " ")
                                      : "Dalam perbaikan"
                                  : (unit.holder ?? "Ready for a new request")}
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
                              {unit.status}
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
              title="No equipment in this room"
              detail="Try another room from the laboratory map."
            />
          )}
        </div>
      </section>

      <section className="mt-4 dashboard-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
              Materials
            </p>
            <h3 className="mt-1 text-[18px] font-bold">
              Add materials after equipment
            </h3>
          </div>
          <Link
            href={`/student/materials?room=${room.id}`}
            className="text-[11px] font-bold text-[#38529B]"
          >
            Browse materials
          </Link>
        </div>
        {roomMaterials.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Lab ini belum punya stok material"
              detail="Setiap lab menyimpan stoknya sendiri. Pilih material dari lab ini, atau minta admin lab mengisi stok untuk kegiatan tersebut."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {roomMaterials.map((material) => (
              <Link
                href={`/student/laboratory/materials/${material.id}?room=${material.roomId}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#EEEEEE] p-3 hover:bg-[#FAFAF8]"
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
                    <strong className="block text-[12px]">
                      {material.name}
                    </strong>
                    <small className="mt-1 block text-[11px] text-[#929292]">
                      {material.available} {material.unit} available
                    </small>
                  </span>
                </span>
                <StatusBadge tone={material.tone}>Stock</StatusBadge>
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
        title="Equipment"
        eyebrow="Equipment detail"
        userName={userName}
        activeKey="equipment"
        catalog={catalog}
      >
        <BackLink href="/student/equipment" />
        <EmptyState
          title="Equipment tidak ditemukan"
          detail="Cek kembali kode equipment atau buka halaman Equipment."
        />
      </FlowShell>
    );
  return (
    <FlowShell
      title={asset.name}
      eyebrow="Equipment detail"
      userName={userName}
      activeKey="equipment"
      catalog={catalog}
    >
      <BackLink href="/student/equipment" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <div>
          <section className="dashboard-card p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
                  Asset {asset.id}
                </p>
                <h2 className="mt-2 text-[26px] font-bold tracking-[-0.04em] text-[#212121]">
                  {asset.name}
                </h2>
                <p className="mt-2 text-[12px] text-[#6B6B6B]">
                  {asset.room} · {asset.usage}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <CatalogImage
                  mediaId={asset.imageMediaId}
                  alt={asset.name}
                  size={64}
                />
                <StatusBadge tone={asset.tone}>{asset.status}</StatusBadge>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Condition" value={asset.condition} />
              <InfoTile label="Usage type" value={asset.usage} />
              <InfoTile label="Specification" value={asset.meta} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Tracked units" value={asset.totalUnits} />
              <InfoTile label="In use now" value={asset.inUseUnits} />
              <InfoTile label="Available now" value={asset.availableUnits} />
            </div>
          </section>
          <section className="mt-4 dashboard-card p-5 sm:p-6">
            <SectionTitle
              eyebrow="Availability"
              title="Tracked units"
              action={
                <StatusBadge tone={asset.tone}>
                  {asset.availableUnits} available
                </StatusBadge>
              }
            />
            <ul className="mt-5 space-y-2">
              {asset.units.map((unit) => (
                <li
                  key={unit.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EEEEEE] p-3"
                >
                  <span className="min-w-0">
                    <strong className="block text-[12px] text-[#212121]">
                      {unit.label}
                    </strong>
                    <small className="mt-1 block text-[11px] text-[#929292]">
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
                    {unit.status}
                  </StatusBadge>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-[#F5F5F5] p-4 text-[11px] leading-5 text-[#6B6B6B]">
              This is the same availability data used on the lab map, the
              calendar equipment list, and the request picker.
            </p>
          </section>
        </div>
        <aside className="dashboard-card p-5 sm:p-6">
          <SectionTitle eyebrow="Next action" title="Plan your usage" />
          <p className="mt-3 text-[12px] leading-5 text-[#6B6B6B]">
            Block dates in the room schedule, then pick this unit when you send
            the request.
          </p>
          <Link
            href={`/student/laboratory/rooms/${asset.roomId}`}
            className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] text-[12px] font-bold text-[#212121]"
          >
            Open room schedule
          </Link>
          <Link
            href="/student/shared-usage"
            className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] text-[12px] font-bold text-[#212121]"
          >
            View shared-use options
          </Link>
          <div className="mt-6 border-t border-[#EEEEEE] pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#929292]">
              Next open window
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[#6B6B6B]">
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
        title="Materials"
        eyebrow="Material detail"
        userName={userName}
        activeKey="materials"
        catalog={catalog}
      >
        <BackLink href="/student/materials" />
        <EmptyState
          title="Material tidak ditemukan"
          detail="Cek kembali kode material atau buka halaman Materials."
        />
      </FlowShell>
    );
  return (
    <FlowShell
      title={material.name}
      eyebrow="Material detail"
      userName={userName}
      activeKey="materials"
      catalog={catalog}
    >
      <BackLink href="/student/materials" />
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
            {material.id} · {material.category}
          </p>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.04em] text-[#212121] sm:text-[32px]">
            {material.name}
          </h2>
          <p className="mt-2 text-[13px] text-[#6B6B6B]">
            Stored in {material.room}. Stock values are separated into physical,
            reserved, and available quantities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CatalogImage
            mediaId={material.imageMediaId}
            alt={material.name}
            size={64}
          />
          <StatusBadge tone={material.tone}>
            {material.available} {material.unit} available
          </StatusBadge>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <InfoTile
          label="Physical stock"
          value={`${material.physical} ${material.unit}`}
        />
        <InfoTile
          label="Reserved stock"
          value={`${material.reserved} ${material.unit}`}
        />
        <InfoTile
          label="Available stock"
          value={`${material.available} ${material.unit}`}
        />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <section className="dashboard-card p-5 sm:p-6">
          <SectionTitle eyebrow="Dispensing rule" title="Request quantity" />
          <div className="mt-4 rounded-xl bg-[#FEF1CC] p-4">
            <p className="text-[12px] font-semibold text-[#705012]">
              {material.rule}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#705012]">
              Aturan ini dikonfigurasi laboratorium dan divalidasi server saat
              request dikirim.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {material.options.slice(0, 6).map((value) => (
              <span
                key={value}
                className="rounded-xl border border-[#E1E1E1] bg-white px-3 py-2 text-[11px] font-semibold tabular-nums"
              >
                {value} {material.unit}
              </span>
            ))}
          </div>
          <Link
            href={`/student/laboratory/rooms/${material.roomId}`}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121]"
          >
            Add to a request
          </Link>
        </section>
        <aside className="dashboard-card p-5 sm:p-6">
          <SectionTitle eyebrow="Stock note" title="Batch visibility" />
          <p className="mt-3 text-[12px] leading-5 text-[#6B6B6B]">
            Available stock is physical stock minus approved reservations. Issue
            transactions reduce physical stock only when the material is handed
            out.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#F5F5F5] p-3">
            <PackageSearch
              className="size-4 text-[#6B6B6B]"
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium">
              {material.expiry
                ? `Batch terdekat kedaluwarsa · ${new Date(
                    material.expiry,
                  ).toLocaleDateString("id-ID")}`
                : "Tidak ada batch dengan tanggal kedaluwarsa"}
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
    <div className="rounded-xl bg-[#F5F5F5] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#929292]">
        {label}
      </p>
      <p className="mt-2 text-[14px] font-bold text-[#212121]">{value}</p>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#D8D8D8] bg-[#FAFAF8] p-6 text-center">
      <PackageSearch
        className="mx-auto size-6 text-[#929292]"
        aria-hidden="true"
      />
      <p className="mt-3 text-[13px] font-semibold">{title}</p>
      <p className="mt-1 text-[11px] text-[#6B6B6B]">{detail}</p>
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
            : "Occupied"}
        </StatusBadge>
      </div>
      <h3 className="mt-5 text-[15px] font-bold">
        {reservation.unitCode} · {reservation.assetName}
      </h3>
      <p className="mt-1 text-[12px] text-[#6B6B6B]">
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
      <div className="mt-5 space-y-2 rounded-xl bg-[#F5F5F5] p-3">
        <p className="text-[11px] font-semibold">
          Primary user · {reservation.primaryUserName}
        </p>
        <p className="text-[11px] text-[#6B6B6B]">{reservation.purpose}</p>
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
          Permintaan terkirim. Tunggu jawaban {reservation.primaryUserName}.
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
          <label className="block text-[11px] font-semibold">
            Mulai
            <input
              type="datetime-local"
              value={startAt}
              min={toLocalInputValue(reservation.startAt)}
              max={toLocalInputValue(reservation.endAt)}
              onChange={(event) => setStartAt(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[#E1E1E1] px-3 text-[12px]"
              required
            />
          </label>
          <label className="block text-[11px] font-semibold">
            Selesai
            <input
              type="datetime-local"
              value={endAt}
              min={startAt}
              max={toLocalInputValue(reservation.endAt)}
              onChange={(event) => setEndAt(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[#E1E1E1] px-3 text-[12px]"
              required
            />
          </label>
          <label className="block text-[11px] font-semibold">
            Purpose
            <input
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Bagian yang akan kamu kerjakan"
              className="mt-1 h-11 w-full rounded-xl border border-[#E1E1E1] px-3 text-[12px]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#212121] px-4 text-[11px] font-bold text-white disabled:opacity-70"
            >
              {pending ? "Memproses..." : "Kirim permintaan"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] px-4 text-[11px] font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={Boolean(reservation.myRequestStatus)}
          className="mt-4 min-h-11 w-full rounded-xl bg-[#212121] text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#E1E1E1] disabled:text-[#929292]"
        >
          {reservation.myRequestStatus
            ? sharedStatusLabels[reservation.myRequestStatus]
            : "Request shared usage"}
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
      title="Shared usage"
      eyebrow="Coordination"
      userName={userName}
      activeKey="calendar"
      catalog={catalog}
    >
      <BackLink href="/student/calendar" />
      <section className="mb-7">
        <p className="text-[13px] font-medium text-[#6B6B6B]">
          Coordinate within an existing reservation
        </p>
        <h2 className="mt-1 max-w-[720px] text-[26px] font-bold tracking-[-0.04em] text-[#212121] sm:text-[32px]">
          Ask to share a slot without creating a conflict.
        </h2>
        <p className="mt-2 max-w-[720px] text-[13px] leading-5 text-[#6B6B6B]">
          Shared usage stays inside the primary user&apos;s reservation and
          requires their acceptance. PLP can see confirmed shared usage.
        </p>
      </section>

      {data.incoming.length > 0 && (
        <section className="mb-4 dashboard-card p-5 sm:p-6">
          <SectionTitle
            eyebrow="Perlu jawabanmu"
            title={`Incoming shared usage · ${data.incoming.length}`}
          />
          <ul className="mt-5 space-y-3">
            {data.incoming.map((item) => (
              <IncomingSharedUsageRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      <section className="mb-4">
        <SectionTitle
          eyebrow="Reservation orang lain"
          title="Available reservations"
        />
        {data.available.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Belum ada reservation yang bisa dibagi"
              detail="Shared usage butuh reservation milik user lain yang sudah disetujui. Cek lagi setelah ada jadwal lain."
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
        <SectionTitle
          eyebrow="My requests"
          title="Outgoing shared usage"
          action={
            <span className="text-[11px] font-semibold text-[#6B6B6B]">
              {data.outgoing.length} request
            </span>
          }
        />
        {data.outgoing.length === 0 ? (
          <p className="mt-4 text-[12px] text-[#6B6B6B]">
            Kamu belum pernah mengirim shared usage request.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#EEEEEE]">
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
            <p className="text-[13px] font-bold text-[#212121]">
              {item.requesterName} · {item.unitCode}
            </p>
            <p className="mt-1 text-[11px] text-[#6B6B6B]">
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
              <p className="mt-1 text-[11px] text-[#6B6B6B]">{item.purpose}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void respond("accept")}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#048444] px-4 text-[11px] font-bold text-white disabled:opacity-70"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void respond("decline")}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[11px] font-bold text-[#9E3636] disabled:opacity-70"
          >
            Decline
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
          <p className="text-[12px] font-semibold text-[#212121]">
            {item.unitCode} · {item.roomName}
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B]">
            {new Date(item.startAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            –{" "}
            {new Date(item.endAt).toLocaleTimeString("id-ID", {
              timeStyle: "short",
            })}{" "}
            · {item.primaryUserName}
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
            className="inline-flex min-h-10 items-center rounded-xl border border-[#E1E1E1] px-3 text-[11px] font-bold text-[#9E3636] disabled:opacity-60"
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
        title="Report incident"
        eyebrow="Safety & support"
        userName={userName}
        activeKey="incidents"
        catalog={catalog}
      >
        <BackLink href="/student/incidents" />
        <div className="dashboard-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#03683A]">
            Incident tercatat
          </p>
          <h2 className="mt-2 text-[20px] font-bold">{submitted}</h2>
          <p className="mt-2 max-w-[560px] text-[12px] leading-5 text-[#6B6B6B]">
            Status equipment tidak otomatis berubah. PLP akan melakukan
            assessment dan mencatat hasilnya di timeline incident.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/student/incidents"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#212121] px-4 text-[12px] font-bold text-white"
            >
              Lihat daftar incident
            </Link>
            <Link
              href="/student"
              className="inline-flex min-h-11 items-center rounded-xl border border-[#E1E1E1] px-4 text-[12px] font-bold"
            >
              Kembali ke dashboard
            </Link>
          </div>
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell
      title="Report incident"
      eyebrow="Safety & support"
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
          <SectionTitle eyebrow="New incident" title="What happened?" />
          <p className="mt-2 text-[12px] leading-5 text-[#6B6B6B]">
            Your report will be reviewed by an authorized lab coordinator. A
            student report does not automatically mark equipment as damaged.
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
            <label className="block text-[12px] font-semibold">
              Equipment
              <select
                value={equipmentCode}
                onChange={(event) => setEquipmentCode(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] outline-none focus:border-[#6E8EDA]"
              >
                <option value="">Tidak ada equipment tertentu</option>
                {catalog.equipment.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.id} · {asset.name} ({asset.room})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] font-semibold">
              Room
              <select
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] outline-none focus:border-[#6E8EDA]"
              >
                <option value="">Ikuti lokasi equipment</option>
                {catalog.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] font-semibold">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
                placeholder={selectedAsset ? `${selectedAsset.name} issue` : "Apa yang terjadi"}
                className="mt-2 h-11 w-full rounded-xl border border-[#E1E1E1] px-3 text-[12px] outline-none focus:border-[#6E8EDA]"
              />
            </label>
            <label className="block text-[12px] font-semibold">
              Severity
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] outline-none focus:border-[#6E8EDA]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
            <label className="block text-[12px] font-semibold">
              When did it happen?
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#E1E1E1] px-3 text-[12px] outline-none focus:border-[#6E8EDA]"
              />
            </label>
            <label className="block text-[12px] font-semibold">
              What happened?
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={10}
                rows={5}
                className="mt-2 w-full rounded-xl border border-[#E1E1E1] p-3 text-[12px] outline-none focus:border-[#6E8EDA]"
                placeholder="Describe the issue, observed behavior, and any immediate safety action."
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-6 min-h-11 rounded-xl bg-[#F45959] px-4 text-[12px] font-bold text-white disabled:opacity-70"
          >
            {pending ? "Memproses..." : "Submit incident"}
          </button>
        </form>
        <aside className="dashboard-card h-fit p-5 sm:p-6">
          <SectionTitle
            eyebrow="Safety note"
            title="If there is immediate danger"
          />
          <p className="mt-3 text-[12px] leading-5 text-[#6B6B6B]">
            Stop using the equipment, notify the lab staff nearby, and follow
            the room&apos;s posted safety procedure.
          </p>
          <div className="mt-5 flex gap-2 rounded-xl bg-[#FDE9E9] p-3 text-[11px] leading-5 text-[#9E3636]">
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            Critical safety information stays visible on the page, not only in a
            toast.
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
      label: "Reported",
      detail: `${incident.reporterName} · ${new Date(
        incident.createdAt,
      ).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`,
      tone: "done" as const,
    },
    ...(incident.assessment
      ? [
          {
            label: "Assessment",
            detail: `${incident.assessment.assessment} · ${incident.assessment.assessedByName}`,
            tone: "done" as const,
          },
        ]
      : []),
    ...(incident.resolution
      ? [
          {
            label: "Resolved",
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
            label: "Resolution",
            detail:
              incident.status === "REPORTED"
                ? "Menunggu assessment PLP"
                : "Sedang ditindaklanjuti",
            tone: "current" as const,
          },
        ]),
  ];
  return (
    <FlowShell
      title={incident.code}
      eyebrow="Incident detail"
      userName={userName}
      activeKey="incidents"
      catalog={catalog}
    >
      <BackLink href="/student/incidents" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <section className="dashboard-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
                Incident report
              </p>
              <h2 className="mt-2 text-[26px] font-bold tracking-[-0.04em] text-[#212121]">
                {incident.title}
              </h2>
              <p className="mt-2 text-[12px] text-[#6B6B6B]">
                {incident.code} · reported by {incident.reporterName}
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
              {incident.status.replaceAll("_", " ")}
            </StatusBadge>
          </div>
          <p className="mt-6 text-[13px] leading-6 text-[#6B6B6B]">
            {incident.description}
          </p>
          {incident.assessment && (
            <div className="mt-6 rounded-xl bg-[#F5F5F5] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#929292]">
                Assessment
              </p>
              <p className="mt-2 text-[12px] font-semibold">
                {incident.assessment.finding}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#6B6B6B]">
                {incident.assessment.assessment}
              </p>
              {incident.assessment.recommendedAction && (
                <p className="mt-2 text-[11px] text-[#6B6B6B]">
                  Next action: {incident.assessment.recommendedAction}
                </p>
              )}
            </div>
          )}
          <div className="mt-6 border-t border-[#EEEEEE] pt-5">
            <SectionTitle
              eyebrow="Accountability"
              title="Resolution timeline"
            />
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
                    <p className="text-[12px] font-semibold">{step.label}</p>
                    <p className="mt-1 text-[11px] text-[#6B6B6B]">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="dashboard-card h-fit p-5 sm:p-6">
          <SectionTitle
            eyebrow="Resource context"
            title={incident.equipmentName ?? incident.roomName ?? "Resource"}
          />
          <p className="mt-2 text-[12px] text-[#6B6B6B]">
            {[incident.equipmentCode, incident.roomName]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {incident.equipmentCode && (
            <Link
              href={`/student/laboratory/equipment/${incident.equipmentCode}`}
              className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] text-[12px] font-bold"
            >
              View equipment
            </Link>
          )}
          <Link
            href="/student/incidents/new"
            className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-[#212121] text-[12px] font-bold text-white"
          >
            Report another issue
          </Link>
          <div className="mt-5 flex gap-2 rounded-xl bg-[#FFF4D9] p-3 text-[11px] leading-5 text-[#705012]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Report mahasiswa tidak mengubah status equipment. Perubahan status
            hanya lewat assessment atau inspeksi PLP.
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
