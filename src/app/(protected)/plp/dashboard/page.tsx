import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AlertCircle, CalendarClock, PackageCheck, Undo2 } from "lucide-react";
import { QuickIncidentDialog } from "@/components/plp/quick-incident-dialog";
import {
  ChartEmpty,
  ChartLink,
  ChartPanel,
  HorizontalBarChart,
  RangeSwitcher,
  StackedBarChart,
  type ChartTone,
} from "@/components/charts";
import { MaintenancePing } from "@/components/plp/maintenance-ping";
import { MaintenanceUnitsPanel } from "@/components/maintenance-units-panel";
import {
  EmptyState,
  PageHeader,
  Panel,
  RequestStatusBadge,
  StatCard,
  formatDateTime,
  formatRange,
} from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import {
  getMaterialRiskByRoom,
  getRequestTrend,
  type RequestTrendRange,
} from "@/services/analytics.service";
import { getPlpDashboard } from "@/services/plp.service";

export const metadata: Metadata = { title: "PLP Dashboard" };

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

export default async function PlpDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);
  const params = await searchParams;
  const requested = Number(pick(params, "trend"));
  const trendDays: RequestTrendRange =
    requested === 7 || requested === 30 || requested === 90 ? requested : 30;
  const [data, trend, risk] = await Promise.all([
    getPlpDashboard(user.id, roomCodes),
    getRequestTrend({ days: trendDays }),
    getMaterialRiskByRoom(),
  ]);
  const riskRows = risk.rows.filter(
    (row) =>
      row.risk > 0 &&
      (roomCodes === null || roomCodes.includes(row.roomCode)),
  );
  const hasRisk = riskRows.length > 0;

  const urgentOverdue = data.returnQueue.filter(
    (r) => r.status === "OVERDUE" || r.overdue,
  );
  const criticalIncidents = data.incidents.filter(
    (i) => i.severity === "HIGH" || i.severity === "CRITICAL",
  );
  const urgentAlertsCount = urgentOverdue.length + criticalIncidents.length;

  return (
    <>
      <MaintenancePing />
      <PageHeader
        eyebrow="Triage"
        title={`Selamat bekerja, ${user.name.split(" ")[0]}`}
        description="Antrian yang perlu ditinjau hari ini, plus kondisi stok dan incident yang terbuka."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QuickIncidentDialog triggerLabel="Lapor Insiden" triggerVariant="outline" />
            <Link
              href="/plp/schedule?view=runsheet"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3.5 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              <CalendarClock className="size-4 text-[#929292]" />
              Run Sheet Hari Ini
            </Link>
          </div>
        }
      />

      {urgentAlertsCount > 0 && (
        <div className="mb-5 rounded-2xl border border-[#F45959]/30 bg-[#FDE9E9]/40 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#9E3636]" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="text-[13px] font-bold text-[#9E3636]">
                Perhatian Mendesak ({urgentAlertsCount} kendala operasional)
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#6B6B6B]">
                {urgentOverdue.length > 0 && (
                  <Link
                    href="/plp/fulfillment/return"
                    className="font-medium text-[#9E3636] hover:underline"
                  >
                    • {urgentOverdue.length} pengembalian alat melewati tenggat waktu (Overdue)
                  </Link>
                )}
                {criticalIncidents.length > 0 && (
                  <Link
                    href="/plp/incidents"
                    className="font-medium text-[#9E3636] hover:underline"
                  >
                    • {criticalIncidents.length} insiden berkategori HIGH/CRITICAL perlu ditinjau
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Menunggu review"
          value={data.counts.pending}
          detail="Request mahasiswa"
          href="/plp/requests?status=PENDING_PLP"
          tone="blue"
        />
        <StatCard
          label="Siap di-issue"
          value={data.counts.issueDue}
          detail="Approved / siap diambil"
          href="/plp/fulfillment/issue"
          tone="yellow"
        />
        <StatCard
          label="Perlu return"
          value={data.counts.returnDue}
          detail="Aktif, overdue, inspeksi"
          href="/plp/fulfillment/return"
          tone="rose"
        />
        <StatCard
          label="Unit maintenance"
          value={data.counts.maintenance ?? 0}
          detail="Perlu perbaikan"
          href="/plp/inventory/equipment?status=MAINTENANCE"
          tone="yellow"
        />
        <StatCard
          label="Stok menipis"
          value={data.counts.lowStock}
          detail="Di bawah ambang"
          href="/plp/inventory/materials?stock=low"
          tone="yellow"
        />
        <StatCard
          label="Incident terbuka"
          value={data.counts.openIncidents}
          detail="Belum resolved"
          href="/plp/incidents"
          tone="rose"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <ChartPanel
          context="Volume"
          title="Tren request per periode"
          range={`${trend.range.label} · ${trend.total} request`}
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
          footnote={
            <>
              Angka dihitung dari request yang disubmit. Klik bar untuk membuka
              daftar request pada periode itu di{" "}
              <ChartLink href="/plp/requests">request review</ChartLink>.
            </>
          }
        >
          {trend.total === 0 ? (
            <ChartEmpty
              title="Belum ada request pada rentang ini"
              description="Request yang disubmit akan muncul di sini dan bisa diklik menuju daftar terfilter."
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
          context="Risiko stok"
          title="Material berisiko per room"
          range={`Low stock dan batch expiry dalam ${risk.thresholdDays} hari`}
          legend={[
            { label: "Material low stock", tone: "yellow" },
            { label: "Batch terlewat expiry", tone: "rose" },
            { label: "Batch segera expiry", tone: "amber" },
          ]}
          footnote={
            <>
              Satu material bisa terhitung di beberapa room bila batchnya
              tersebar. Buka{" "}
              <ChartLink href="/plp/inventory/materials?stock=low">
                material menipis
              </ChartLink>{" "}
              untuk tindak lanjut.
            </>
          }
        >
          {!hasRisk ? (
            <ChartEmpty
              title="Tidak ada risiko stok"
              description="Tidak ada material low stock atau batch mendekati expiry saat ini."
            />
          ) : (
            <HorizontalBarChart
              rows={riskRows.map((row) => ({
                key: row.roomId,
                label: row.roomName,
                sublabel: `${row.lowStockMaterials} material low stock · ${row.expiredBatches} batch terlewat · ${row.expiringBatches} batch segera`,
                value: row.risk,
                tone: (row.expiredBatches > 0 ? "rose" : "yellow") as ChartTone,
                href: `/plp/inventory/materials?room=${row.roomCode}&stock=low`,
                detail: `${row.totalBatches} batch aktif di room ini`,
              }))}
              unit="item"
            />
          )}
        </ChartPanel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <Panel
            context="Prioritas"
            title="Request menunggu review"
            action={
              <Link
                href="/plp/requests?status=PENDING_PLP"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Semua request <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          >
            {data.pending.length === 0 ? (
              <EmptyState
                title="Tidak ada request menunggu"
                description="Antrian review bersih. Request baru akan muncul di sini dengan konflik dan stok sebagai peringatan."
              />
            ) : (
              <ul className="divide-y divide-[#EEEEEE]">
                {data.pending.map((request) => (
                  <li key={request.id}>
                    <Link
                      href={`/plp/requests/${request.id}`}
                      className="flex flex-col gap-2 py-3 transition first:pt-0 hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#212121]">
                          {request.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
                          {request.actorName} · {request.activityTitle}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                          {request.code} · {request.roomName} ·{" "}
                          {formatRange(request.startAt, request.endAt)}
                        </p>
                      </div>
                      <RequestStatusBadge status={request.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              context="Hari ini"
              title="Issue queue"
              action={
                <Link
                  href="/plp/fulfillment/issue"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  Buka <PackageCheck className="size-4" aria-hidden="true" />
                </Link>
              }
            >
              {data.issueQueue.length === 0 ? (
                <EmptyState
                  title="Tidak ada issue hari ini"
                  description="Request yang sudah approved dan siap diserahkan akan muncul di sini."
                />
              ) : (
                <ul className="space-y-2">
                  {data.issueQueue.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-xl border border-[#EEEEEE] px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-[#212121]">
                          {request.code} · {request.actorName}
                        </p>
                        <RequestStatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[#6B6B6B]">
                        {request.roomName} ·{" "}
                        {formatDateTime(request.startAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              context="Hari ini"
              title="Return & inspeksi"
              action={
                <Link
                  href="/plp/fulfillment/return"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  Buka <Undo2 className="size-4" aria-hidden="true" />
                </Link>
              }
            >
              {data.returnQueue.length === 0 ? (
                <EmptyState
                  title="Tidak ada pengembalian"
                  description="Equipment yang sedang dipakai atau menunggu inspeksi akan muncul di sini."
                />
              ) : (
                <ul className="space-y-2">
                  {data.returnQueue.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-xl border border-[#EEEEEE] px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-[#212121]">
                          {request.code} · {request.actorName}
                        </p>
                        <RequestStatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[#6B6B6B]">
                        {request.roomName} ·{" "}
                        {formatDateTime(request.endAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <MaintenanceUnitsPanel
            units={data.maintenanceUnits ?? []}
            canManage={true}
            viewAllHref="/plp/inventory/equipment?status=MAINTENANCE"
          />
        </div>

        <div className="space-y-5">
          <Panel
            context="7 hari"
            title="Reservasi mendatang"
            action={
              <Link
                href="/plp/schedule"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Schedule <CalendarClock className="size-4" aria-hidden="true" />
              </Link>
            }
          >
            {data.upcoming.length === 0 ? (
              <EmptyState
                title="Belum ada reservasi"
                description="Reservasi yang disetujui dalam 7 hari ke depan akan tampil di sini."
              />
            ) : (
              <ul className="space-y-2">
                {data.upcoming.map((reservation) => (
                  <li
                    key={reservation.id}
                    className="rounded-xl border border-[#EEEEEE] px-3 py-2.5"
                  >
                    <p className="text-[12px] font-semibold text-[#212121]">
                      {reservation.unitCode}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                      {reservation.primaryUserName} · {reservation.roomName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                      {formatRange(reservation.startAt, reservation.endAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            context="Stok"
            title="Material menipis"
            action={
              <Link
                href="/plp/inventory/materials?stock=low"
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Detail
              </Link>
            }
          >
            {data.lowStock.length === 0 ? (
              <EmptyState
                title="Stok aman"
                description="Tidak ada material di bawah ambang stok saat ini."
              />
            ) : (
              <ul className="space-y-2">
                {data.lowStock.map((material) => (
                  <li
                    key={material.materialId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#F2D9A4] bg-[#FFFDF7] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[#212121]">
                        {material.name}
                      </p>
                      <p className="text-[11px] text-[#6B6B6B]">
                        {material.available} {material.unit} tersedia
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#705012]">
                      {material.outOfStock ? "Habis" : "Menipis"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            context="Insiden"
            title="Incident terbuka"
            action={
              <Link
                href="/plp/incidents"
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Semua
              </Link>
            }
          >
            {data.incidents.length === 0 ? (
              <EmptyState
                title="Tidak ada incident"
                description="Laporan insiden baru akan muncul di sini untuk dinilai."
              />
            ) : (
              <ul className="space-y-2">
                {data.incidents.map((incident) => (
                  <li key={incident.id}>
                    <Link
                      href={`/plp/incidents/${incident.code}`}
                      className="block rounded-xl border border-[#EEEEEE] px-3 py-2.5 transition hover:border-[#D6C6A6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-[#212121]">
                          {incident.code}
                        </p>
                        <span className="text-[11px] font-bold text-[#9E3636]">
                          {incident.severity}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#6B6B6B]">
                        {incident.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
