import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { IncidentActions } from "@/components/plp/incident-actions";
import {
  IncidentBadge,
  PageHeader,
  Panel,
  SeverityBadge,
  formatDateTime,
} from "@/components/workspace";
import { getAnyIncident } from "@/services/incidents.service";
import { incidentToView } from "@/services/view.service";
import { requirePermission } from "@/lib/session";
import { getRoomScope } from "@/services/access-scope.service";

export const metadata: Metadata = { title: "Incident Detail" };

export default async function PlpIncidentDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const incident = await getAnyIncident(code);
  if (!incident) notFound();
  if (!scope.all && (!incident.roomCode || !scope.roomCodes.includes(incident.roomCode)))
    notFound();
  const view = incidentToView(incident);
  const critical = incident.severity === "CRITICAL" || incident.severity === "HIGH";

  return (
    <>
      <Link
        href="/plp/incidents"
        className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua incident
      </Link>

      <PageHeader
        eyebrow={incident.code}
        title={incident.title}
        description={`Dilaporkan ${incident.reporterName} · ${formatDateTime(
          incident.occurredAt ?? incident.createdAt,
        )}`}
        actions={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <IncidentBadge incident={view} />
          </div>
        }
      />

      {critical && incident.status !== "RESOLVED" && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-[#DC2626]"
            aria-hidden="true"
          />
          <p className="text-[12px] font-semibold leading-5 text-[#DC2626]">
            Severity {incident.severity}. Prioritaskan pemeriksaan dan pastikan
            area kerja aman sebelum equipment dipakai lagi.
          </p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <Panel context="Laporan" title="Deskripsi">
            <p className="text-[13px] leading-6 text-[#121826]">
              {incident.description}
            </p>
          </Panel>
          <Panel context="Tindakan PLP" title="Assessment dan resolusi">
            <IncidentActions incident={view} />
          </Panel>
        </div>

        <Panel context="Konteks" title="Identitas">
          <dl className="space-y-3 text-[12px]">
            <div className="flex justify-between gap-3">
              <dt className="text-[#64748B]">Equipment</dt>
              <dd className="text-right font-medium text-[#121826]">
                {incident.equipmentCode ?? "-"}
                {incident.equipmentName ? ` · ${incident.equipmentName}` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#64748B]">Room</dt>
              <dd className="text-right font-medium text-[#121826]">
                {incident.roomName ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#64748B]">Request</dt>
              <dd className="text-right font-medium text-[#121826]">
                {incident.requestCode ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#64748B]">Pelapor</dt>
              <dd className="text-right font-medium text-[#121826]">
                {incident.reporterName}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#64748B]">Terjadi</dt>
              <dd className="text-right font-medium text-[#121826]">
                {formatDateTime(incident.occurredAt ?? incident.createdAt)}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
