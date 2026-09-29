import type { Metadata } from "next";
import Link from "next/link";
import {
  ChartEmpty,
  ChartLink,
  ChartPanel,
  RangeSwitcher,
  StackedBarChart,
} from "@/components/charts";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  formatDateTime,
} from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { getEquipmentRoomDistribution, getRequestTrend, type RequestTrendRange } from "@/services/analytics.service";
import { getAdminDashboard } from "@/services/admin.service";
import { listMaintenanceUnits } from "@/services/plp.service";
import { MaintenanceUnitsPanel } from "@/components/maintenance-units-panel";

export const metadata: Metadata = { title: "Admin Dashboard" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

const trendOptions = [
  { value: "7", label: "7 hari" },
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission({ configuration: ["manage-any"] });
  const params = await searchParams;
  const requested = Number(pick(params, "trend"));
  const trendDays: RequestTrendRange =
    requested === 7 || requested === 30 || requested === 90 ? requested : 30;
  const [data, trend, equipment, maintenanceUnits] = await Promise.all([
    getAdminDashboard(),
    getRequestTrend({ days: trendDays }),
    getEquipmentRoomDistribution(),
    listMaintenanceUnits(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Admin workspace"
        description="Kesehatan data Reaksan: akun, inventaris, expiry batch, assignment, tren request, dan audit terbaru."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Akun"
          value={data.counts.users}
          detail="Semua role"
          href="/admin/users"
          tone="blue"
        />
        <StatCard
          label="Rooms aktif"
          value={data.counts.rooms}
          detail="Laboratorium terdaftar"
          href="/admin/rooms"
          tone="green"
        />
        <StatCard
          label="Equipment asset"
          value={data.counts.assets}
          detail="Semua tipe"
          href="/admin/equipment/assets"
          tone="cream"
        />
        <StatCard
          label="Material aktif"
          value={data.counts.materials}
          detail="Dengan batch"
          href="/admin/materials"
          tone="yellow"
        />
        <StatCard
          label="Request pending"
          value={data.counts.pendingRequests}
          detail="Menunggu PLP"
          href="/plp/requests?status=PENDING_PLP"
          tone="blue"
        />
        <StatCard
          label="Incident terbuka"
          value={data.counts.openIncidents}
          detail="Belum resolved"
          href="/plp/incidents"
          tone="rose"
        />
        <StatCard
          label="Assignment aktif"
          value={data.counts.activeAssignments}
          detail="Aslab dan PIC"
          href="/admin/assignments"
          tone="green"
        />
        <StatCard
          label="Batch segera expiry"
          value={data.counts.expiringBatches}
          detail={`${data.counts.expiredBatches} batch sudah terlewat`}
          href="/plp/inventory/materials"
          tone="yellow"
        />
        <StatCard
          label="Stok menipis"
          value={data.counts.lowStockMaterials}
          detail="Di bawah ambang"
          href="/plp/inventory/materials?stock=low"
          tone="rose"
        />
        <StatCard
          label="Unit maintenance"
          value={maintenanceUnits.length}
          detail="Perlu perbaikan"
          href="/admin/equipment/units?status=MAINTENANCE"
          tone="yellow"
        />
        <StatCard
          label="Reservasi aktif"
          value={data.counts.activeReservations}
          detail="Berjalan / menunggu"
          href="/plp/schedule"
          tone="green"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <ChartPanel
          context="Beban sistem"
          title="Tren request lintas lab"
          range={`${trend.range.label} · ${trend.total} request`}
          action={
            <RangeSwitcher
              basePath="/admin/dashboard"
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
          footnote={
            <>
              Sumber data sama dengan{" "}
              <ChartLink href="/plp/requests">request review</ChartLink>. Klik bar
              untuk membuka request periode itu.
            </>
          }
        >
          {trend.total === 0 ? (
            <ChartEmpty
              title="Belum ada request pada rentang ini"
              description="Data akan muncul setelah mahasiswa mengirim request."
            />
          ) : (
            <StackedBarChart
              buckets={trend.buckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                sublabel: bucket.sublabel,
                href: bucket.href,
                segments: bucket.segments,
              }))}
              unit="request"
              ariaLabel={`Tren request ${trend.range.label}`}
            />
          )}
        </ChartPanel>

        <ChartPanel
          context="Sebaran aset"
          title="Equipment per room dan status"
          range={`${equipment.buckets.reduce(
            (sum, bucket) =>
              sum + bucket.segments.reduce((inner, segment) => inner + segment.value, 0),
            0,
          )} asset aktif`}
          legend={equipment.groups.map((group) => ({
            label: group.label,
            tone: group.tone,
          }))}
          footnote={
            <>
              Grafik menghitung asset, bukan unit. Kelola data di{" "}
              <ChartLink href="/admin/equipment/assets">
                equipment assets
              </ChartLink>
              .
            </>
          }
        >
          {equipment.buckets.length === 0 ? (
            <ChartEmpty
              title="Belum ada equipment"
              description="Tambahkan equipment asset terlebih dahulu untuk melihat sebarannya."
            />
          ) : (
            <StackedBarChart
              buckets={equipment.buckets}
              unit="asset"
              ariaLabel="Jumlah equipment per room dan status"
            />
          )}
        </ChartPanel>
      </div>

      <div className="mt-6">
        <MaintenanceUnitsPanel
          units={maintenanceUnits}
          title="Daftar unit dalam maintenance & perbaikan"
          viewAllHref="/admin/equipment/units?status=MAINTENANCE"
          canManage={true}
          endpointPrefix="/api/admin/equipment-units"
        />
      </div>

      <Panel
        context="Jejak"
        title="Aktivitas admin terakhir"
        className="mt-6"
        action={
          <Link
            href="/admin/audit-logs"
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Semua audit log
          </Link>
        }
      >
        {data.recentAudit.length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas"
            description="Perubahan master data dan akses akan tercatat di sini."
          />
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {data.recentAudit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[12px] font-semibold text-[#212121]">
                    {entry.action} · {entry.entityType}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                    {entry.actorName ?? "Sistem"}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </div>
                <p className="text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                  {formatDateTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
