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
      <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-5 py-10 text-center">
        <Undo2 className="mx-auto size-6 text-[#929292]" aria-hidden="true" />
        <p className="mt-3 text-[13px] font-semibold text-[#212121]">
          Tidak ada pengembalian atau inspeksi
        </p>
        <p className="mt-1 text-[12px] text-[#6B6B6B]">
          Request aktif dan yang sudah dikembalikan akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]" />
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
          className="rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] px-4 py-3 text-[12px] font-medium text-[#9E3636]"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#BFE3CE] bg-[#E5F5ED] px-4 py-3 text-[12px] font-medium text-[#03683A]"
        >
          {success}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-6 text-center text-[12px] text-[#6B6B6B]">
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
              <li key={request.id} className="rounded-2xl border border-[#E1E1E1] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#212121]">
                      {request.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#929292]">
                      {request.code} · {request.actorName} · {request.roomName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6B6B6B] [font-variant-numeric:tabular-nums]">
                      {formatRange(request.startAt, request.endAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue && returning && (
                      <span className="rounded-full bg-[#FDE9E9] px-2.5 py-1 text-[11px] font-bold text-[#9E3636]">
                        Lewat tenggat
                      </span>
                    )}
                    <RequestStatusBadge status={request.status} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {borrowable.length > 0 && (
                    <span className="rounded-full bg-[#E9EEFC] px-2.5 py-1 font-semibold text-[#38529B]">
                      {borrowable.length} borrowable harus dikembalikan
                    </span>
                  )}
                  {usageOnly.length > 0 && (
                    <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 font-semibold text-[#5D5B53]">
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
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
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
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
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
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
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
                  <div className="mt-3 rounded-xl border border-[#F2D9A4] bg-[#FFFDF7] p-4">
                    <p className="text-[12px] font-semibold text-[#5D4A1B]">
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
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#F45959]/30 bg-[#FDE9E9]/40 p-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#9E3636]">
                            Kondisi terindikasi ada masalah/kerusakan
                          </p>
                          <p className="text-[11px] text-[#6B6B6B]">
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
                      className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
                    >
                      {busy ? "Memproses..." : "Simpan pengembalian"}
                    </button>
                  </div>
                )}

                {isExpanded && request.status === "RETURNED" && (
                  <div className="mt-3 rounded-xl border border-[#F2D9A4] bg-[#FFFDF7] p-4">
                    <p className="text-[12px] font-semibold text-[#5D4A1B]">
                      Hasil akhir inspeksi
                    </p>
                    <p className="mt-1 text-[11px] text-[#6B6B6B]">
                      Unit GOOD kembali AVAILABLE. Pilih MAINTENANCE bila masih
                      perlu perbaikan.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
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
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
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
                        <div className="sm:col-span-2 mt-2 rounded-xl border border-[#EEEEEE] bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B6B6B]">
                            Status Per-Unit (Pilih jika ada kondisi berbeda)
                          </p>
                          <div className="mt-2 space-y-2">
                            {borrowable.map((item) => (
                              <div
                                key={item.unitCode}
                                className="flex items-center justify-between gap-3 text-[12px]"
                              >
                                <span className="font-medium text-[#212121]">
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
                                  className="rounded-lg border border-[#E1E1E1] bg-white px-2.5 py-1 text-[11px]"
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
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#F45959]/30 bg-[#FDE9E9]/40 p-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#9E3636]">
                            Unit berstatus MAINTENANCE
                          </p>
                          <p className="text-[11px] text-[#6B6B6B]">
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
                      className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
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
