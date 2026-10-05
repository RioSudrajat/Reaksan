import type { Metadata } from "next";
import Link from "next/link";
import { ExportLink } from "@/components/export-link";
import { QuickIncidentDialog } from "@/components/plp/quick-incident-dialog";
import {
  EmptyState,
  FilterBar,
  FilterField,
  IncidentBadge,
  PageHeader,
  Pagination,
  Panel,
  SeverityBadge,
  controlClass,
  formatDateTime,
} from "@/components/workspace";
import { listIncidentPage } from "@/services/incidents.service";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { listPlpIncidentsSchema } from "@/validators/plp";

export const metadata: Metadata = { title: "Incidents" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

export default async function PlpIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const params = await searchParams;
  const limit = 25;
  const page = Math.max(1, Number(pick(params, "page")) || 1);
  const query = listPlpIncidentsSchema.parse({
    status: pick(params, "status"),
    severity: pick(params, "severity"),
    search: pick(params, "search"),
    limit,
    offset: (page - 1) * limit,
  });
  const result = await listIncidentPage({
    statuses: query.status ? [query.status] : undefined,
    severities: query.severity ? [query.severity] : undefined,
    search: query.search,
    roomCodes: scopeRoomCodes(scope),
    limit: query.limit,
    offset: query.offset,
  });
  const activeFilterCount = [query.status, query.severity, query.search].filter(
    Boolean,
  ).length;
  const totalPages = Math.max(1, Math.ceil(result.meta.total / limit));

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Incidents"
        description="Nilai laporan insiden, tentukan tindakan, dan selesaikan dengan status equipment yang jelas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QuickIncidentDialog triggerLabel="Lapor Insiden Baru" />
            <ExportLink
              report="incidents"
              query={{ status: query.status, severity: query.severity }}
            />
          </div>
        }
      />

      <FilterBar
        action="/plp/incidents"
        activeCount={activeFilterCount}
        clearHref="/plp/incidents"
      >
        <FilterField label="Cari" className="w-full sm:w-56">
          <input
            type="search"
            name="search"
            defaultValue={query.search ?? ""}
            placeholder="Kode, judul, asset, pelapor"
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Status" className="w-full sm:w-44">
          <select
            name="status"
            defaultValue={query.status ?? ""}
            className={controlClass}
          >
            <option value="">Semua status</option>
            <option value="REPORTED">Reported</option>
            <option value="UNDER_ASSESSMENT">Under assessment</option>
            <option value="IN_MAINTENANCE">In maintenance</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </FilterField>
        <FilterField label="Severity" className="w-full sm:w-40">
          <select
            name="severity"
            defaultValue={query.severity ?? ""}
            className={controlClass}
          >
            <option value="">Semua severity</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </FilterField>
      </FilterBar>

      <Panel padded={false}>
        {result.data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada incident yang cocok"
              description="Incident baru dari mahasiswa akan muncul di sini untuk dinilai."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {result.data.map((incident) => (
              <li key={incident.id}>
                <Link
                  href={`/plp/incidents/${incident.code}`}
                  className="flex flex-col gap-3 p-4 transition hover:bg-[#FDFBF7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#64748B]">
                        {incident.code}
                      </span>
                      <SeverityBadge severity={incident.severity} />
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-[#121826]">
                      {incident.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748B]">
                      {incident.equipmentCode ?? incident.roomName ?? "Lab"} ·{" "}
                      dilaporkan {incident.reporterName} ·{" "}
                      {formatDateTime(
                        incident.occurredAt ?? incident.createdAt,
                      )}
                    </p>
                  </div>
                  <IncidentBadge incident={incident} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Pagination
        basePath="/plp/incidents"
        query={{
          status: query.status,
          severity: query.severity,
          search: query.search,
        }}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
