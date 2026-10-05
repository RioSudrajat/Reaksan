import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  ArrowRight,
  AlertTriangle,
  QrCode,
  Clock,
  PackageCheck,
  Undo2,
  Wrench,
  FlaskConical,
} from "lucide-react";
import { QuickIncidentDialog } from "@/components/plp/quick-incident-dialog";
import {
  ChartEmpty,
  ChartPanel,
  HorizontalBarChart,
  RangeSwitcher,
  type ChartTone,
} from "@/components/charts";
import {
  InteractiveAreaRunwayChart,
  InteractiveStackedBarChart,
} from "@/components/plp/interactive-dashboard-charts";
import { MaintenancePing } from "@/components/plp/maintenance-ping";
import {
  DashboardTriageWorkboard,
  type TriageItem,
  type TriageMaintenanceUnit,
} from "@/components/plp/dashboard-triage-workboard";
import { DashboardAgendaCard } from "@/components/plp/dashboard-agenda-card";
import { UsageRankingPanel } from "@/components/plp/usage-ranking-panel";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import {
  getEquipmentRoomDistribution,
  getExpiryTrend,
  getMaterialRiskByRoom,
  getRequestTrend,
  getTopUsage,
  type RequestTrendRange,
} from "@/services/analytics.service";
import { getPlpDashboard } from "@/services/plp.service";

export const metadata: Metadata = { title: "PLP Dashboard" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

const currentMonthShort = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  month: "short",
}).format(new Date());

const trendOptions = [
  { value: "month", label: `Bulan ini (${currentMonthShort})` },
  { value: "7", label: "7 hari" },
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
];

