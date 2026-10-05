import type { Metadata } from "next";
import { ExportLink } from "@/components/export-link";
import {
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  Pagination,
  Panel,
  controlClass,
  formatDateTime,
} from "@/components/workspace";
import { listPlpHistory } from "@/services/plp.service";
import { hasPermission, requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { historyQuerySchema } from "@/validators/plp";

export const metadata: Metadata = { title: "History" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

const entityOptions = [
  "resource_request",
  "incident",
  "equipment_asset",
  "equipment_unit",
  "material_batch",
  "assignment",
  "app_setting",
  "laboratory",
  "room",
  "equipment_type",
  "material",
  "user",
];

const actionOptions = [
  "CREATE",
  "UPDATE",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "REQUEST_REVISION",
  "CANCEL",
  "RESERVE",
  "RELEASE",
  "PREPARE",
  "ISSUE",
  "RETURN",
  "COMPLETE",
  "INSPECT",
  "REPORT_INCIDENT",
  "ASSESS_INCIDENT",
  "RESOLVE_INCIDENT",
  "ADJUST_STOCK",
];

export default async function PlpHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(session.user.id, session.user.role);
  const canExportAudit = await hasPermission(session.user.id, {
    audit: ["read-any"],
  });
  const params = await searchParams;
  const limit = 25;
  const page = Math.max(1, Number(pick(params, "page")) || 1);
  const query = historyQuerySchema.parse({
    entity: pick(params, "entity"),
    action: pick(params, "action"),
    actor: pick(params, "actor"),
    from: pick(params, "from"),
    to: pick(params, "to"),
    limit,
    offset: (page - 1) * limit,
  });
  const result = await listPlpHistory({
    ...query,
    roomCodes: scopeRoomCodes(scope),
  });
  const activeFilterCount = [
    query.entity,
    query.action,
    query.actor,
    query.from,
    query.to,
  ].filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(result.meta.total / limit));

  return (
    <>
      <PageHeader
        eyebrow="Operasional"
        title="History"
        description="Jejak audit semua aksi penting: approval, issue, return, inspeksi, stok, dan incident."
        actions={
          canExportAudit ? (
            <ExportLink
              report="audit"
              query={{
                entityType: query.entity,
                action: query.action,
                from: query.from,
                to: query.to,
              }}
            />
          ) : undefined
        }
      />

      <FilterBar
        action="/plp/history"
        activeCount={activeFilterCount}
        clearHref="/plp/history"
      >
        <FilterField label="Entity" className="w-full sm:w-48">
          <select
            name="entity"
            defaultValue={query.entity ?? ""}
            className={controlClass}
          >
            <option value="">Semua entity</option>
            {entityOptions.map((entity) => (
              <option key={entity} value={entity}>
                {entity.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Action" className="w-full sm:w-44">
          <select
            name="action"
            defaultValue={query.action ?? ""}
            className={controlClass}
          >
            <option value="">Semua action</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Actor" className="w-full sm:w-48">
          <input
            type="search"
            name="actor"
            defaultValue={query.actor ?? ""}
            placeholder="Nama aktor"
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Dari" className="w-full sm:w-40">
          <input
            type="date"
            name="from"
            defaultValue={query.from ?? ""}
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Sampai" className="w-full sm:w-40">
          <input
            type="date"
            name="to"
            defaultValue={query.to ?? ""}
            className={controlClass}
          />
        </FilterField>
      </FilterBar>

      <Panel padded={false}>
        {result.data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada aktivitas"
              description="Aksi operasional PLP dan admin akan tercatat di sini secara otomatis."
            />
          </div>
        ) : (
          <div>
            {/* Mobile Card List */}
            <ul className="divide-y divide-[#E5E7EB] sm:hidden">
              {result.data.map((entry) => (
                <li key={entry.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#F8F9FA] border border-[#E5E7EB] px-2 py-0.5 text-[11px] font-bold text-[#121826]">
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-[#64748B] tabular-nums">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-semibold text-[#121826]">
                      {entry.actorName ?? "Sistem"}
                    </span>
                    <span className="text-[11px] text-[#475569]">
                      {entry.entityType}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-[11px] text-[#475569] italic">
                      &ldquo;{entry.reason}&rdquo;
                    </p>
                  )}
                  <p className="truncate font-mono text-[10px] text-[#94A3B8]">
                    {entry.entityId}
                  </p>
                </li>
              ))}
            </ul>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Jejak audit operasional</caption>
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-[0.08em] text-[#64748B]">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Waktu
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Aktor
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Action
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Entity
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA]/60 transition"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#121826]">
                        {entry.actorName ?? "Sistem"}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        <span className="rounded-md bg-[#F8F9FA] border border-[#E5E7EB] px-2 py-0.5 text-[11px] font-semibold text-[#121826]">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#475569]">
                        {entry.entityType}
                        <span className="mt-0.5 block max-w-[220px] truncate text-[11px] text-[#64748B]">
                          {entry.entityId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#475569]">
                        {entry.reason ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      <Pagination
        basePath="/plp/history"
        query={{
          entity: query.entity,
          action: query.action,
          actor: query.actor,
          from: query.from,
          to: query.to,
        }}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
