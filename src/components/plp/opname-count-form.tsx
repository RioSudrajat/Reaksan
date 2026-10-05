"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Filter,
  Flame,
  Gift,
  MapPin,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";
import { BarcodeScannerModal } from "./barcode-scanner-modal";
import { OpnameIntakeDialog } from "./opname-intake-dialog";
import { QrTagDialog } from "@/components/qr/qr-tag-dialog";

export type OpnameCountEntry = {
  id: string;
  itemType: "MATERIAL" | "TOOL" | "INSTRUMENT";
  materialBatchId: string | null;
  equipmentAssetId: string | null;
  equipmentUnitId: string | null;
  materialCode: string;
  materialName: string;
  lotNumber: string | null;
  qrCode: string | null;
  condition: string | null;
  storageLocation: string | null;
  entrySource: string;
  varianceReason: string | null;
  unit: string;
  baseline: number;
  counted: number;
};

type MaterialOption = {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
  category?: string | null;
};

const varianceReasonLabels: Record<string, string> = {
  NORMAL_EVAPORATION: "Susut Evaporasi Wajar",
  SPILL_DAMAGE: "Tumpah / Pecah / Rusak",
  EXPIRED_SPOILED: "Kadaluarsa / Rusak",
  RETURNED_LEFTOVER: "Pengembalian Sisa Praktikum",
  GRANT_INTAKE: "Penerimaan Hibah",
  COUNT_CORRECTION: "Koreksi Catatan",
  OTHER: "Lainnya",
};

const conditionOptions = [
  { value: "GOOD", label: "Baik (Utuh / Siap Pakai)", color: "text-[#03683A]" },
  {
    value: "MINOR_ISSUE",
    label: "Cacat Minor (Retak Halus / Aus)",
    color: "text-[#A86419]",
  },
  {
    value: "DAMAGED",
    label: "Rusak / Pecah / Tidak Berfungsi",
    color: "text-[#9E3636]",
  },
];

