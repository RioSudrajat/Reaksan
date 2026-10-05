"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, Undo2 } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { CatalogImage } from "@/components/catalog-image";
import { QuickIncidentDialog } from "@/components/plp/quick-incident-dialog";
import {
  RequestStatusBadge,
  formatRange,
  controlClass,
} from "@/components/workspace";
import type { FulfillmentRequest } from "@/components/plp/types";

const conditions = [
  { value: "GOOD", label: "Good, tidak ada masalah" },
  { value: "MINOR_ISSUE", label: "Minor issue, perlu dicek" },
  { value: "DAMAGED", label: "Damaged, perlu perbaikan" },
  { value: "UNKNOWN", label: "Belum bisa dipastikan" },
];

export function ReturnQueue({ requests }: { requests: FulfillmentRequest[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [condition, setCondition] = useState("GOOD");
  const [notes, setNotes] = useState("");
  const [inspection, setInspection] = useState("AVAILABLE");
  const [unitStatuses, setUnitStatuses] = useState<Record<string, "AVAILABLE" | "MAINTENANCE">>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const eqText = r.equipment.map((e) => `${e.unitCode} ${e.assetName}`).join(" ").toLowerCase();
    const matText = r.materials.map((m) => m.name).join(" ").toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.actorName.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.roomName.toLowerCase().includes(q) ||
      eqText.includes(q) ||
      matText.includes(q)
    );
  });

  async function returnEquipment(request: FulfillmentRequest) {
    setPendingId(request.id);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/requests/${request.id}/return`, {
        method: "POST",
        body: { condition, notes },
      });
      setSuccess(
        `${request.code} diterima. Lanjutkan inspeksi untuk menutup request.`,
      );
      setExpanded(null);
      setNotes("");
      setCondition("GOOD");
      setUnitStatuses({});
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  async function complete(request: FulfillmentRequest, withInspection: boolean) {
    setPendingId(request.id);
    setError("");
    setSuccess("");
    const overrides = Object.entries(unitStatuses)
      .map(([unitCode, status]) => {
        const item = request.equipment.find((e) => e.unitCode === unitCode);
        const unitId = item?.id ?? item?.unitId;
        return unitId ? { unitId, status } : null;
      })
      .filter((x): x is { unitId: string; status: "AVAILABLE" | "MAINTENANCE" } => Boolean(x));

    try {
      await apiRequest(`/api/plp/requests/${request.id}/complete`, {
        method: "POST",
        body: withInspection
          ? {
              notes,
              equipmentStatus: inspection as "AVAILABLE" | "MAINTENANCE",
              unitStatuses: overrides.length > 0 ? overrides : undefined,
            }
          : { notes },
      });
      setSuccess(`${request.code} selesai. Unit dikembalikan ke katalog.`);
      setExpanded(null);
      setNotes("");
      setUnitStatuses({});
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8F9FA] px-5 py-10 text-center">
        <Undo2 className="mx-auto size-6 text-[#64748B]" aria-hidden="true" />
        <p className="mt-3 text-[13px] font-semibold text-[#121826]">
          Tidak ada pengembalian atau inspeksi
        </p>
        <p className="mt-1 text-[12px] text-[#64748B]">
          Request aktif dan yang sudah dikembalikan akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" />
        <input
          type="search"
          placeholder="Cari kode request, nama mahasiswa, judul, alat, atau bahan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={controlClass + " pl-9"}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-medium text-[#DC2626]"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[12px] font-medium text-[#16A34A]"
        >
          {success}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-6 text-center text-[12px] text-[#64748B]">
          Tidak ada pengembalian yang cocok dengan pencarian &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((request) => {
            const borrowable = request.equipment.filter(
              (item) => item.usageType === "BORROWABLE",
            );
            const usageOnly = request.equipment.filter(
              (item) => item.usageType === "USAGE_ONLY",
            );
            const overdue = request.overdue;
            const returning =
              request.status === "ACTIVE" || request.status === "OVERDUE";
            const isExpanded = expanded === request.id;
            const busy = pendingId === request.id;
            const hasMaintenanceUnit =
              inspection === "MAINTENANCE" ||
              Object.values(unitStatuses).some((s) => s === "MAINTENANCE");

            return (
              <li key={request.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#121826]">
                      {request.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748B]">
                      {request.code} · {request.actorName} · {request.roomName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748B] [font-variant-numeric:tabular-nums]">
                      {formatRange(request.startAt, request.endAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue && returning && (
                      <span className="inline-flex items-center rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                        Lewat tenggat
                      </span>
                    )}
                    <RequestStatusBadge status={request.status} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {borrowable.length > 0 && (
                    <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FEF7E6] px-2.5 py-0.5 font-semibold text-[#8D6500]">
                      {borrowable.length} borrowable harus dikembalikan
                    </span>
                  )}
                  {usageOnly.length > 0 && (
                    <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F8F9FA] px-2.5 py-0.5 font-semibold text-[#64748B]">
                      {usageOnly.length} usage-only tanpa return
                    </span>
                  )}
                </div>

                {(request.equipment.length > 0 ||
                  request.materials.length > 0) && (
                  <ul className="mt-3 flex flex-wrap items-center gap-1.5">
                    {request.equipment.map((item) => (
                      <li key={item.unitCode}>
                        <CatalogImage
                          mediaId={item.imageMediaId}
                          alt={item.assetName}
                          size={32}
                          className="rounded-lg"
                        />
                      </li>
                    ))}
                    {request.materials.map((item) => (
                      <li key={item.name}>
                        <CatalogImage
                          mediaId={item.imageMediaId}
                          alt={item.name}
                          size={32}
                          className="rounded-lg"
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {returning && borrowable.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(isExpanded ? null : request.id);
                        setError("");
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                    >
                      <Undo2 className="size-4" aria-hidden="true" />
                      Catat pengembalian
                    </button>
                  )}
                  {request.status === "RETURNED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(isExpanded ? null : request.id);
                        setError("");
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Selesaikan inspeksi
                    </button>
                  )}
                  {returning && borrowable.length === 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => complete(request, false)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      {busy
                        ? "Memproses..."
                        : usageOnly.length > 0
                          ? "Selesaikan penggunaan"
                          : "Selesaikan request"}
                    </button>
                  )}
                </div>

                {isExpanded && returning && borrowable.length > 0 && (
                  <div className="mt-3 rounded-xl border border-[#FDE68A] bg-[#FEF7E6] p-4">
                    <p className="text-[12px] font-bold text-[#8D6500]">
                      Hasil inspeksi saat diterima
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                          Kondisi
                        </span>
                        <select
                          value={condition}
                          onChange={(event) => setCondition(event.target.value)}
                          className={controlClass}
                        >
                          {conditions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                          Catatan
                        </span>
                        <input
                          type="text"
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          maxLength={2000}
                          placeholder="Contoh: perlu kalibrasi ulang"
                          className={controlClass}
                        />
                      </label>
                    </div>

                    {(condition === "DAMAGED" || condition === "MINOR_ISSUE") && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#DC2626]">
                            Kondisi terindikasi ada masalah/kerusakan
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            Buat tiket insiden agar unit langsung tercatat dan dapat ditindaklanjuti.
                          </p>
                        </div>
                        <QuickIncidentDialog
                          defaultRoomCode={request.roomCode}
                          defaultEquipmentCode={borrowable[0]?.unitCode}
                          defaultRequestId={request.id}
                          triggerLabel="Buat Tiket Insiden"
                          triggerVariant="warning"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => returnEquipment(request)}
                      disabled={busy}
                      className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
                    >
                      {busy ? "Memproses..." : "Simpan pengembalian"}
                    </button>
                  </div>
                )}

                {isExpanded && request.status === "RETURNED" && (
                  <div className="mt-3 rounded-xl border border-[#FDE68A] bg-[#FEF7E6] p-4">
                    <p className="text-[12px] font-bold text-[#8D6500]">
                      Hasil akhir inspeksi
                    </p>
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      Unit GOOD kembali AVAILABLE. Pilih MAINTENANCE bila masih
                      perlu perbaikan.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                          Status unit default
                        </span>
                        <select
                          value={inspection}
                          onChange={(event) => setInspection(event.target.value)}
                          className={controlClass}
                        >
                          <option value="AVAILABLE">AVAILABLE · siap dipakai</option>
                          <option value="MAINTENANCE">MAINTENANCE · perlu perbaikan</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                          Catatan inspeksi
                        </span>
                        <input
                          type="text"
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          maxLength={2000}
                          className={controlClass}
                        />
                      </label>

                      {borrowable.length > 1 && (
                        <div className="sm:col-span-2 mt-2 rounded-xl border border-[#E5E7EB] bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                            Status Per-Unit (Pilih jika ada kondisi berbeda)
                          </p>
                          <div className="mt-2 space-y-2">
                            {borrowable.map((item) => (
                              <div
                                key={item.unitCode}
                                className="flex items-center justify-between gap-3 text-[12px]"
                              >
                                <span className="font-medium text-[#121826]">
                                  {item.unitCode} · {item.assetName}
                                </span>
                                <select
                                  value={unitStatuses[item.unitCode] ?? inspection}
                                  onChange={(e) =>
                                    setUnitStatuses((prev) => ({
                                      ...prev,
                                      [item.unitCode]: e.target.value as "AVAILABLE" | "MAINTENANCE",
                                    }))
                                  }
                                  className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] text-[#121826] focus:border-[#FDB913] focus:outline-[#FDB913]"
                                >
                                  <option value="AVAILABLE">AVAILABLE (Siap)</option>
                                  <option value="MAINTENANCE">MAINTENANCE (Perlu dicek)</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {hasMaintenanceUnit && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#DC2626]">
                            Unit berstatus MAINTENANCE
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            Segera buka tiket insiden agar tercatat di antrian perbaikan teknisi.
                          </p>
                        </div>
                        <QuickIncidentDialog
                          defaultRoomCode={request.roomCode}
                          defaultEquipmentCode={borrowable[0]?.unitCode}
                          defaultRequestId={request.id}
                          triggerLabel="Buat Tiket Insiden"
                          triggerVariant="warning"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => complete(request, true)}
                      disabled={busy}
                      className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
                    >
                      {busy ? "Memproses..." : "Selesaikan request"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
