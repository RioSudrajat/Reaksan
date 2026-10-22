"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FlaskConical,
  PackageCheck,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import type { ScheduleEvent } from "@/components/schedule-data";
import type { StudentReturnInput } from "@/validators/requests";

export type AvailableContainer = {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  categoryColorHex?: string | null;
  categoryHazardBadge?: string | null;
  currentVolume: string;
  maxCapacity: string;
  unit: string;
  percentage: number;
};

type UnitConditionState = {
  unitId: string;
  unitCode: string;
  name: string;
  unitLabel?: string;
  classification?: "INSTRUMENT" | "TOOL";
  condition: "GOOD" | "MINOR_ISSUE" | "DAMAGED";
  notes: string;
};

type IncidentItemState = {
  id: string;
  equipmentCode: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
};

type WasteItemState = {
  id: string;
  containerId: string;
  quantity: string;
  unit: string;
  chemicalDescription: string;
  notes: string;
};

export function StudentReturnDialog({
  event,
  open,
  onClose,
  onSuccess,
}: {
  event: ScheduleEvent;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  // Form State - Equipment Conditions per Unit
  const [unitConditions, setUnitConditions] = useState<UnitConditionState[]>(
    () => {
      return (event.equipment ?? []).map((eq) => ({
        unitId: eq.unitId || eq.id,
        unitCode: eq.unitId || eq.id,
        name: eq.name,
        unitLabel: eq.unitLabel,
        classification: eq.classification,
        condition: "GOOD" as const,
        notes: "",
      }));
    },
  );
  const [generalCondition, setGeneralCondition] = useState<
    "GOOD" | "MINOR_ISSUE" | "DAMAGED"
  >("GOOD");
  const [generalNotes, setGeneralNotes] = useState("");

  // Form State - Multiple Incidents / Issues
  const [reportIncident, setReportIncident] = useState(false);
  const [incidentItems, setIncidentItems] = useState<IncidentItemState[]>([
    {
      id: "inc-1",
      equipmentCode:
        event.equipment?.[0]?.unitId ?? event.equipment?.[0]?.id ?? "",
      title: "",
      severity: "MEDIUM",
      description: "",
    },
  ]);

  // Form State - Multiple Waste Disposal Entries
  const hasMaterials = Boolean(
    event.materials && event.materials.length > 0,
  );
  const [reportWaste, setReportWaste] = useState(hasMaterials);
  const [containers, setContainers] = useState<AvailableContainer[] | null>(null);
  const loadingContainers = open && containers === null;
  const containerList = containers ?? [];

  const [wasteItems, setWasteItems] = useState<WasteItemState[]>([
    {
      id: "waste-1",
      containerId: "",
      quantity: "",
      unit: "L",
      chemicalDescription: event.materials?.map((m) => m.name).join(", ") || "",
      notes: "",
    },
  ]);

  // Submitting & status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available containers for the room
  useEffect(() => {
    if (!open) return;

    const params = new URLSearchParams();
    if (event.roomId) params.set("roomId", event.roomId);

    fetch(`/api/waste/containers/available?${params.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setContainers(res.data);
          if (res.data.length > 0) {
            const firstC = res.data[0];
            setWasteItems((prev) =>
              prev.map((item) => ({
                ...item,
                containerId: item.containerId || firstC.id,
                unit: item.containerId ? item.unit : firstC.unit || "L",
              })),
            );
          }
        } else {
          setContainers([]);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat wadah limbah:", err);
        setContainers([]);
      });
  }, [open, event.roomId]);

  if (!open) return null;

  const handleUnitConditionChange = (
    unitId: string,
    newCond: "GOOD" | "MINOR_ISSUE" | "DAMAGED",
  ) => {
    setUnitConditions((prev) =>
      prev.map((u) => (u.unitId === unitId ? { ...u, condition: newCond } : u)),
    );
    if (newCond === "MINOR_ISSUE" || newCond === "DAMAGED") {
      setReportIncident(true);
      const unit = unitConditions.find((u) => u.unitId === unitId);
      const unitTitle = unit ? `${unit.name} (${unit.unitLabel || unit.unitCode})` : "";
      setIncidentItems((prev) => {
        const existing = prev.find((x) => x.equipmentCode === unitId);
        if (existing) {
          return prev.map((x) =>
            x.equipmentCode === unitId && !x.title.trim() && unitTitle
              ? { ...x, title: unitTitle }
              : x,
          );
        }
        if (prev.length === 1 && !prev[0].title.trim() && !prev[0].description.trim()) {
          return [
            {
              id: prev[0].id,
              equipmentCode: unitId,
              title: unitTitle,
              severity: newCond === "DAMAGED" ? "HIGH" : "MEDIUM",
              description: "",
            },
          ];
        }
        return [
          ...prev,
          {
            id: `inc-${Date.now()}-${prev.length}`,
            equipmentCode: unitId,
            title: unitTitle,
            severity: newCond === "DAMAGED" ? "HIGH" : "MEDIUM",
            description: "",
          },
        ];
      });
    }
  };

  const handleUnitNotesChange = (unitId: string, val: string) => {
    setUnitConditions((prev) =>
      prev.map((u) => (u.unitId === unitId ? { ...u, notes: val } : u)),
    );
  };

  const handleAddIncident = () => {
    setIncidentItems((prev) => [
      ...prev,
      {
        id: `inc-${Date.now()}-${prev.length}`,
        equipmentCode:
          event.equipment?.[0]?.unitId ?? event.equipment?.[0]?.id ?? "",
        title: "",
        severity: "MEDIUM",
        description: "",
      },
    ]);
  };

  const handleRemoveIncident = (id: string) => {
    setIncidentItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateIncident = (
    id: string,
    field: keyof Omit<IncidentItemState, "id">,
    value: string,
  ) => {
    setIncidentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddWaste = () => {
    const defaultC = containerList[0];
    setWasteItems((prev) => [
      ...prev,
      {
        id: `waste-${Date.now()}-${prev.length}`,
        containerId: defaultC?.id || "",
        quantity: "",
        unit: defaultC?.unit || "L",
        chemicalDescription: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveWaste = (id: string) => {
    setWasteItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateWaste = (
    id: string,
    field: keyof Omit<WasteItemState, "id">,
    value: string,
  ) => {
    setWasteItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "containerId") {
          const c = containerList.find((x) => x.id === value);
          return {
            ...item,
            containerId: value,
            unit: c?.unit || item.unit || "L",
          };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.requestId) return;

    // Incident validation
    if (reportIncident) {
      if (incidentItems.length === 0) {
        setError("Tambahkan minimal 1 laporan kendala atau nonaktifkan centang lapor kendala.");
        return;
      }
      for (let i = 0; i < incidentItems.length; i++) {
        const item = incidentItems[i];
        if (!item.title.trim()) {
          setError(`Mohon isi judul isu/kendala untuk Kendala #${i + 1}.`);
          return;
        }
        if (!item.description.trim()) {
          setError(`Mohon isi deskripsi kendala yang terjadi untuk Kendala #${i + 1}.`);
          return;
        }
      }
    }

    // Waste validation
    if (reportWaste) {
      if (wasteItems.length === 0) {
        setError("Tambahkan minimal 1 catatan limbah atau nonaktifkan centang limbah.");
        return;
      }
      for (let i = 0; i < wasteItems.length; i++) {
        const item = wasteItems[i];
        if (!item.containerId) {
          setError(`Mohon pilih wadah penampung untuk Limbah #${i + 1}.`);
          return;
        }
        if (!item.quantity || Number(item.quantity) <= 0) {
          setError(`Mohon isi volume limbah dengan angka lebih dari 0 untuk Limbah #${i + 1}.`);
          return;
        }
        if (!item.chemicalDescription.trim()) {
          setError(`Mohon deskripsikan cairan/senyawa untuk Limbah #${i + 1}.`);
          return;
        }
        const selContainer = containerList.find((c) => c.id === item.containerId);
        const curVol = Number(selContainer?.currentVolume) || 0;
        const maxCap = Number(selContainer?.maxCapacity) || 0;
        const remCap = Math.max(0, maxCap - curVol);
        const qty = parseFloat(item.quantity);
        if (!isNaN(qty) && qty > remCap + 0.001) {
          setError(
            `Volume Limbah #${i + 1} (${qty} ${item.unit}) melebihi sisa kapasitas wadah ${selContainer?.code || ""} (sisa: ${remCap.toFixed(2)} ${item.unit}). Silakan sesuaikan atau klik "Tambah Catatan Limbah Lain" untuk membagi sisanya.`,
          );
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Determine overall condition from units
      let overallCondition: "GOOD" | "MINOR_ISSUE" | "DAMAGED" | "UNKNOWN" = "GOOD";
      if (unitConditions.length > 0) {
        if (unitConditions.some((u) => u.condition === "DAMAGED")) {
          overallCondition = "DAMAGED";
        } else if (unitConditions.some((u) => u.condition === "MINOR_ISSUE")) {
          overallCondition = "MINOR_ISSUE";
        }
      } else {
        overallCondition = generalCondition;
      }

      const payload: StudentReturnInput = {
        condition: overallCondition,
        notes: generalNotes.trim(),
      };

      if (unitConditions.length > 0) {
        payload.unitConditions = unitConditions.map((u) => ({
          unitId: u.unitId,
          unitCode: u.unitCode,
          unitName: u.name,
          condition: u.condition,
          notes: u.notes.trim() || undefined,
        }));
      }

      if (reportIncident && incidentItems.length > 0) {
        payload.incidents = incidentItems.map((inc) => ({
          title: inc.title.trim(),
          description: inc.description.trim(),
          severity: inc.severity,
          equipmentCode: inc.equipmentCode || undefined,
        }));
        payload.incident = payload.incidents[0];
      }

      if (reportWaste && wasteItems.length > 0) {
        payload.wastes = wasteItems.map((item) => ({
          containerId: item.containerId,
          chemicalDescription: item.chemicalDescription.trim(),
          quantity: Number(item.quantity),
          unit: item.unit,
          notes: item.notes.trim() || undefined,
        }));
        payload.waste = payload.wastes[0];
      }

      await apiRequest(`/api/requests/${event.requestId}/submit-return`, {
        method: "POST",
        body: payload,
      });

      router.refresh();
      if (onSuccess) onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-[#E5E7EB] text-[#121826]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#FEF7E6] text-[#D97706]">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#1E293B]">
                Selesaikan & Kembalikan
              </h3>
              <p className="text-[11px] text-[#64748B]">
                {event.requestCode || event.title} · {event.roomName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#DC2626] font-medium"
            >
              {error}
            </div>
          )}

          {event.returnRejectionReason && (
            <div className="rounded-xl border border-[#FDE68A] bg-[#FEF7E6] p-3.5 text-[12px] text-[#8D6500]">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="size-4 shrink-0" />
                Catatan dari PLP Sebelumnya:
              </p>
              <p className="mt-1 text-[#6B5900] leading-relaxed">
                {event.returnRejectionReason}
              </p>
            </div>
          )}

          {/* Section 1: Kondisi & Kelengkapan Alat (Per Unit Terpisah) */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#475569]">
                1. Kondisi & Kelengkapan Alat
              </span>
              <span className="text-[11px] font-medium text-[#64748B]">
                Wajib diisi
              </span>
            </div>

            {unitConditions.length > 0 ? (
              <div className="mt-3 space-y-3.5">
                <p className="text-[11px] text-[#64748B]">
                  Periksa dan laporkan kondisi setiap unit alat/instrumen yang Anda pinjam secara terpisah:
                </p>

                {unitConditions.map((u, idx) => (
                  <div
                    key={u.unitId || idx}
                    className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`size-2 rounded-full shrink-0 ${
                            u.condition === "GOOD"
                              ? "bg-[#10B981]"
                              : u.condition === "MINOR_ISSUE"
                                ? "bg-[#F59E0B]"
                                : "bg-[#EF4444]"
                          }`}
                        />
                        <span className="text-[12px] font-bold text-[#1E293B] truncate">
                          {u.unitLabel || u.unitCode} · {u.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          u.classification === "INSTRUMENT"
                            ? "bg-[#FEF7E6] text-[#8D6500] border border-[#FDE68A]"
                            : "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]"
                        }`}
                      >
                        {u.classification === "INSTRUMENT" ? "Instrumen" : "Alat Lab"}
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                        Kondisi Fisik
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "GOOD", label: "Baik", desc: "Lengkap & normal" },
                          {
                            value: "MINOR_ISSUE",
                            label: "Kendala",
                            desc: "Ada masalah kecil",
                          },
                          {
                            value: "DAMAGED",
                            label: "Rusak",
                            desc: "Perlu perbaikan",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              handleUnitConditionChange(
                                u.unitId,
                                opt.value as "GOOD" | "MINOR_ISSUE" | "DAMAGED",
                              )
                            }
                            className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-2 text-center transition ${
                              u.condition === opt.value
                                ? opt.value === "GOOD"
                                  ? "border-[#10B981] bg-[#F0FDF4] text-[#166534] font-bold shadow-xs"
                                  : opt.value === "MINOR_ISSUE"
                                    ? "border-[#F9B129] bg-[#FEF7E6] text-[#8D6500] font-bold shadow-xs"
                                    : "border-[#EF4444] bg-[#FEF2F2] text-[#991B1B] font-bold shadow-xs"
                                : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <span className="text-[11px] font-semibold">{opt.label}</span>
                            <span className="text-[9px] opacity-75">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={u.notes}
                        onChange={(e) =>
                          handleUnitNotesChange(u.unitId, e.target.value)
                        }
                        placeholder={`Catatan kondisi untuk ${u.unitLabel || u.unitCode} (opsional)...`}
                        className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] text-[#1E293B] focus:border-[#F9B129] focus:bg-white focus:outline-none transition"
                        maxLength={500}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                    Catatan Umum Pengembalian (Opsional)
                  </label>
                  <input
                    type="text"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Contoh: Semua alat sudah dibersihkan dan meja praktikum dirapikan"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                    maxLength={1000}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                    Kondisi fisik setelah digunakan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "GOOD", label: "Baik (Good)", desc: "Lengkap & normal" },
                      {
                        value: "MINOR_ISSUE",
                        label: "Kendala",
                        desc: "Ada masalah kecil",
                      },
                      {
                        value: "DAMAGED",
                        label: "Rusak",
                        desc: "Perlu perbaikan",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setGeneralCondition(
                            opt.value as "GOOD" | "MINOR_ISSUE" | "DAMAGED",
                          );
                          if (opt.value === "DAMAGED" || opt.value === "MINOR_ISSUE") {
                            setReportIncident(true);
                          }
                        }}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                          generalCondition === opt.value
                            ? "border-[#F9B129] bg-[#FEF7E6] text-[#8D6500] font-bold shadow-xs"
                            : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        <span className="text-[12px] font-semibold">{opt.label}</span>
                        <span className="text-[10px] opacity-75">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                    Catatan Pengembalian
                  </label>
                  <input
                    type="text"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Contoh: Sesi praktikum selesai, meja laboratorium sudah dibersihkan"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                    maxLength={2000}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Lapor Isu / Kendala Praktikum (Bisa Tambah Kendala Lain) */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reportIncident}
                  onChange={(e) => setReportIncident(e.target.checked)}
                  className="size-4 rounded border-[#CBD5E1] text-[#F9B129] focus:ring-[#F9B129]"
                />
                <span className="text-[12px] font-bold text-[#1E293B]">
                  2. Lapor Kendala / Kerusakan Alat
                </span>
              </label>
              <span className="text-[11px] text-[#64748B]">
                {reportIncident ? "Aktif" : "Opsional"}
              </span>
            </div>

            {reportIncident && (
              <div className="mt-4 space-y-4 border-t border-[#E2E8F0] pt-3">
                <p className="text-[11px] text-[#64748B]">
                  Laporkan setiap kendala atau kerusakan alat yang terjadi selama pemakaian:
                </p>

                <div className="space-y-3">
                  {incidentItems.map((inc, index) => (
                    <div
                      key={inc.id}
                      className="rounded-xl border border-[#CBD5E1] bg-white p-3.5 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                        <span className="text-[11px] font-bold text-[#DC2626] flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5" />
                          Kendala #{index + 1}
                        </span>
                        {incidentItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIncident(inc.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#DC2626] hover:text-[#991B1B] p-0.5 rounded transition"
                          >
                            <Trash2 className="size-3.5" />
                            Hapus
                          </button>
                        )}
                      </div>

                      {unitConditions.length > 0 && (
                        <div>
                          <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                            Pilih Alat yang Mengalami Kendala
                          </label>
                          <select
                            value={inc.equipmentCode}
                            onChange={(e) =>
                              handleUpdateIncident(inc.id, "equipmentCode", e.target.value)
                            }
                            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                          >
                            {unitConditions.map((u) => (
                              <option key={u.unitId} value={u.unitId}>
                                {u.unitLabel || u.unitCode} · {u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                          Judul Kendala / Masalah <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={inc.title}
                          onChange={(e) =>
                            handleUpdateIncident(inc.id, "title", e.target.value)
                          }
                          placeholder="Contoh: Lensa objektif 100x berembun / tombol power macet"
                          className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                          maxLength={200}
                          required={reportIncident}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                            Tingkat Keparahan
                          </label>
                          <select
                            value={inc.severity}
                            onChange={(e) =>
                              handleUpdateIncident(
                                inc.id,
                                "severity",
                                e.target.value as
                                  | "LOW"
                                  | "MEDIUM"
                                  | "HIGH"
                                  | "CRITICAL",
                              )
                            }
                            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                          >
                            <option value="LOW">Rendah (Dapat dipakai)</option>
                            <option value="MEDIUM">Sedang (Perlu dicek)</option>
                            <option value="HIGH">Tinggi (Tidak bisa dipakai)</option>
                            <option value="CRITICAL">Kritis (Berbahaya/Patah)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                            Waktu Kejadian
                          </label>
                          <input
                            type="text"
                            disabled
                            value="Saat sesi berlangsung"
                            className="w-full rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] px-3 py-2 text-[12px] text-[#64748B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                          Kronologi & Penjelasan Masalah <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={inc.description}
                          onChange={(e) =>
                            handleUpdateIncident(inc.id, "description", e.target.value)
                          }
                          placeholder="Jelaskan secara singkat apa yang terjadi saat alat digunakan..."
                          className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                          maxLength={2000}
                          required={reportIncident}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddIncident}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[12px] font-bold text-[#475569] hover:text-[#1E293B] flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <Plus className="size-4" />
                  Tambah Laporan Kendala Lain
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Catat Pembuangan Limbah Kimia (Bisa Tambah Limbah Lain) */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reportWaste}
                  onChange={(e) => setReportWaste(e.target.checked)}
                  className="size-4 rounded border-[#CBD5E1] text-[#F9B129] focus:ring-[#F9B129]"
                />
                <span className="text-[12px] font-bold text-[#1E293B]">
                  3. Catat Pembuangan Limbah Kimia
                </span>
              </label>
              <span className="text-[11px] text-[#64748B]">
                {hasMaterials ? "Disarankan (Ada Bahan Kimia)" : "Opsional"}
              </span>
            </div>

            {reportWaste && (
              <div className="mt-4 space-y-4 border-t border-[#E2E8F0] pt-3">
                {loadingContainers ? (
                  <p className="text-[12px] text-[#64748B] animate-pulse">
                    Memuat daftar wadah jeriken limbah...
                  </p>
                ) : containerList.length === 0 ? (
                  <div className="rounded-lg border border-[#FDE68A] bg-[#FEF7E6] p-3 text-[12px] text-[#8D6500]">
                    Tidak ada wadah jeriken limbah aktif di ruangan ini. Hubungi PLP jika Anda menghasilkan limbah B3.
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-[#64748B]">
                      Catat setiap jenis limbah yang dibuang ke wadah jeriken laboratorium yang sesuai:
                    </p>

                    <div className="space-y-3">
                      {wasteItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[#CBD5E1] bg-white p-3.5 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                            <span className="text-[11px] font-bold text-[#7C3AED] flex items-center gap-1.5">
                              <FlaskConical className="size-3.5" />
                              Limbah #{index + 1}
                            </span>
                            {wasteItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveWaste(item.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#DC2626] hover:text-[#991B1B] p-0.5 rounded transition"
                              >
                                <Trash2 className="size-3.5" />
                                Hapus
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                              Pilih Jeriken / Wadah Penampung <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={item.containerId}
                              onChange={(e) =>
                                handleUpdateWaste(item.id, "containerId", e.target.value)
                              }
                              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                              required={reportWaste}
                            >
                              {containerList.map((c) => {
                                const cur = Number(c.currentVolume) || 0;
                                const max = Number(c.maxCapacity) || 0;
                                const rem = Math.max(0, max - cur);
                                return (
                                  <option key={c.id} value={c.id}>
                                    {c.code} · {c.name} ({c.categoryName}) — Sisa ruang: {rem.toFixed(1)} {c.unit} (Kapasitas: {max} {c.unit})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {(() => {
                            const sel = containerList.find((c) => c.id === item.containerId);
                            const cur = Number(sel?.currentVolume) || 0;
                            const max = Number(sel?.maxCapacity) || 0;
                            const rem = Math.max(0, max - cur);
                            const qVal = parseFloat(item.quantity);
                            const isOver = !isNaN(qVal) && qVal > rem + 0.001;

                            return (
                              <>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[11px] font-semibold text-[#64748B]">
                                        Volume / Jumlah <span className="text-red-500">*</span>
                                      </label>
                                      {sel && (
                                        <span className="text-[10px] text-[#64748B]">
                                          Sisa wadah: <strong>{rem.toFixed(1)} {item.unit}</strong>
                                        </span>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={rem > 0 ? rem : undefined}
                                        value={item.quantity}
                                        onChange={(e) =>
                                          handleUpdateWaste(item.id, "quantity", e.target.value)
                                        }
                                        placeholder="Contoh: 0.5"
                                        className={`w-full rounded-xl border px-3 py-2 text-[12px] text-[#1E293B] focus:outline-none ${
                                          isOver
                                            ? "border-[#EF4444] bg-[#FEF2F2] focus:border-[#EF4444]"
                                            : "border-[#CBD5E1] bg-white focus:border-[#F9B129]"
                                        }`}
                                        required={reportWaste}
                                      />
                                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#64748B]">
                                        {item.unit}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                                      Deskripsi Senyawa / Bahan <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={item.chemicalDescription}
                                      onChange={(e) =>
                                        handleUpdateWaste(item.id, "chemicalDescription", e.target.value)
                                      }
                                      placeholder="Contoh: Sisa larutan HCl 0.1M dan akuades"
                                      className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                                      maxLength={500}
                                      required={reportWaste}
                                    />
                                  </div>
                                </div>

                                {isOver && (
                                  <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-[11px] text-[#DC2626] flex items-start gap-2">
                                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-[#DC2626]" />
                                    <div className="space-y-0.5">
                                      <p className="font-bold">
                                        Volume melebihi sisa kapasitas wadah ini ({rem.toFixed(2)} {item.unit})!
                                      </p>
                                      <p className="text-[#991B1B]">
                                        Jeriken fisik tidak dapat menampung melebihi kapasitasnya. Silakan isi maksimal {rem.toFixed(2)} {item.unit} di wadah ini, lalu gunakan tombol <strong>&ldquo;Tambah Catatan Limbah Lain&rdquo;</strong> di bawah untuk membuang sisanya ke jeriken lain.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          <div>
                            <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                              Catatan Pembuangan Limbah
                            </label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) =>
                                handleUpdateWaste(item.id, "notes", e.target.value)
                              }
                              placeholder="Contoh: Sudah dinetralkan dengan NaHCO3 sebelum dibuang"
                              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] focus:border-[#F9B129] focus:outline-none"
                              maxLength={1000}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddWaste}
                      className="w-full py-2.5 rounded-xl border border-dashed border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[12px] font-bold text-[#475569] hover:text-[#1E293B] flex items-center justify-center gap-1.5 transition shadow-2xs"
                    >
                      <Plus className="size-4" />
                      Tambah Catatan Limbah Lain
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC] transition disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F9B129] px-5 text-[12px] font-bold text-[#1E293B] hover:bg-[#F7B742] transition shadow-xs disabled:opacity-60"
            >
              <PackageCheck className="size-4" />
              {submitting ? "Mengirim Laporan..." : "Kirim & Ajukan Pengembalian"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