export function OpnameCountForm({
  sessionId,
  entries,
  materials = [],
}: {
  sessionId: string;
  entries: OpnameCountEntry[];
  materials?: MaterialOption[];
}) {
  const router = useRouter();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<
    "ALL" | "MATERIAL" | "TOOL" | "INSTRUMENT"
  >("ALL");

  // Field states keyed by entry.id
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(entries.map((entry) => [entry.id, String(entry.counted)])),
  );
  const [conditions, setConditions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      entries.map((entry) => [entry.id, entry.condition ?? "GOOD"]),
    ),
  );
  const [varianceReasons, setVarianceReasons] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        entries.map((entry) => [
          entry.id,
          entry.varianceReason ??
            (entry.entrySource === "GRANT_HIBAH"
              ? "GRANT_INTAKE"
              : entry.entrySource === "LEFTOVER_RETURN"
                ? "RETURNED_LEFTOVER"
                : "NORMAL_EVAPORATION"),
        ]),
      ),
  );
  const [storageLocations, setStorageLocations] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      entries.map((entry) => [entry.id, entry.storageLocation ?? ""]),
    ),
  );

  // Filter states
  const [search, setSearch] = useState("");
  const [shelfFilter, setShelfFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DISCREPANCY" | "DAMAGED" | "INTAKE" | "UNCOUNTED"
  >("ALL");

  // UX states
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const rowRefs = useRef<
    Record<string, HTMLDivElement | HTMLTableRowElement | null>
  >({});

  // Counts by category
  const materialCount = useMemo(
    () => entries.filter((e) => e.itemType === "MATERIAL").length,
    [entries],
  );
  const toolCount = useMemo(
    () => entries.filter((e) => e.itemType === "TOOL").length,
    [entries],
  );
  const instrumentCount = useMemo(
    () => entries.filter((e) => e.itemType === "INSTRUMENT").length,
    [entries],
  );

  // Extract unique storage locations for filter dropdown
  const uniqueShelves = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.storageLocation?.trim()) {
        set.add(e.storageLocation.trim());
      }
    });
    return Array.from(set).sort();
  }, [entries]);

  const shelfCounts = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      const loc = e.storageLocation?.trim();
      if (loc) {
        map[loc] = (map[loc] ?? 0) + 1;
      }
    });
    return map;
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Tab category filter
      if (activeTab !== "ALL" && entry.itemType !== activeTab) {
        return false;
      }

      // 2. Text Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = entry.materialName.toLowerCase().includes(q);
        const matchCode = entry.materialCode.toLowerCase().includes(q);
        const matchLot = entry.lotNumber?.toLowerCase().includes(q) ?? false;
        const matchQr = entry.qrCode?.toLowerCase().includes(q) ?? false;
        const matchLoc =
          entry.storageLocation?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchCode && !matchLot && !matchQr && !matchLoc) {
          return false;
        }
      }

      // 3. Shelf / Meja Filter
      if (shelfFilter !== "ALL") {
        if ((entry.storageLocation ?? "").trim() !== shelfFilter) {
          return false;
        }
      }

      // 4. Status Filter
      const curCount = Number(values[entry.id] ?? entry.counted);
      const isDiscrepant = Math.abs(curCount - entry.baseline) > 1e-9;
      const isDamaged =
        conditions[entry.id] === "DAMAGED" ||
        (entry.itemType !== "MATERIAL" && curCount === 0);
      const isIntake = entry.entrySource !== "SYSTEM_PLANNED";

      if (statusFilter === "DISCREPANCY" && !isDiscrepant) return false;
      if (statusFilter === "DAMAGED" && !isDamaged) return false;
      if (statusFilter === "INTAKE" && !isIntake) return false;
      if (statusFilter === "UNCOUNTED") {
        if (isDiscrepant || isIntake || isDamaged) return false;
      }

      return true;
    });
  }, [entries, activeTab, search, shelfFilter, statusFilter, values, conditions]);

  // Barcode / Scanner Match Handler
  function handleScannerSelect(selectedId: string) {
    // Look for matching entry either by id, materialBatchId, or equipmentUnitId
    const matched = entries.find(
      (e) =>
        e.id === selectedId ||
        e.materialBatchId === selectedId ||
        e.equipmentUnitId === selectedId ||
        e.qrCode === selectedId,
    );

    if (matched) {
      setActiveTab(matched.itemType);
      setHighlightedId(matched.id);
      setSearch("");
      setShelfFilter("ALL");
      setStatusFilter("ALL");

      setTimeout(() => {
        const el = rowRefs.current[matched.id];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);

      setTimeout(() => {
        setHighlightedId(null);
      }, 3500);
    }
  }

  async function save(entry: OpnameCountEntry) {
    const parsed = Number(values[entry.id]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Isi jumlah fisik dengan angka 0 atau lebih.");
      return;
    }
    setPendingId(entry.id);
    setSavedId(null);
    setError("");

    try {
      await apiRequest(`/api/plp/opname/${sessionId}/count`, {
        method: "POST",
        body: {
          entryId: entry.id,
          materialBatchId: entry.materialBatchId ?? undefined,
          equipmentAssetId: entry.equipmentAssetId ?? undefined,
          equipmentUnitId: entry.equipmentUnitId ?? undefined,
          countedQuantity: parsed,
          condition:
            entry.itemType !== "MATERIAL" ? conditions[entry.id] : undefined,
          varianceReason:
            entry.itemType === "MATERIAL"
              ? varianceReasons[entry.id]
              : undefined,
          storageLocation: storageLocations[entry.id]?.trim() || undefined,
        },
      });
      setSavedId(entry.id);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <OpnameIntakeDialog sessionId={sessionId} materials={materials} />
        </div>
        <p className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-4 py-8 text-center text-[12px] text-[#6B6B6B]">
          Sesi ini belum memiliki item aktif. Anda dapat mencatat bahan hibah
          atau sisa praktikum menggunakan tombol di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] px-4 py-3 text-[12px] font-medium text-[#9E3636]"
        >
          {error}
        </p>
      )}
      {savedId && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-[#BFE3CE] bg-[#E5F5ED] px-4 py-3 text-[12px] font-medium text-[#03683A]"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          Jumlah fisik dan status item berhasil disimpan.
        </p>
      )}

      {/* Category Tabs: Bahan vs Alat vs Instrumen */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
            activeTab === "ALL"
              ? "bg-[#FDB913] text-[#121826] shadow-xs"
              : "text-[#64748B] hover:text-[#121826] hover:bg-white/60"
          }`}
        >
          <span>Semua Stok</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            activeTab === "ALL"
              ? "bg-[#121826] text-white"
              : "bg-[#E5E7EB] text-[#64748B]"
          }`}>
            {entries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("MATERIAL")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
            activeTab === "MATERIAL"
              ? "bg-[#FDB913] text-[#121826] shadow-xs"
              : "text-[#64748B] hover:text-[#121826] hover:bg-white/60"
          }`}
        >
          <Flame className="size-3.5 text-[#DC2626]" />
          <span>Bahan Kimia</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            activeTab === "MATERIAL"
              ? "bg-[#121826] text-white"
              : "border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
          }`}>
            {materialCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TOOL")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
            activeTab === "TOOL"
              ? "bg-[#FDB913] text-[#121826] shadow-xs"
              : "text-[#64748B] hover:text-[#121826] hover:bg-white/60"
          }`}
        >
          <span>Alat Praktikum (Glassware)</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            activeTab === "TOOL"
              ? "bg-[#121826] text-white"
              : "border border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
          }`}>
            {toolCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("INSTRUMENT")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
            activeTab === "INSTRUMENT"
              ? "bg-[#FDB913] text-[#121826] shadow-xs"
              : "text-[#64748B] hover:text-[#121826] hover:bg-white/60"
          }`}
        >
          <Wrench className="size-3.5 text-[#121826]" />
          <span>Instrumen Lab</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            activeTab === "INSTRUMENT"
              ? "bg-[#121826] text-white"
              : "border border-[#E5E7EB] bg-white text-[#121826]"
          }`}>
            {instrumentCount}
          </span>
        </button>
      </div>

      {/* Toolbar: Search, Shelves, Scanner & Intake */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode (RK-UNT/MAT), nama barang, lot, atau meja/rak..."
              className={`${controlClass} pl-9`}
            />
          </div>

          {/* Action Buttons: Scanner & Intake */}
          <div className="flex items-center gap-2 shrink-0">
            <BarcodeScannerModal
              items={entries.map((e) => ({
                id: e.id,
                materialBatchId: e.materialBatchId ?? undefined,
                equipmentUnitId: e.equipmentUnitId ?? undefined,
                materialCode: e.materialCode,
                materialName: e.materialName,
                code: e.materialCode,
                name: e.materialName,
                lotNumber: e.lotNumber,
                qrCode: e.qrCode,
                storageLocation: e.storageLocation,
                itemType: e.itemType,
              }))}
              onItemSelect={handleScannerSelect}
            />
            <OpnameIntakeDialog sessionId={sessionId} materials={materials} />
          </div>
        </div>

        {/* Filters bar: Shelves and Status */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] pt-1 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <Filter className="size-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">
              Lokasi:
            </span>
          </div>

          {/* Shelf dropdown */}
          <select
            value={shelfFilter}
            onChange={(e) => setShelfFilter(e.target.value)}
            className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#121826]"
          >
            <option value="ALL">
              Semua Lokasi (Meja/Rak/Gudang - {uniqueShelves.length})
            </option>
            {uniqueShelves.map((shelf) => (
              <option key={shelf} value={shelf}>
                📍 {shelf} ({shelfCounts[shelf] ?? 0})
              </option>
            ))}
          </select>

          {/* Status chips */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "ALL"
                  ? "bg-[#121826] text-white"
                  : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8F9FA]"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("DISCREPANCY")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "DISCREPANCY"
                  ? "border border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
                  : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8F9FA]"
              }`}
            >
              Ada Selisih
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("DAMAGED")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "DAMAGED"
                  ? "border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                  : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8F9FA]"
              }`}
            >
              Rusak / Pecah
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INTAKE")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "INTAKE"
                  ? "border border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]"
                  : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8F9FA]"
              }`}
            >
              Hibah / Sisa
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("UNCOUNTED")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "UNCOUNTED"
                  ? "border border-[#E5E7EB] bg-[#F8F9FA] text-[#121826]"
                  : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8F9FA]"
              }`}
            >
              Sesuai Baseline
            </button>
          </div>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8F9FA] p-8 text-center text-[12px] text-[#64748B]">
          Tidak ada item yang cocok dengan tab kategori atau pencarian ini.
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="divide-y divide-[#E5E7EB] sm:hidden rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
            {filteredEntries.map((entry) => {
              const currentVal = values[entry.id] ?? String(entry.counted);
              const curParsed = Number(currentVal);
              const diff =
                Math.round((curParsed - entry.baseline) * 1000) / 1000;
              const hasDiff = Math.abs(diff) > 1e-9;
              const isHighlighted = highlightedId === entry.id;
              const isMaterial = entry.itemType === "MATERIAL";

              return (
                <div
                  key={entry.id}
                  ref={(el) => {
                    rowRefs.current[entry.id] = el;
                  }}
                  className={`p-4 space-y-3 transition-colors ${
                    isHighlighted ? "bg-amber-50 ring-2 ring-amber-400" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                            entry.itemType === "MATERIAL"
                              ? "bg-rose-100 text-rose-800"
                              : entry.itemType === "TOOL"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {entry.itemType === "MATERIAL"
                            ? "Bahan"
                            : entry.itemType === "TOOL"
                              ? "Alat"
                              : "Instrumen"}
                        </span>
                        <p className="text-[13px] font-bold text-[#212121]">
                          {entry.materialName}
                        </p>
                        {entry.entrySource === "GRANT_HIBAH" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F5ED] px-2 py-0.5 text-[10px] font-bold text-[#03683A]">
                            <Gift className="size-3" /> Hibah
                          </span>
                        )}
                        {entry.entrySource === "LEFTOVER_RETURN" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF0FC] px-2 py-0.5 text-[10px] font-bold text-[#38529B]">
                            <Sparkles className="size-3" /> Sisa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#929292]">
                        {entry.materialCode}{" "}
                        {entry.lotNumber ? `· ${entry.lotNumber}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <QrTagDialog
                        item={{
                          targetType: isMaterial ? "BATCH" : (entry.equipmentAssetId ? "ASSET" : "UNIT"),
                          targetId:
                            (isMaterial
                              ? entry.materialBatchId
                              : (entry.equipmentAssetId ?? entry.equipmentUnitId)) ?? entry.id,
                          code: entry.materialCode,
                          name: entry.materialName,
                          classification: entry.itemType,
                          storageLocation: storageLocations[entry.id],
                          qrCode: entry.qrCode,
                        }}
                      />
                      <span className="text-[11px] text-[#6B6B6B]">
                        Base: {entry.baseline} {entry.unit}
                      </span>
                    </div>
                  </div>

                  {/* Lokasi Meja / Rak */}
                  <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B]">
                    <MapPin className="size-3 text-[#929292]" />
                    <input
                      type="text"
                      value={storageLocations[entry.id] ?? ""}
                      onChange={(e) =>
                        setStorageLocations((curr) => ({
                          ...curr,
                          [entry.id]: e.target.value,
                        }))
                      }
                      placeholder={
                        isMaterial
                          ? "Rak / Lemari Reagen..."
                          : "Meja Praktikum / Rak Gantung..."
                      }
                      className="rounded border border-[#E1E1E1] bg-white px-2 py-1 text-[11px] text-[#212121] w-full max-w-[240px]"
                    />
                  </div>

                  {/* Input Jumlah Fisik & Diff Indicator */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold uppercase text-[#929292] block mb-1">
                        Jumlah Fisik ({entry.unit})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={isMaterial ? "any" : "1"}
                        value={currentVal}
                        onChange={(e) =>
                          setValues((curr) => ({
                            ...curr,
                            [entry.id]: e.target.value,
                          }))
                        }
                        className={controlClass}
                      />
                    </div>

                    <div className="text-right pt-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                          diff > 0
                            ? "bg-[#E5F5ED] text-[#03683A]"
                            : diff < 0
                              ? "bg-[#FDE9E9] text-[#9E3636]"
                              : "bg-[#FAFAFA] text-[#6B6B6B]"
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff} {entry.unit}
                      </span>
                    </div>
                  </div>

                  {/* Kondisi Fisik Alat / Instrumen */}
                  {!isMaterial && (
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-[#929292] block mb-1">
                        Kondisi Fisik:
                      </label>
                      <select
                        value={conditions[entry.id] ?? "GOOD"}
                        onChange={(e) =>
                          setConditions((curr) => ({
                            ...curr,
                            [entry.id]: e.target.value,
                          }))
                        }
                        className={`${controlClass} text-[11px] py-1.5`}
                      >
                        {conditionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Alasan Selisih bila Bahan berbeda */}
                  {isMaterial && hasDiff && (
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-[#929292] block mb-1">
                        Alasan Selisih:
                      </label>
                      <select
                        value={
                          varianceReasons[entry.id] ?? "NORMAL_EVAPORATION"
                        }
                        onChange={(e) =>
                          setVarianceReasons((curr) => ({
                            ...curr,
                            [entry.id]: e.target.value,
                          }))
                        }
                        className={`${controlClass} text-[11px] py-1.5`}
                      >
                        {Object.entries(varianceReasonLabels).map(
                          ([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => save(entry)}
                      disabled={pendingId !== null}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] disabled:opacity-60"
                    >
                      <Check className="size-3.5" />
                      {pendingId === entry.id ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Input jumlah fisik dan kondisi per item laboratorium
              </caption>
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-[0.08em] text-[#64748B] bg-[#F8F9FA]">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Item & Kode
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Tag QR
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Lokasi (Meja/Rak/Gudang)
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Baseline
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold min-w-[130px]">
                    Jumlah Fisik
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Selisih
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold min-w-[160px]">
                    Kondisi / Alasan
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F0EC]">
                {filteredEntries.map((entry) => {
                  const currentVal = values[entry.id] ?? String(entry.counted);
                  const curParsed = Number(currentVal);
                  const diff =
                    Math.round((curParsed - entry.baseline) * 1000) / 1000;
                  const hasDiff = Math.abs(diff) > 1e-9;
                  const isHighlighted = highlightedId === entry.id;
                  const isMaterial = entry.itemType === "MATERIAL";

                  return (
                    <tr
                      key={entry.id}
                      ref={(el) => {
                        rowRefs.current[entry.id] = el;
                      }}
                      className={`transition-colors hover:bg-[#FAFAFA] ${
                        isHighlighted ? "bg-amber-50 ring-2 ring-amber-400" : ""
                      }`}
                    >
                      {/* Item & Kode */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                              entry.itemType === "MATERIAL"
                                ? "bg-rose-100 text-rose-800"
                                : entry.itemType === "TOOL"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {entry.itemType === "MATERIAL"
                              ? "Bahan"
                              : entry.itemType === "TOOL"
                                ? "Alat"
                                : "Instrumen"}
                          </span>
                          <p className="text-[12px] font-bold text-[#212121]">
                            {entry.materialName}
                          </p>
                          {entry.entrySource === "GRANT_HIBAH" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E5F5ED] px-2 py-0.5 text-[9px] font-bold text-[#03683A]">
                              <Gift className="size-2.5" /> Hibah
                            </span>
                          )}
                          {entry.entrySource === "LEFTOVER_RETURN" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EBF0FC] px-2 py-0.5 text-[9px] font-bold text-[#38529B]">
                              <Sparkles className="size-2.5" /> Sisa
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#929292]">
                          {entry.materialCode}{" "}
                          {entry.lotNumber ? `· ${entry.lotNumber}` : ""}
                        </p>
                      </td>

                      {/* Tag QR */}
                      <td className="px-3 py-3">
                        <QrTagDialog
                          item={{
                            targetType: isMaterial ? "BATCH" : (entry.equipmentAssetId ? "ASSET" : "UNIT"),
                            targetId:
                              (isMaterial
                                ? entry.materialBatchId
                                : (entry.equipmentAssetId ?? entry.equipmentUnitId)) ?? entry.id,
                            code: entry.materialCode,
                            name: entry.materialName,
                            classification: entry.itemType,
                            storageLocation: storageLocations[entry.id],
                            qrCode: entry.qrCode,
                          }}
                        />
                      </td>

                      {/* Lokasi Rak / Meja */}
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={storageLocations[entry.id] ?? ""}
                          onChange={(e) =>
                            setStorageLocations((curr) => ({
                              ...curr,
                              [entry.id]: e.target.value,
                            }))
                          }
                          placeholder={
                            isMaterial ? "Rak reagen..." : "Meja / Rak..."
                          }
                          className="rounded border border-[#E1E1E1] bg-white px-2 py-1 text-[11px] text-[#212121] w-32 hover:border-[#6E8EDA]"
                        />
                      </td>

                      {/* Baseline */}
                      <td className="px-3 py-3 text-[12px] text-[#6B6B6B] tabular-nums font-medium">
                        {entry.baseline} {entry.unit}
                      </td>

                      {/* Jumlah Fisik */}
                      <td className="px-3 py-3">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            step={isMaterial ? "any" : "1"}
                            value={currentVal}
                            onChange={(e) =>
                              setValues((curr) => ({
                                ...curr,
                                [entry.id]: e.target.value,
                              }))
                            }
                            className={`${controlClass} pr-10 text-[12px] font-semibold py-1.5`}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[11px] text-[#929292]">
                            {entry.unit}
                          </span>
                        </div>
                      </td>

                      {/* Selisih */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                            diff > 0
                              ? "bg-[#E5F5ED] text-[#03683A]"
                              : diff < 0
                                ? "bg-[#FDE9E9] text-[#9E3636]"
                                : "bg-[#FAFAFA] text-[#6B6B6B]"
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>

                      {/* Kondisi / Alasan */}
                      <td className="px-3 py-3">
                        {!isMaterial ? (
                          <select
                            value={conditions[entry.id] ?? "GOOD"}
                            onChange={(e) =>
                              setConditions((curr) => ({
                                ...curr,
                                [entry.id]: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-[#E1E1E1] bg-white px-2 py-1 text-[11px] font-medium text-[#212121] w-full"
                          >
                            {conditionOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : hasDiff ? (
                          <select
                            value={
                              varianceReasons[entry.id] ??
                              "NORMAL_EVAPORATION"
                            }
                            onChange={(e) =>
                              setVarianceReasons((curr) => ({
                                ...curr,
                                [entry.id]: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-[#E1E1E1] bg-white px-2 py-1 text-[11px] text-[#212121] w-full"
                          >
                            {Object.entries(varianceReasonLabels).map(
                              ([k, label]) => (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        ) : (
                          <span className="text-[11px] text-[#C1C1C1]">-</span>
                        )}
                      </td>

                      {/* Aksi Simpan */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => save(entry)}
                          disabled={pendingId !== null}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[11px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
                        >
                          <Check className="size-3 text-[#16A34A]" />
                          {pendingId === entry.id ? "..." : "Simpan"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-[11px] text-[#929292] pt-2">
        <p>
          Menampilkan {filteredEntries.length} dari total {entries.length} item.
        </p>
        <p>
          Data tersimpan akan diperhitungkan saat sesi opname diselesaikan &
          direkonsiliasi.
        </p>
      </div>
    </div>
  );
}