export default async function PlpDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);
  const params = await searchParams;
  const rawTrend = pick(params, "trend");
  const trendDays: RequestTrendRange =
    rawTrend === "7"
      ? 7
      : rawTrend === "30"
        ? 30
        : rawTrend === "90"
          ? 90
          : "month";

  const isCoordinator = roomCodes === null || roomCodes.length > 1;
  const isSingleRoom = roomCodes !== null && roomCodes.length === 1;
  const isUnassigned = roomCodes !== null && roomCodes.length === 0;
  const singleRoomCode = isSingleRoom ? roomCodes[0] : undefined;

  const [data, trend, risk, equipmentDist, expiryTrend, topUsage] = await Promise.all([
    getPlpDashboard(user.id, roomCodes),
    getRequestTrend({ days: trendDays, roomCodes }),
    getMaterialRiskByRoom(roomCodes),
    getEquipmentRoomDistribution(roomCodes),
    getExpiryTrend(8, roomCodes),
    getTopUsage({ days: 30, roomCodes }),
  ]);

  // Waktu & Tanggal Live WIB
  const now = new Date();
  const liveDateStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const liveTimeStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  // Urgent operational alerts (Operational Blocker Strip)
  const urgentOverdue = data.returnQueue.filter(
    (r) => r.status === "OVERDUE" || r.overdue,
  );
  const criticalIncidents = data.incidents.filter(
    (i) => i.severity === "HIGH" || i.severity === "CRITICAL",
  );
  const urgentAlertsCount = urgentOverdue.length + criticalIncidents.length;

  // Equipment Fleet Readiness calculation
  const totalAvailable = equipmentDist.buckets.reduce(
    (sum, b) =>
      sum + (b.segments.find((s) => s.key === "available")?.value ?? 0),
    0,
  );
  const totalReserved = equipmentDist.buckets.reduce(
    (sum, b) =>
      sum + (b.segments.find((s) => s.key === "reserved")?.value ?? 0),
    0,
  );
  const totalAttention = equipmentDist.buckets.reduce(
    (sum, b) =>
      sum + (b.segments.find((s) => s.key === "attention")?.value ?? 0),
    0,
  );
  const totalRetired = equipmentDist.buckets.reduce(
    (sum, b) =>
      sum + (b.segments.find((s) => s.key === "retired")?.value ?? 0),
    0,
  );
  const grandTotalEquipment =
    totalAvailable + totalReserved + totalAttention + totalRetired;
  const operationalTotal = totalAvailable + totalReserved + totalAttention;
  const readinessPercentage =
    operationalTotal > 0
      ? (totalAvailable / operationalTotal) * 100
      : grandTotalEquipment > 0
        ? (totalAvailable / grandTotalEquipment) * 100
        : 100;

  // Total expired and expiring batches across all scoped rooms
  const totalExpiredBatches = risk.rows.reduce(
    (sum, r) => sum + r.expiredBatches,
    0,
  );
  const totalExpiringBatches = risk.rows.reduce(
    (sum, r) => sum + r.expiringBatches,
    0,
  );

  // Reagent 8-Week Runway Data
  const runwayBuckets = expiryTrend.buckets.map((b) => ({
    key: b.key,
    label: b.label,
    sublabel: b.sublabel,
    value: b.segments.reduce((acc, s) => acc + s.value, 0),
    tone: "yellow" as ChartTone,
    href: b.href,
  }));

  // Contextualization for Room Risk Profile
  const singleRoomRisk = risk.rows[0];
  const assignedRoomName =
    singleRoomRisk?.roomName ||
    data.lowStock[0]?.roomName ||
    singleRoomCode ||
    "Laboratorium Penugasan";

  const coordinatorRiskRows = risk.rows.map((row) => ({
    key: row.roomId,
    label: row.roomName,
    sublabel: `${row.lowStockMaterials} material low stock · ${row.expiredBatches} batch terlewat · ${row.expiringBatches} batch segera`,
    value: row.risk,
    tone: (row.expiredBatches > 0 ? "dark" : "yellow") as ChartTone,
    href: `/plp/inventory/materials?room=${encodeURIComponent(row.roomCode)}&stock=low`,
    detail: `${row.totalBatches} batch aktif di room ini`,
  }));

  // Format Triage Workboard Items (Review, Issue, Return, Maintenance)
  const pendingTriageList: TriageItem[] = data.pending.map((req) => ({
    id: req.id,
    code: req.code,
    title: req.title,
    actorName: req.actorName,
    activityTitle: req.activityTitle,
    roomName: req.roomName,
    startAt: req.startAt,
    endAt: req.endAt,
    status: req.status,
  }));

  const issueTriageList: TriageItem[] = data.issueQueue.map((req) => ({
    id: req.id,
    code: req.code,
    title: req.title,
    actorName: req.actorName,
    activityTitle: req.activityTitle,
    roomName: req.roomName,
    startAt: req.startAt,
    status: req.status,
  }));

  const returnTriageList: TriageItem[] = data.returnQueue.map((req) => ({
    id: req.id,
    code: req.code,
    title: req.title,
    actorName: req.actorName,
    activityTitle: req.activityTitle,
    roomName: req.roomName,
    startAt: req.startAt,
    endAt: req.endAt,
    status: req.status,
    overdue: req.status === "OVERDUE" || req.overdue,
  }));

  const maintenanceSideRailList: TriageMaintenanceUnit[] = (
    data.maintenanceUnits ?? []
  ).map((u) => ({
    id: u.id,
    code: u.code,
    label: u.label,
    status: u.status,
    condition: u.condition,
    notes: u.notes,
    assetName: u.assetName,
    assetCode: u.assetCode,
  }));

  return (
    <>
      <MaintenancePing />

      {/* 1. Header & Konteks Lab */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E1E1E1] pb-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-[20px] font-bold tracking-tight text-[#212121]">
              Selamat bertugas, {user.name.split(" ")[0]}
            </h1>
            {isCoordinator && (
              <span className="text-[13px] font-medium text-[#64748B]">
                — Koordinator Laboratorium · Supervisi Seluruh Lab
              </span>
            )}
            {isSingleRoom && (
              <span className="text-[13px] font-medium text-[#64748B]">
                — Penanggung Jawab: {assignedRoomName} ({singleRoomCode})
              </span>
            )}
            {isUnassigned && (
              <span className="text-[13px] font-medium text-[#DC2626]">
                — Belum Ditugaskan ke Ruangan Lab
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-[#6B6B6B]">
            {liveDateStr} · <span className="font-semibold text-[#212121]">{liveTimeStr} WIB</span> · Pusat triage operasional, logistik peminjaman, dan kendali keselamatan laboratorium.
          </p>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/plp/fulfillment"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] font-semibold text-[#212121] transition hover:bg-[#F5F5F5] hover:border-[#F9B129] hover:text-[#AE7C1D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            <QrCode className="size-4 text-[#6B6B6B]" />
            Scan QR
          </Link>

          <Link
            href="/plp/schedule?view=runsheet"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] font-semibold text-[#212121] transition hover:bg-[#F5F5F5] hover:border-[#F9B129] hover:text-[#AE7C1D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            <CalendarClock className="size-4 text-[#6B6B6B]" />
            Run Sheet Hari Ini
          </Link>

          <QuickIncidentDialog triggerLabel="Lapor Insiden" triggerVariant="outline" />
        </div>
      </div>

      {/* 2. Operational Alert Bar (if urgentAlertsCount > 0, clean card without neon red fill) */}
      {urgentAlertsCount > 0 && (
        <div className="mt-3.5 rounded-2xl border border-[#E1E1E1] bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#991B1B] border border-[#E1E1E1]">
              <AlertTriangle className="size-4 text-[#F45959]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-[#212121]">
                  Kendala Operasional Memerlukan Tindakan ({urgentAlertsCount} Isu)
                </p>
                <span className="text-[10px] font-bold text-[#991B1B] bg-white px-2 py-0.5 rounded-md border border-[#F45959]/30">
                  Prioritas Hari Ini
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                {urgentOverdue.length > 0 && (
                  <Link
                    href="/plp/fulfillment/return"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-white px-3 py-1 font-semibold text-[#991B1B] shadow-2xs transition hover:border-[#F45959]/60 hover:bg-[#F5F5F5]"
                  >
                    <span>{urgentOverdue.length} pengembalian melewati batas waktu</span>
                    <ArrowRight className="size-3 text-[#F45959]" />
                  </Link>
                )}
                {criticalIncidents.length > 0 && (
                  <Link
                    href="/plp/incidents"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-white px-3 py-1 font-semibold text-[#991B1B] shadow-2xs transition hover:border-[#F45959]/60 hover:bg-[#F5F5F5]"
                  >
                    <span>{criticalIncidents.length} insiden kategori tinggi perlu ditinjau</span>
                    <ArrowRight className="size-3 text-[#F45959]" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. KPI Metrics Summary Strip (Compact 5-cell layout, ~84px tall) */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* Metric 1: Permohonan Review */}
        <Link
          href="/plp/requests?status=PENDING_PLP"
          className="group rounded-xl border border-[#E1E1E1] bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/20"
        >
          <div className="flex items-center justify-between text-[#6B6B6B] group-hover:text-[#AE7C1D]">
            <span className="text-[11px] font-semibold">Review Masuk</span>
            <Clock className="size-3.5" />
          </div>
          <p className="mt-1.5 text-[22px] font-bold tracking-tight text-[#212121] tabular-nums leading-none">
            {data.counts.pending}
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B] truncate">
            Permohonan butuh verifikasi
          </p>
        </Link>

        {/* Metric 2: Serah-Terima Hari Ini */}
        <Link
          href="/plp/fulfillment/issue"
          className="group rounded-xl border border-[#E1E1E1] bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/20"
        >
          <div className="flex items-center justify-between text-[#6B6B6B] group-hover:text-[#AE7C1D]">
            <span className="text-[11px] font-semibold">Serah-Terima</span>
            <PackageCheck className="size-3.5" />
          </div>
          <p className="mt-1.5 text-[22px] font-bold tracking-tight text-[#212121] tabular-nums leading-none">
            {data.counts.issueDue}
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B] truncate">
            Siap diserahkan hari ini
          </p>
        </Link>

        {/* Metric 3: Pengembalian Hari Ini */}
        <Link
          href="/plp/fulfillment/return"
          className="group rounded-xl border border-[#E1E1E1] bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/20"
        >
          <div className="flex items-center justify-between text-[#6B6B6B] group-hover:text-[#AE7C1D]">
            <span className="text-[11px] font-semibold">Pengembalian</span>
            <Undo2 className="size-3.5" />
          </div>
          <p className="mt-1.5 text-[22px] font-bold tracking-tight text-[#212121] tabular-nums leading-none">
            {data.counts.returnDue}
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B] truncate">
            {urgentOverdue.length > 0 ? (
              <span className="font-semibold text-[#991B1B]">{urgentOverdue.length} terlambat</span>
            ) : (
              "Jadwal kembali hari ini"
            )}
          </p>
        </Link>

        {/* Metric 4: Unit Perlu Servis */}
        <Link
          href="/plp/inventory/equipment?status=MAINTENANCE"
          className="group rounded-xl border border-[#E1E1E1] bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/20"
        >
          <div className="flex items-center justify-between text-[#6B6B6B] group-hover:text-[#AE7C1D]">
            <span className="text-[11px] font-semibold">Perlu Servis</span>
            <Wrench className="size-3.5" />
          </div>
          <p className="mt-1.5 text-[22px] font-bold tracking-tight text-[#212121] tabular-nums leading-none">
            {data.counts.maintenance ?? 0}{" "}
            <span className="text-[11px] font-normal text-[#6B6B6B]">unit</span>
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B] truncate">
            {Math.round(readinessPercentage)}% armada siap pakai
          </p>
        </Link>

        {/* Metric 5: Bahan Menipis / Kritis */}
        <Link
          href="/plp/inventory/materials?stock=low"
          className="group rounded-xl border border-[#E1E1E1] bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/20 col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-[#6B6B6B] group-hover:text-[#AE7C1D]">
            <span className="text-[11px] font-semibold">Bahan Menipis</span>
            <FlaskConical className="size-3.5" />
          </div>
          <p className="mt-1.5 text-[22px] font-bold tracking-tight text-[#212121] tabular-nums leading-none">
            {data.counts.lowStock}{" "}
            <span className="text-[11px] font-normal text-[#6B6B6B]">item</span>
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B] truncate">
            {totalExpiredBatches > 0 ? (
              <span className="font-semibold text-[#991B1B]">{totalExpiredBatches} batch kedaluwarsa</span>
            ) : totalExpiringBatches > 0 ? (
              <span>{totalExpiringBatches} batch segera habis</span>
            ) : (
              "Stok reagen aman"
            )}
          </p>
        </Link>
      </div>

      {/* 4. TREN DINAMIKA PERMINTAAN LAB (DIRECTLY UNDER KPI, FULL WIDTH, VISIBLE ABOVE FOLD) */}
      <div className="mt-5">
        <ChartPanel
          title="Tren Dinamika Permintaan Lab"
          range={`${trend.range.label} · ${trend.total} permohonan`}
          action={
            <RangeSwitcher
              basePath="/plp/dashboard"
              param="trend"
              value={String(trendDays)}
              options={trendOptions}
              ariaLabel="Pilih rentang tren request"
            />
          }
          legend={trend.groups.map((group) => ({
            label: group.label,
            tone: group.tone,
          }))}
        >
          {trend.total === 0 ? (
            <ChartEmpty
              title="Belum Ada Permohonan pada Periode Ini"
              description="Permohonan praktikum dan penelitian yang disubmit oleh mahasiswa akan otomatis terpetakan pada grafik ini."
            />
          ) : (
            <InteractiveStackedBarChart
              buckets={trend.buckets.map((b) => ({
                key: b.key,
                label: b.label,
                sublabel: b.sublabel,
                href: b.href,
                segments: b.segments,
              }))}
              unit="request"
              ariaLabel={`Tren request ${trend.range.label}`}
            />
          )}
        </ChartPanel>
      </div>

      {/* 5. VISUALISASI DATA: PALING SERING DIGUNAKAN (INSTRUMEN, ALAT, BAHAN) */}
      <div className="mt-5">
        <UsageRankingPanel
          data={topUsage}
          singleRoomCode={singleRoomCode}
        />
      </div>

      {/* 6. TRIAGE WORKBOARD (4 TABS TERPADU) & AGENDA 48 JAM */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1.1fr)]">
        {/* Kolom Kiri: Triage Workboard (Review, Issue, Return, Servis) */}
        <div>
          <DashboardTriageWorkboard
            pendingList={pendingTriageList}
            pendingCount={data.counts.pending}
            issueList={issueTriageList}
            issueCount={data.counts.issueDue}
            returnList={returnTriageList}
            returnCount={data.counts.returnDue}
            maintenanceList={maintenanceSideRailList}
            maintenanceCount={data.counts.maintenance}
            singleRoomCode={singleRoomCode}
          />
        </div>

        {/* Kolom Kanan: Agenda Praktikum & Riset 48 Jam */}
        <div>
          <DashboardAgendaCard upcomingReservations={data.upcoming} />
        </div>
      </div>

      {/* 7. PEMANTAUAN RISIKO & KEDALUWARSA BAHAN */}
      <div className="mt-6 mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1.1fr)]">
        {/* 8-Week Reagent Expiry Runway */}
        <ChartPanel
          title="8-Week Reagent Expiry Runway"
          range="Proyeksi kedaluwarsa batch bahan kimia 2 bulan ke depan"
        >
          <InteractiveAreaRunwayChart
            buckets={runwayBuckets}
            overdueCount={expiryTrend.overdue}
            overdueHref={`/plp/inventory/materials?expiry=expired${singleRoomCode ? `&room=${encodeURIComponent(singleRoomCode)}` : ""}`}
            ariaLabel="Proyeksi kedaluwarsa batch bahan kimia 8 pekan ke depan"
          />
        </ChartPanel>

        {/* Matriks Risiko Ruangan (Koordinator vs Single Room) */}
        {isCoordinator ? (
          <ChartPanel
            title="Sebaran Beban Risiko Antar-Ruang Lab"
            range="Perbandingan isu stok & expiry di seluruh laboratorium"
            legend={[
              { label: "Material Low Stock", tone: "yellow" },
              { label: "Batch Expired / Kritis", tone: "dark" },
            ]}
          >
            {coordinatorRiskRows.length === 0 ? (
              <ChartEmpty
                title="Semua Laboratorium Aman"
                description="Tidak ada material low stock atau batch mendekati expiry di seluruh laboratorium saat ini."
              />
            ) : (
              <HorizontalBarChart
                rows={coordinatorRiskRows}
                unit="isu"
              />
            )}
          </ChartPanel>
        ) : (
          <ChartPanel
            title={`Kondisi Risiko & Inventaris · ${assignedRoomName}`}
            range="Monitoring kesehatan stok & alat di laboratorium Anda"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/plp/inventory/materials?room=${encodeURIComponent(singleRoomCode ?? "")}&expiry=expired`}
                  className="rounded-xl border border-[#E1E1E1] bg-[#F5F5F5] p-3 transition hover:border-[#F45959]/50"
                >
                  <p className="text-[11px] font-semibold text-[#6B6B6B]">Batch Expired</p>
                  <p className="mt-1 text-[18px] font-bold text-[#991B1B] tabular-nums">
                    {singleRoomRisk?.expiredBatches ?? 0}
                  </p>
                </Link>

                <Link
                  href={`/plp/inventory/materials?room=${encodeURIComponent(singleRoomCode ?? "")}&expiry=soon`}
                  className="rounded-xl border border-[#E1E1E1] bg-[#F5F5F5] p-3 transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/30"
                >
                  <p className="text-[11px] font-semibold text-[#6B6B6B]">Segera Expired</p>
                  <p className="mt-1 text-[18px] font-bold text-[#AE7C1D] tabular-nums">
                    {singleRoomRisk?.expiringBatches ?? 0}
                  </p>
                </Link>

                <Link
                  href={`/plp/inventory/materials?room=${encodeURIComponent(singleRoomCode ?? "")}&stock=low`}
                  className="rounded-xl border border-[#E1E1E1] bg-[#F5F5F5] p-3 transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/30"
                >
                  <p className="text-[11px] font-semibold text-[#6B6B6B]">Low Stock</p>
                  <p className="mt-1 text-[18px] font-bold text-[#212121] tabular-nums">
                    {singleRoomRisk?.lowStockMaterials ?? 0}
                  </p>
                </Link>

                <Link
                  href={`/plp/inventory/equipment?room=${encodeURIComponent(singleRoomCode ?? "")}&status=MAINTENANCE`}
                  className="rounded-xl border border-[#E1E1E1] bg-[#F5F5F5] p-3 transition hover:border-[#F9B129] hover:bg-[#FEF1CC]/30"
                >
                  <p className="text-[11px] font-semibold text-[#6B6B6B]">Alat Servis</p>
                  <p className="mt-1 text-[18px] font-bold text-[#212121] tabular-nums">
                    {totalAttention}
                  </p>
                </Link>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#6B6B6B] mb-2">
                  Bahan Mendekati / di Bawah Batas Minimum
                </p>
                {data.lowStock.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E1E1E1] p-3 text-center text-[12px] text-[#6B6B6B]">
                    Semua stok bahan di ruangan ini memenuhi batas minimum cadangan.
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {data.lowStock.slice(0, 4).map((mat) => (
                      <li
                        key={mat.materialId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#E1E1E1] bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#212121]">
                            {mat.name}
                          </p>
                          <p className="text-[11px] text-[#6B6B6B]">
                            Tersedia: <strong>{mat.available} {mat.unit}</strong>
                            {mat.minimum !== null && ` (Min: ${mat.minimum} ${mat.unit})`}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#E1E1E1] bg-[#F5F5F5] text-[#212121]">
                          {mat.outOfStock ? "HABIS" : "MENIPIS"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </ChartPanel>
        )}
      </div>
    </>
  );
}
