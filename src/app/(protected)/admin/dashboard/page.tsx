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
import { getRequestTrend, type RequestTrendRange } from "@/services/analytics.service";
import { getAdminDashboard } from "@/services/admin.service";

export const metadata: Metadata = { title: "Dashboard Administrator · Reaksan" };

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

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission({ configuration: ["manage-any"] });
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
  const [data, trend] = await Promise.all([
    getAdminDashboard(),
    getRequestTrend({ days: trendDays }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Kendali Sistem"
        title="Dashboard Administrator"
        description="Ringkasan kesehatan ekosistem Reaksan Unpad: tata kelola akun pengguna, master laboratorium & ruangan, penugasan PLP, agenda sesi, serta audit aktivitas sistem."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Akun Pengguna"
          value={data.counts.users}
          detail="Mahasiswa, PLP & Admin"
          href="/admin/users"
          tone="blue"
        />
        <StatCard
          label="Laboratorium"
          value={data.counts.laboratories}
          detail="Bidang keilmuan kimia"
          href="/admin/laboratories"
          tone="yellow"
        />
        <StatCard
          label="Ruangan Lab Aktif"
          value={data.counts.rooms}
          detail="Ruang riset & praktikum"
          href="/admin/rooms"
          tone="green"
        />
        <StatCard
          label="Penugasan PLP"
          value={data.counts.activeAssignments}
          detail="Laboran & penanggung jawab"
          href="/admin/assignments"
          tone="cream"
        />
        <StatCard
          label="Pengajuan Sesi"
          value={data.counts.pendingRequests}
          detail="Menunggu tindakan PLP"
          href="/admin/schedule"
          tone="blue"
        />
        <StatCard
          label="Reservasi Berjalan"
          value={data.counts.activeReservations}
          detail="Sesi lab terjadwal aktif"
          href="/admin/schedule"
          tone="green"
        />
        <StatCard
          label="Laporan Kendala"
          value={data.counts.openIncidents}
          detail="Insiden belum selesai"
          href="/admin/schedule"
          tone="rose"
        />
        <StatCard
          label="Konfigurasi Sistem"
          value={data.counts.configuredSettings}
          detail="Parameter operasional"
          href="/admin/configuration"
          tone="cream"
        />
      </div>

      <div className="mt-6">
        <ChartPanel
          context="Beban Sistem"
          title="Tren Pengajuan Sesi Lintas Lab"
          range={`${trend.range.label} · ${trend.total} pengajuan`}
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
              Data diagregasikan dari seluruh jadwal laboratorium. Buka{" "}
              <ChartLink href="/admin/schedule">jadwal & agenda</ChartLink> untuk detail operasional.
            </>
          }
        >
          {trend.total === 0 ? (
            <ChartEmpty
              title="Belum ada pengajuan pada rentang ini"
              description="Data akan muncul setelah mahasiswa mengirim pengajuan sesi laboratorium."
            />
          ) : (
            <StackedBarChart
              buckets={trend.buckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                sublabel: bucket.sublabel,
                href: "/admin/schedule",
                segments: bucket.segments,
              }))}
              unit="pengajuan"
              ariaLabel={`Tren pengajuan ${trend.range.label}`}
            />
          )}
        </ChartPanel>
      </div>

      <Panel
        context="Jejak Audit"
        title="Aktivitas Sistem Terakhir"
        className="mt-6"
        action={
          <Link
            href="/admin/audit-logs"
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#8D6500] hover:bg-[#FEF1CC] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
          >
            Semua log audit →
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
