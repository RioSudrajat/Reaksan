import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ExportLink } from "@/components/export-link";
import { OpnameCountForm } from "@/components/plp/opname-count-form";
import { OpnameReconcileAction } from "@/components/plp/opname-reconcile-action";
import { OpnameSessionActions } from "@/components/plp/opname-session-actions";
import { StatusBadge } from "@/components/status-badge";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  formatDateTime,
} from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { getRoomScope } from "@/services/access-scope.service";
import { getOpnameVarianceReport } from "@/services/opname.service";

export const metadata: Metadata = { title: "Detail Opname" };

const statusLabel: Record<string, string> = {
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const statusTone: Record<string, "blue" | "green" | "cream"> = {
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELLED: "cream",
};

const numberFormat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

function formatQuantity(value: number) {
  return numberFormat.format(value);
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${numberFormat.format(value)}`;
}

export default async function OpnameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requirePermission({ inventory: ["manage-any"] });
  const scope = await getRoomScope(user.id, user.role);
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const report = await getOpnameVarianceReport(parsedId.data);
  if (!report) notFound();
  if (!scope.all && !scope.roomCodes.includes(report.session.roomCode))
    notFound();
  const { session, totals } = report;
  const inProgress = session.status === "IN_PROGRESS";

  return (
    <>
      <PageHeader
        eyebrow="Inventori"
        title={`Opname ${session.roomName}`}
        description={`Baseline dikunci saat sesi dimulai. Hitung tidak mengubah stok; koreksi lewat penyesuaian batch manual.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!inProgress && totals.batchesWithDifference > 0 && (
              <OpnameReconcileAction
                sessionId={session.id}
                batchesWithDifference={totals.batchesWithDifference}
                positiveTotal={totals.positiveTotal}
                negativeTotal={totals.negativeTotal}
              />
            )}
            <Link
              href={`/plp/inventory/opname/${session.id}/sheet`}
              className="inline-flex min-h-11 items-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Lembar cetak
            </Link>
            <ExportLink
              report="opname-variance"
              query={{ sessionId: session.id }}
              label="Unduh selisih CSV"
            />
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Batch dihitung"
          value={totals.totalBatches}
          detail="Batch aktif saat sesi dimulai"
        />
        <StatCard
          label="Batch berselisih"
          value={totals.batchesWithDifference}
          detail="Fisik tidak sama dengan baseline"
          tone={totals.batchesWithDifference > 0 ? "yellow" : "green"}
        />
        <StatCard
          label="Selisih positif"
          value={formatSigned(totals.positiveTotal)}
          detail="Fisik lebih besar dari catatan"
          tone="blue"
        />
        <StatCard
          label="Selisih negatif"
          value={formatSigned(totals.negativeTotal)}
          detail="Fisik lebih kecil dari catatan"
          tone={totals.negativeTotal < 0 ? "rose" : "cream"}
        />
      </div>

      <Panel context="Sesi" title="Informasi sesi" className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusTone[session.status] ?? "cream"}>
            {statusLabel[session.status] ?? session.status}
          </StatusBadge>
          <span className="text-[12px] text-[#6B6B6B]">
            {session.roomCode} · dimulai {session.startedByName} ·{" "}
            {formatDateTime(session.startedAt)}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
              Selesai
            </dt>
            <dd className="mt-0.5 text-[#212121]">
              {session.completedAt
                ? `${session.completedByName ?? "PLP"} · ${formatDateTime(session.completedAt)}`
                : "Belum selesai"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
              Catatan
            </dt>
            <dd className="mt-0.5 text-[#212121]">{session.notes ?? "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
              Id sesi
            </dt>
            <dd className="mt-0.5 break-all font-mono text-[11px] text-[#6B6B6B]">
              {session.id}
            </dd>
          </div>
        </dl>
      </Panel>

      {inProgress && (
        <Panel context="Input" title="Jumlah fisik" className="mb-5">
          <OpnameCountForm
            sessionId={session.id}
            entries={session.entries.map((entry) => ({
              materialBatchId: entry.materialBatchId,
              materialCode: entry.materialCode,
              materialName: entry.materialName,
              lotNumber: entry.lotNumber,
              unit: entry.unit,
              counted: entry.counted,
            }))}
          />
        </Panel>
      )}

      {!inProgress && (
        <Panel
          context="Laporan selisih"
          title="Baseline dan hasil hitung"
          padded={false}
        >
          {session.entries.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Tidak ada batch pada sesi ini"
                description="Room ini tidak memiliki batch aktif saat sesi dimulai."
              />
            </div>
          ) : (
            <div>
              {/* Mobile Card List */}
              <div className="divide-y divide-[#EEEEEE] sm:hidden">
                {session.entries.map((entry) => (
                  <div key={entry.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#212121]">
                          {entry.materialName}
                        </p>
                        <p className="text-[11px] text-[#929292]">
                          {entry.materialCode} {entry.lotNumber ? `· Lot ${entry.lotNumber}` : ""}
                        </p>
                      </div>
                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums " +
                          (entry.difference > 0
                            ? "bg-[#E5F5ED] text-[#03683A]"
                            : entry.difference < 0
                              ? "bg-[#FDE9E9] text-[#9E3636]"
                              : "bg-[#FAFAFA] text-[#6B6B6B]")
                        }
                      >
                        {formatSigned(entry.difference)} {entry.unit}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px] rounded-xl bg-[#FAFAFA] p-2.5">
                      <div>
                        <span className="text-[#929292] text-[11px] block">Baseline</span>
                        <span className="font-medium text-[#212121] tabular-nums">
                          {formatQuantity(entry.baseline)} {entry.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#929292] text-[11px] block">Fisik</span>
                        <span className="font-semibold text-[#212121] tabular-nums">
                          {formatQuantity(entry.counted)} {entry.unit}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#929292]">
                      Dihitung oleh {entry.countedByName} · {formatDateTime(entry.countedAt)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">
                    Perbandingan baseline dan jumlah fisik
                  </caption>
                  <thead>
                    <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Material
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Lot
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Satuan
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Baseline
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Fisik
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Selisih
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Dihitung oleh
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-[#F1F0EC] last:border-0"
                      >
                        <td className="px-4 py-3 text-[12px] text-[#212121]">
                          <span className="font-semibold">
                            {entry.materialName}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#929292]">
                            {entry.materialCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                          {entry.lotNumber ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                          {entry.unit}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6B6B6B] [font-variant-numeric:tabular-nums]">
                          {formatQuantity(entry.baseline)}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                          {formatQuantity(entry.counted)}
                        </td>
                        <td
                          className={
                            "px-4 py-3 text-[12px] font-semibold [font-variant-numeric:tabular-nums] " +
                            (entry.difference > 0
                              ? "text-[#03683A]"
                              : entry.difference < 0
                                ? "text-[#9E3636]"
                                : "text-[#6B6B6B]")
                          }
                        >
                          {formatSigned(entry.difference)}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                          {entry.countedByName}
                          <span className="mt-0.5 block text-[11px] text-[#929292]">
                            {formatDateTime(entry.countedAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>
      )}

      {inProgress && (
        <Panel context="Kontrol" title="Tutup sesi" className="mt-5">
          <OpnameSessionActions sessionId={session.id} />
        </Panel>
      )}
    </>
  );
}
