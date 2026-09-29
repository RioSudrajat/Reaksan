import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { RequestReviewPanel } from "@/components/plp/request-review";
import { CatalogImage } from "@/components/catalog-image";
import {
  EmptyState,
  PageHeader,
  Panel,
  RequestStatusBadge,
  formatDateTime,
  formatRange,
} from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { ApiError } from "@/lib/api";
import {
  assertRequestInScope,
  getRoomScope,
} from "@/services/access-scope.service";
import {
  getRequestReviewContext,
  getRequestTimeline,
} from "@/services/requests.service";

export const metadata: Metadata = { title: "Request Detail" };

const actionLabels: Record<string, string> = {
  SUBMIT: "Request dikirim",
  UPDATE: "Request diperbarui",
  APPROVE: "Disetujui PLP",
  REJECT: "Ditolak PLP",
  REQUEST_REVISION: "Revisi diminta",
  CANCEL: "Dibatalkan",
  PREPARE: "Disiapkan untuk pickup",
  ISSUE: "Resource diserahkan",
  RETURN: "Resource dikembalikan",
  COMPLETE: "Request diselesaikan",
  RESERVE: "Stok direservasi",
  RELEASE: "Reservasi stok dilepas",
};

export default async function PlpRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const inScope = await assertRequestInScope(scope, id)
    .then(() => true)
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    });
  if (!inScope) notFound();
  const context = await getRequestReviewContext(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
  if (!context) notFound();
  const timeline = await getRequestTimeline(id);
  const { request } = context;
  const canFulfill = ["APPROVED", "READY_FOR_PICKUP"].includes(request.status);

  return (
    <>
      <Link
        href="/plp/requests"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua request
      </Link>

      <PageHeader
        eyebrow={request.code}
        title={request.title}
        description={`${request.actorName} · ${request.activityTitle}`}
        actions={
          canFulfill ? (
            <Link
              href="/plp/fulfillment/issue"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Buka issue queue
            </Link>
          ) : undefined
        }
      />

      {context.warnings.length > 0 && (
        <div className="mb-5 rounded-2xl border border-[#F2D9A4] bg-[#FFF9EC] p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold text-[#705012]">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Peringatan sebelum keputusan
          </p>
          <ul className="mt-2 space-y-1.5">
            {context.warnings.map((warning, index) => (
              <li key={index} className="text-[12px] leading-5 text-[#5D4A1B]">
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <Panel context="Konteks" title="Tujuan dan rencana">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                  Tujuan
                </dt>
                <dd className="mt-1 text-[13px] leading-5 text-[#212121]">
                  {request.purpose}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                  Supervisor / PIC lapangan
                </dt>
                <dd className="mt-1 text-[13px] text-[#212121]">
                  {request.supervisor || "-"} · {request.fieldPic || "-"}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel
            context={`${context.equipment.length} item`}
            title="Equipment yang diminta"
          >
            {context.equipment.length === 0 ? (
              <EmptyState
                title="Tidak ada equipment"
                description="Request ini hanya meminta material."
              />
            ) : (
              <ul className="divide-y divide-[#EEEEEE]">
                {context.equipment.map((item) => (
                  <li key={item.itemId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <CatalogImage
                          mediaId={item.imageMediaId}
                          alt={item.assetName}
                          size={44}
                          className="rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#212121]">
                            {item.assetName} · {item.unitCode}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                            {item.roomName} · {item.unitLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                            (item.usageType === "BORROWABLE"
                              ? "bg-[#E9EEFC] text-[#38529B]"
                              : "bg-[#F1F0EC] text-[#5D5B53]")
                          }
                        >
                          {item.usageType === "BORROWABLE"
                            ? "Borrowable"
                            : "Usage only"}
                        </span>
                        <span className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-semibold text-[#5D5B53]">
                          {item.unitStatus} · {item.condition}
                        </span>
                      </div>
                    </div>
                    {item.conflicts.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {item.conflicts.map((conflict) => (
                          <li
                            key={conflict.requestId}
                            className="text-[11px] text-[#9E3636]"
                          >
                            Bentrok dengan {conflict.requestCode} (
                            {conflict.actorName}) ·{" "}
                            {formatRange(conflict.startAt, conflict.endAt)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            context={`${context.materials.length} item`}
            title="Material dan stok"
          >
            {context.materials.length === 0 ? (
              <EmptyState
                title="Tidak ada material"
                description="Request ini hanya meminta equipment."
              />
            ) : (
              <ul className="divide-y divide-[#EEEEEE]">
                {context.materials.map((item) => (
                  <li key={item.itemId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <CatalogImage
                          mediaId={item.imageMediaId}
                          alt={item.name}
                          size={44}
                          className="rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#212121]">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                            Diminta {item.requested} {item.unit} · tersedia{" "}
                            {item.available} {item.unit} (fisik {item.physical},
                            reserved {item.reserved})
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                          (item.sufficient
                            ? "bg-[#E5F5ED] text-[#03683A]"
                            : "bg-[#FDE9E9] text-[#9E3636]")
                        }
                      >
                        {item.sufficient ? "Stok cukup" : "Stok kurang"}
                      </span>
                    </div>
                    {item.batches.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-[#929292]">
                        Batch:{" "}
                        {item.batches
                          .map(
                            (batch) =>
                              `${batch.lotNumber ?? "tanpa lot"} di ${batch.roomName} (${batch.quantity} ${item.unit}${
                                batch.expiryDate
                                  ? `, exp ${new Date(batch.expiryDate).toLocaleDateString("id-ID")}`
                                  : ""
                              })`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel context="Jejak" title="Timeline status">
            {timeline.length === 0 ? (
              <EmptyState
                title="Belum ada riwayat"
                description="Setiap aksi pada request ini akan tercatat di sini."
              />
            ) : (
              <ol className="relative space-y-4 border-l border-[#E1E1E1] pl-5">
                {timeline.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-[#F9B129] ring-2 ring-white" />
                    <p className="text-[12px] font-semibold text-[#212121]">
                      {actionLabels[entry.action] ?? entry.action}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                      {entry.actorName ?? "Sistem"} ·{" "}
                      {formatDateTime(entry.createdAt)}
                    </p>
                    {entry.reason && (
                      <p className="mt-1 rounded-lg bg-[#F5F5F5] px-3 py-2 text-[11px] leading-4 text-[#5D5B53]">
                        {entry.reason}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel context="Status" title="Ringkasan">
            <div className="flex items-center justify-between gap-2">
              <RequestStatusBadge status={request.status} />
              <span className="text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                {request.code}
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Room</dt>
                <dd className="text-right font-medium text-[#212121]">
                  {request.roomName}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Jadwal</dt>
                <dd className="text-right font-medium text-[#212121] [font-variant-numeric:tabular-nums]">
                  {formatRange(request.startAt, request.endAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Dikirim</dt>
                <dd className="text-right font-medium text-[#212121]">
                  {formatDateTime(request.submittedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Disetujui</dt>
                <dd className="text-right font-medium text-[#212121]">
                  {formatDateTime(request.approvedAt)}
                </dd>
              </div>
            </dl>
            {request.revisionNote && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF4D9] px-3 py-2 text-[11px] leading-4 text-[#705012]">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Catatan revisi: {request.revisionNote}
              </p>
            )}
            {request.rejectionReason && (
              <p className="mt-4 rounded-xl bg-[#FDE9E9] px-3 py-2 text-[11px] leading-4 text-[#9E3636]">
                Alasan ditolak: {request.rejectionReason}
              </p>
            )}
          </Panel>

          <Panel context="Aksi PLP" title="Review">
            <RequestReviewPanel requestId={request.id} status={request.status} />
          </Panel>
        </div>
      </div>
    </>
  );
}
