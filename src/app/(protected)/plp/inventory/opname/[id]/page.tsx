import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { material } from "@/db/schema";
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

const statusTone: Record<string, "yellow" | "green" | "neutral"> = {
  IN_PROGRESS: "yellow",
  COMPLETED: "green",
  CANCELLED: "neutral",
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

  const catalogMaterials = await db
    .select({
      id: material.id,
      code: material.code,
      name: material.name,
      baseUnit: material.baseUnit,
      category: material.category,
    })
    .from(material)
    .where(eq(material.active, true))
    .orderBy(asc(material.name));

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
              className="inline-flex min-h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
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
          tone={totals.positiveTotal > 0 ? "green" : undefined}
        />
        <StatCard
          label="Selisih negatif"
          value={formatSigned(totals.negativeTotal)}
          detail="Fisik lebih kecil dari catatan"
          tone={totals.negativeTotal < 0 ? "rose" : undefined}
        />
      </div>

      <Panel context="Sesi" title="Informasi sesi" className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusTone[session.status] ?? "neutral"}>
            {statusLabel[session.status] ?? session.status}
          </StatusBadge>
          <span className="text-[12px] text-[#64748B]">
            {session.roomCode} · dimulai {session.startedByName} ·{" "}
            {formatDateTime(session.startedAt)}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Selesai
            </dt>
            <dd className="mt-0.5 text-[#121826]">
              {session.completedAt
                ? `${session.completedByName ?? "PLP"} · ${formatDateTime(session.completedAt)}`
                : "Belum selesai"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Catatan
            </dt>
            <dd className="mt-0.5 text-[#121826]">{session.notes ?? "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Id sesi
            </dt>
            <dd className="mt-0.5 break-all font-mono text-[11px] text-[#64748B]">
              {session.id}
            </dd>
          </div>
        </dl>
      </Panel>

      {inProgress && (
        <Panel context="Input" title="Jumlah fisik & Sensus Lapangan" className="mb-5">
          <OpnameCountForm
            sessionId={session.id}
            entries={session.entries.map((entry) => ({
              id: entry.id,
              itemType: entry.itemType,
              materialBatchId: entry.materialBatchId,
              equipmentAssetId: entry.equipmentAssetId,
              equipmentUnitId: entry.equipmentUnitId,
              materialCode: entry.materialCode,
              materialName: entry.materialName,
              lotNumber: entry.lotNumber,
              qrCode: entry.qrCode,
              condition: entry.condition,
              storageLocation: entry.storageLocation,
              entrySource: entry.entrySource,
              varianceReason: entry.varianceReason,
              unit: entry.unit,
              baseline: entry.baseline,
              counted: entry.counted,
            }))}
            materials={catalogMaterials}
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
                title="Tidak ada item pada sesi ini"
                description="Room ini tidak memiliki bahan atau peralatan aktif saat sesi dimulai."
              />
            </div>
          ) : (
            <div>
              {/* Mobile Card List */}
              <div className="divide-y divide-[#E5E7EB] sm:hidden">
                {session.entries.map((entry) => (
                  <div key={entry.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                              entry.itemType === "MATERIAL"
                                ? "border-[#E5E7EB] bg-[#F8F9FA] text-[#64748B]"
                                : entry.itemType === "TOOL"
                                  ? "border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
                                  : "border-[#E5E7EB] bg-[#F8F9FA] text-[#121826]"
                            }`}
                          >
                            {entry.itemType === "MATERIAL"
                              ? "Bahan"
                              : entry.itemType === "TOOL"
                                ? "Alat"
                                : "Instrumen"}
                          </span>
                          <p className="text-[13px] font-semibold text-[#121826]">
                            {entry.materialName}
                          </p>
                          {entry.entrySource === "GRANT_HIBAH" && (
                            <span className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-bold text-[#16A34A]">
                              Hibah
                            </span>
                          )}
                          {entry.entrySource === "LEFTOVER_RETURN" && (
                            <span className="rounded-full border border-[#FDE68A] bg-[#FEF7E6] px-2 py-0.5 text-[10px] font-bold text-[#8D6500]">
                              Sisa
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          {entry.materialCode} {entry.lotNumber ? `· ${entry.lotNumber}` : ""}{" "}
                          {entry.storageLocation ? `· ${entry.storageLocation}` : ""}
                        </p>
                      </div>
                      <span
                        className={
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums " +
                          (entry.difference > 0
                            ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]"
                            : entry.difference < 0
                              ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                              : "border-[#E5E7EB] bg-[#F8F9FA] text-[#64748B]")
                        }
                      >
                        {formatSigned(entry.difference)} {entry.unit}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px] rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-2.5">
                      <div>
                        <span className="text-[#64748B] text-[11px] block">Baseline</span>
                        <span className="font-medium text-[#121826] tabular-nums">
                          {formatQuantity(entry.baseline)} {entry.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[11px] block">Fisik</span>
                        <span className="font-semibold text-[#121826] tabular-nums">
                          {formatQuantity(entry.counted)} {entry.unit}
                        </span>
                      </div>
                    </div>
                    {entry.itemType !== "MATERIAL" && entry.condition && (
                      <p
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium border ${
                          entry.condition === "DAMAGED"
                            ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                            : entry.condition === "MINOR_ISSUE"
                              ? "border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
                              : "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]"
                        }`}
                      >
                        Kondisi Fisik: {entry.condition.replaceAll("_", " ")}
                      </p>
                    )}
                    {entry.itemType === "MATERIAL" && entry.varianceReason && (
                      <p className="text-[11px] text-[#8D6500] border border-[#FDE68A] bg-[#FEF7E6] px-2.5 py-1 rounded-md">
                        Alasan: {entry.varianceReason}
                      </p>
                    )}
                    <p className="text-[11px] text-[#64748B]">
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
                    <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-[11px] uppercase tracking-[0.08em] text-[#64748B]">
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Item & Kategori
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Meja / Rak
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Label / Lot
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
                        Kondisi / Keterangan
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
                        className="border-b border-[#F1F0EC] transition-colors hover:bg-[#FDFBF7] last:border-0"
                      >
                        <td className="px-4 py-3 text-[12px] text-[#121826]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                entry.itemType === "MATERIAL"
                                  ? "border-[#E5E7EB] bg-[#F8F9FA] text-[#64748B]"
                                  : entry.itemType === "TOOL"
                                    ? "border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
                                    : "border-[#E5E7EB] bg-[#F8F9FA] text-[#121826]"
                              }`}
                            >
                              {entry.itemType === "MATERIAL"
                                ? "Bahan"
                                : entry.itemType === "TOOL"
                                  ? "Alat"
                                  : "Instrumen"}
                            </span>
                            <span className="font-semibold">
                              {entry.materialName}
                            </span>
                            {entry.entrySource === "GRANT_HIBAH" && (
                              <span className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 text-[9px] font-bold text-[#16A34A]">
                                Hibah
                              </span>
                            )}
                            {entry.entrySource === "LEFTOVER_RETURN" && (
                              <span className="rounded-full border border-[#FDE68A] bg-[#FEF7E6] px-2 py-0.5 text-[9px] font-bold text-[#8D6500]">
                                Sisa
                              </span>
                            )}
                          </div>
                          <span className="mt-0.5 block text-[11px] text-[#64748B]">
                            {entry.materialCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B]">
                          {entry.storageLocation ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B]">
                          {entry.lotNumber ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B]">
                          {entry.unit}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B] [font-variant-numeric:tabular-nums]">
                          {formatQuantity(entry.baseline)}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                          {formatQuantity(entry.counted)}
                        </td>
                        <td
                          className={
                            "px-4 py-3 text-[12px] font-semibold [font-variant-numeric:tabular-nums] " +
                            (entry.difference > 0
                              ? "text-[#16A34A]"
                              : entry.difference < 0
                                ? "text-[#DC2626]"
                                : "text-[#64748B]")
                          }
                        >
                          {formatSigned(entry.difference)}
                        </td>
                        <td className="px-4 py-3 text-[11px]">
                          {entry.itemType !== "MATERIAL" ? (
                            <span
                              className={`inline-block rounded-md border px-2 py-0.5 font-bold ${
                                entry.condition === "DAMAGED"
                                  ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                                  : entry.condition === "MINOR_ISSUE"
                                    ? "border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
                                    : "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]"
                              }`}
                            >
                              {entry.condition?.replaceAll("_", " ") ?? "Baik"}
                            </span>
                          ) : (
                            <span className="text-[#64748B]">
                              {entry.varianceReason ?? "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B]">
                          {entry.countedByName}
                          <span className="mt-0.5 block text-[11px] text-[#64748B]">
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
