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
import { requirePermission } from "@/lib/session";
import { historyQuerySchema } from "@/validators/plp";

export const metadata: Metadata = { title: "Log Audit Sistem · Admin Reaksan" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission({ audit: ["read-any"] });
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
  const result = await listPlpHistory(query);
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
        eyebrow="Operasional & Keamanan"
        title="Log Audit & Jejak Aktivitas"
        description="Audit bersifat append-only dan permanen. Setiap tindakan administratif, perubahan izin, serta transaksi sumber daya terekam untuk akuntabilitas."
        actions={
          <ExportLink
            report="audit"
            query={{
              entityType: query.entity,
              action: query.action,
              from: query.from,
              to: query.to,
            }}
          />
        }
      />

      <FilterBar
        action="/admin/audit-logs"
        activeCount={activeFilterCount}
        clearHref="/admin/audit-logs"
      >
        <FilterField label="Tipe Entitas" className="w-full sm:w-52">
          <input
            type="search"
            name="entity"
            defaultValue={query.entity ?? ""}
            placeholder="resource_request, user, ..."
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Tindakan / Aksi" className="w-full sm:w-44">
          <input
            type="search"
            name="action"
            defaultValue={query.action ?? ""}
            placeholder="APPROVE, UPDATE, ..."
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Pelaksana / Aktor" className="w-full sm:w-48">
          <input
            type="search"
            name="actor"
            defaultValue={query.actor ?? ""}
            placeholder="Nama aktor atau sistem"
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Dari Tanggal" className="w-full sm:w-40">
          <input
            type="date"
            name="from"
            defaultValue={query.from ?? ""}
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Sampai Tanggal" className="w-full sm:w-40">
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
              title="Tidak ada log audit"
              description="Tidak ditemukan catatan log audit yang cocok dengan filter aktif. Coba sesuaikan rentang tanggal atau kriteria pencarian."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Audit log sistem Reaksan</caption>
              <thead>
                <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Waktu
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Pelaksana
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Tindakan
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Entitas Data
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Catatan / Alasan
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[#F1F0EC] last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#212121]">
                      {entry.actorName ?? "Sistem"}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#212121]">
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                      {entry.entityType}
                      <span className="mt-0.5 block max-w-[240px] truncate text-[11px] text-[#929292]">
                        {entry.entityId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                      {entry.reason ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Pagination
        basePath="/admin/audit-logs"
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
