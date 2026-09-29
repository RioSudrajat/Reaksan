import Link from "next/link";
import { cn } from "cn";
import { EmptyState, Panel, formatDateTime } from "@/components/workspace";
import { UnitStatusAction } from "@/components/plp/unit-status-action";
import { CatalogImage } from "@/components/catalog-image";

export type MaintenanceUnitItem = {
  id: string;
  code: string;
  label: string;
  status: string;
  condition: string;
  notes?: string | null;
  updatedAt?: string;
  assetCode: string;
  assetName: string;
  roomCode?: string;
  roomName?: string;
  imageMediaId?: string | null;
};

export function MaintenanceUnitsPanel({
  units,
  title = "Unit dalam Pemeliharaan (Maintenance)",
  context,
  canManage = false,
  endpointPrefix,
  emptyDescription = "Semua unit dalam kondisi siap pakai. Tidak ada alat yang sedang dalam antrian servis.",
  viewAllHref,
}: {
  units: MaintenanceUnitItem[];
  title?: string;
  context?: string;
  canManage?: boolean;
  endpointPrefix?: string;
  emptyDescription?: string;
  viewAllHref?: string;
}) {
  const panelContext = context ?? `${units.length} unit`;

  return (
    <Panel
      context={panelContext}
      title={title}
      padded={false}
      className="mt-6"
    >
      {units.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="Tidak ada unit dalam maintenance"
            description={emptyDescription}
          />
        </div>
      ) : (
        <div>
          <div className="border-b border-[#EEEEEE] bg-[#FFFDF7] px-5 py-3">
            <p className="text-[12px] font-semibold text-[#5D4A1B]">
              Perhatian Operasional
            </p>
            <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
              Unit-unit berikut sedang dalam perbaikan, kalibrasi, atau pemeriksaan. Unit tidak dapat dipinjam/direservasi hingga statusnya diubah kembali menjadi <strong>AVAILABLE</strong>.
            </p>
          </div>
          <ul className="divide-y divide-[#EEEEEE]">
            {units.map((unit) => {
              const targetEndpoint = endpointPrefix
                ? `${endpointPrefix}/${unit.id}`
                : undefined;

              return (
                <li
                  key={unit.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-[#FAFAF8]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <CatalogImage
                      mediaId={unit.imageMediaId ?? null}
                      alt={unit.assetName}
                      size={44}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-[#212121]">
                          {unit.code}
                        </span>
                        <span className="text-[12px] font-medium text-[#6B6B6B]">
                          · {unit.label}
                        </span>
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-bold",
                            unit.status === "MAINTENANCE" &&
                              "bg-[#FDE9E9] text-[#9E3636]",
                            unit.status === "DAMAGED" &&
                              "bg-[#FDE9E9] text-[#9E3636]",
                            unit.status === "UNDER_INSPECTION" &&
                              "bg-[#E9EEFC] text-[#38529B]",
                          )}
                        >
                          {unit.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-[#212121]">
                        <span className="font-semibold">{unit.assetName}</span>
                        {unit.roomName && (
                          <span className="text-[#6B6B6B]">
                            {" "}
                            · {unit.roomName}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-[#6B6B6B]">
                        Kondisi:{" "}
                        <span className="font-semibold text-[#212121]">
                          {unit.condition.replaceAll("_", " ")}
                        </span>
                        {unit.notes && (
                          <> · <span className="italic text-[#4A4A4A]">&quot;{unit.notes}&quot;</span></>
                        )}
                        {unit.updatedAt && (
                          <span className="text-[#929292]">
                            {" "}
                            · Diperbarui {formatDateTime(unit.updatedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <UnitStatusAction
                        unit={unit}
                        endpoint={targetEndpoint}
                        variant="quick-available"
                      />
                      <UnitStatusAction
                        unit={unit}
                        endpoint={targetEndpoint}
                        variant="full"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {viewAllHref && (
            <div className="border-t border-[#EEEEEE] bg-[#FAFAF8] p-3 text-right">
              <Link
                href={viewAllHref}
                className="text-[12px] font-bold text-[#38529B] hover:underline"
              >
                Lihat selengkapnya di daftar unit →
              </Link>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
