"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FlaskConical,
  PackageCheck,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import type { FulfillmentRequest } from "@/components/plp/types";

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

type UnitInspectionState = {
  unitCode: string;
  assetName: string;
  unitLabel?: string;
  usageType: "BORROWABLE" | "USAGE_ONLY";
  condition: "GOOD" | "MINOR_ISSUE" | "DAMAGED";
  status: "AVAILABLE" | "MAINTENANCE";
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

export function PlpManualReturnDialog({
  request,
  open,
  onClose,
  onSuccess,
}: {
  request: FulfillmentRequest;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  // 1. Units Inspection State
  const [units, setUnits] = useState<UnitInspectionState[]>(() => {
    return (request.equipment ?? []).map((eq) => ({
      unitCode: eq.unitCode,
      assetName: eq.assetName,
      unitLabel: eq.unitLabel,
      usageType: eq.usageType,
      condition: "GOOD",
      status: "AVAILABLE",
      notes: "",
    }));
  });

  // 2. Incident Reporting State
  const [reportIncident, setReportIncident] = useState(false);
  const [incidentItems, setIncidentItems] = useState<IncidentItemState[]>([
    {
      id: "inc-1",
      equipmentCode: request.equipment[0]?.unitCode || "",
      title: "",
      severity: "MEDIUM",
      description: "",
    },
  ]);

  // 3. Waste Disposal State
  const hasMaterials = Boolean(request.materials && request.materials.length > 0);
  const [reportWaste, setReportWaste] = useState(hasMaterials);
  const [containers, setContainers] = useState<AvailableContainer[] | null>(null);
  const [wasteItems, setWasteItems] = useState<WasteItemState[]>([
    {
      id: "waste-1",
      containerId: "",
      quantity: "",
      unit: "L",
      chemicalDescription:
        request.materials?.map((m) => m.name).join(", ") || "",
      notes: "",
    },
  ]);

  // 4. Overall PLP Notes & State
  const [plpNotes, setPlpNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available containers for this request's room
  useEffect(() => {
    if (!open) return;

    const params = new URLSearchParams();
    if (request.roomId) params.set("roomId", request.roomId);

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
  }, [open, request.roomId]);

  if (!open) return null;

  const containerList = containers ?? [];

  // Unit Condition Changes
  const handleUnitConditionChange = (
    unitCode: string,
    newCond: "GOOD" | "MINOR_ISSUE" | "DAMAGED",
  ) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.unitCode !== unitCode) return u;
        const nextStatus = newCond === "GOOD" ? "AVAILABLE" : "MAINTENANCE";
        return { ...u, condition: newCond, status: nextStatus };
      }),
    );

    if (newCond === "MINOR_ISSUE" || newCond === "DAMAGED") {
      setReportIncident(true);
      const targetUnit = units.find((u) => u.unitCode === unitCode);
      const unitTitle = targetUnit
        ? `${targetUnit.assetName} (${targetUnit.unitCode})`
        : "";

      setIncidentItems((prev) => {
        const existing = prev.find((x) => x.equipmentCode === unitCode);
        if (existing) {
          return prev.map((x) =>
            x.equipmentCode === unitCode && !x.title.trim() && unitTitle
              ? { ...x, title: unitTitle }
              : x,
          );
        }
        if (
          prev.length === 1 &&
          !prev[0].title.trim() &&
          !prev[0].description.trim()
        ) {
          return [
            {
              id: prev[0].id,
              equipmentCode: unitCode,
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
            equipmentCode: unitCode,
            title: unitTitle,
            severity: newCond === "DAMAGED" ? "HIGH" : "MEDIUM",
            description: "",
          },
        ];
      });
    }
  };

  const handleUnitStatusChange = (
    unitCode: string,
    newStatus: "AVAILABLE" | "MAINTENANCE",
  ) => {
    setUnits((prev) =>
      prev.map((u) => (u.unitCode === unitCode ? { ...u, status: newStatus } : u)),
    );
  };

  const handleUnitNotesChange = (unitCode: string, text: string) => {
    setUnits((prev) =>
      prev.map((u) => (u.unitCode === unitCode ? { ...u, notes: text } : u)),
    );
  };

  // Incident Handlers
  const handleAddIncident = () => {
    setIncidentItems((prev) => [
      ...prev,
      {
        id: `inc-${Date.now()}-${prev.length}`,
        equipmentCode: request.equipment[0]?.unitCode || "",
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

  // Waste Handlers
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Incidents
    if (reportIncident) {
      if (incidentItems.length === 0) {
        setError(
          "Tambahkan minimal 1 catatan kendala atau hilangkan centang lapor kendala.",
        );
        return;
      }
      for (let i = 0; i < incidentItems.length; i++) {
        const inc = incidentItems[i];
        if (!inc.title.trim()) {
          setError(`Mohon isi judul kendala pada Kendala #${i + 1}.`);
          return;
        }
        if (!inc.description.trim() || inc.description.trim().length < 5) {
          setError(
            `Mohon isi deskripsi kendala minimal 5 karakter pada Kendala #${i + 1}.`,
          );
          return;
        }
      }
    }

    // Validate Waste Disposal
    if (reportWaste) {
      if (wasteItems.length === 0) {
        setError(
          "Tambahkan minimal 1 catatan limbah atau hilangkan centang limbah.",
        );
        return;
      }
      for (let i = 0; i < wasteItems.length; i++) {
        const w = wasteItems[i];
        if (!w.containerId) {
          setError(`Pilih wadah jeriken penampung untuk Limbah #${i + 1}.`);
          return;
        }
        const qty = parseFloat(w.quantity);
        if (isNaN(qty) || qty <= 0) {
          setError(
            `Volume limbah harus berupa angka lebih dari 0 pada Limbah #${i + 1}.`,
          );
          return;
        }
        if (!w.chemicalDescription.trim()) {
          setError(
            `Deskripsikan senyawa atau cairan kimia pada Limbah #${i + 1}.`,
          );
          return;
        }

        const selC = containerList.find((c) => c.id === w.containerId);
        const curVol = Number(selC?.currentVolume) || 0;
        const maxCap = Number(selC?.maxCapacity) || 0;
        const remCap = Math.max(0, maxCap - curVol);
        if (qty > remCap + 0.001) {
          setError(
            `Volume Limbah #${i + 1} (${qty} ${w.unit}) melebihi sisa kapasitas wadah ${selC?.code || ""} (sisa: ${remCap.toFixed(2)} ${w.unit}). Silakan kurangi volume atau tambahkan catatan limbah lain untuk wadah berikutnya.`,
          );
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Determine overall condition
      let overallCondition: "GOOD" | "MINOR_ISSUE" | "DAMAGED" = "GOOD";
      if (units.some((u) => u.condition === "DAMAGED")) {
        overallCondition = "DAMAGED";
      } else if (units.some((u) => u.condition === "MINOR_ISSUE")) {
        overallCondition = "MINOR_ISSUE";
      }

      const payload = {
        condition: overallCondition,
        notes: plpNotes.trim(),
        unitConditions: units.map((u) => ({
          unitCode: u.unitCode,
          unitName: u.assetName,
          condition: u.condition,
          notes: u.notes.trim() || undefined,
        })),
        unitStatuses: units.map((u) => ({
          unitCode: u.unitCode,
          status: u.status,
          notes: u.notes.trim() || undefined,
        })),
        incidents: reportIncident
          ? incidentItems.map((inc) => ({
              title: inc.title.trim(),
              description: inc.description.trim(),
              severity: inc.severity,
              equipmentCode: inc.equipmentCode || undefined,
            }))
          : undefined,
        incident:
          reportIncident && incidentItems[0]
            ? {
                title: incidentItems[0].title.trim(),
                description: incidentItems[0].description.trim(),
                severity: incidentItems[0].severity,
                equipmentCode: incidentItems[0].equipmentCode || undefined,
              }
            : undefined,
        wastes: reportWaste
          ? wasteItems.map((w) => ({
              containerId: w.containerId,
              chemicalDescription: w.chemicalDescription.trim(),
              quantity: parseFloat(w.quantity),
              unit: w.unit,
              notes: w.notes.trim() || undefined,
            }))
          : undefined,
        waste:
          reportWaste && wasteItems[0]
            ? {
                containerId: wasteItems[0].containerId,
                chemicalDescription: wasteItems[0].chemicalDescription.trim(),
                quantity: parseFloat(wasteItems[0].quantity),
                unit: wasteItems[0].unit,
                notes: wasteItems[0].notes.trim() || undefined,
              }
            : undefined,
      };

      await apiRequest(`/api/requests/${request.id}/return`, {
        method: "POST",
        body: payload,
      });

      router.refresh();
      onSuccess?.();
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
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] overflow-hidden my-auto animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#FEF7E6] text-[#8D6500] border border-[#FDE68A]">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1E293B]">
                Pencatatan Selesai & Pengembalian Manual
              </h3>
              <p className="text-[11px] text-[#64748B]">
                <span className="font-mono font-bold text-[#1E293B]">
                  {request.code}
                </span>{" "}
                · {request.actorName} · {request.roomName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <form
          id="plp-manual-return-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-[#1E293B]"
        >
          {/* Information Notice */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-[12px] text-[#475569] leading-relaxed">
            <p>
              Formulir ini mencatat penyelesaian sesi secara langsung oleh PLP
              (misal mahasiswa telah selesai di lab namun tidak sempat mengisi form
              di portal). Sesi akan langsung ditandai <strong>SELESAI (COMPLETED)</strong>{" "}
              dan seluruh unit serta limbah akan langsung disinkronkan.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-[12px] font-medium text-[#DC2626] flex items-center gap-2"
            >
              <AlertTriangle className="size-4 shrink-0 text-[#DC2626]" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Per-Unit Inspection & Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div>
                <h4 className="text-[13px] font-bold text-[#1E293B]">
                  1. Kondisi Fisik & Status Katalog Unit ({units.length} Unit)
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Tentukan kondisi fisik dan ketersediaan tiap unit di katalog
                  laboratorium.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {units.map((unit) => {
                return (
                  <div
                    key={unit.unitCode}
                    className="rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] p-3.5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[13px] text-[#1E293B]">
                            {unit.unitCode}
                          </span>
                          <span className="text-[12px] font-medium text-[#334155]">
                            {unit.assetName}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">
                          {unit.usageType === "BORROWABLE"
                            ? "Pinjam Bawa Pulang"
                            : "Penggunaan di Meja Lab (In-Situ)"}
                        </span>
                      </div>

                      {/* Tactile Catalog Status Toggle */}
                      <div className="flex items-center gap-1 rounded-xl border border-[#CBD5E1] bg-white p-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleUnitStatusChange(unit.unitCode, "AVAILABLE")
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            unit.status === "AVAILABLE"
                              ? "bg-[#E5F5ED] text-[#048444] shadow-2xs"
                              : "text-[#64748B] hover:text-[#1E293B]"
                          }`}
                        >
                          <Check className="size-3" />
                          Siap Pakai
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUnitStatusChange(unit.unitCode, "MAINTENANCE")
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            unit.status === "MAINTENANCE"
                              ? "bg-[#FDE9E9] text-[#DC2626] shadow-2xs"
                              : "text-[#64748B] hover:text-[#1E293B]"
                          }`}
                        >
                          <Wrench className="size-3" />
                          Perbaikan
                        </button>
                      </div>
                    </div>

                    {/* Condition Selector */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E2E8F0]">
                      <span className="text-[11px] font-semibold text-[#64748B]">
                        Kondisi:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUnitConditionChange(unit.unitCode, "GOOD")
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                          unit.condition === "GOOD"
                            ? "bg-[#E5F5ED] text-[#048444] border-[#A7F3D0]"
                            : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        Baik (Normal)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUnitConditionChange(unit.unitCode, "MINOR_ISSUE")
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                          unit.condition === "MINOR_ISSUE"
                            ? "bg-[#FFF4D9] text-[#8D6500] border-[#FDE68A]"
                            : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        Kendala Ringan
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUnitConditionChange(unit.unitCode, "DAMAGED")
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                          unit.condition === "DAMAGED"
                            ? "bg-[#FDE9E9] text-[#DC2626] border-[#FECACA]"
                            : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        Rusak / Bermasalah
                      </button>
                    </div>

                    {/* Optional Unit Notes */}
                    <input
                      type="text"
                      value={unit.notes}
                      onChange={(e) =>
                        handleUnitNotesChange(unit.unitCode, e.target.value)
                      }
                      placeholder="Catatan fisik unit (contoh: kabel lengkap, lensa bersih)..."
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-[11px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Incidents / Issues */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reportIncident}
                  onChange={(e) => setReportIncident(e.target.checked)}
                  className="size-4 rounded border-[#CBD5E1] text-[#DC2626] focus:ring-[#DC2626]"
                />
                <span className="text-[13px] font-bold text-[#1E293B]">
                  2. Lapor Kendala / Kerusakan Fisik Alat
                </span>
              </label>
              {reportIncident && (
                <button
                  type="button"
                  onClick={handleAddIncident}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-bold text-[#475569] hover:bg-[#F8FAFC] transition"
                >
                  <Plus className="size-3.5" />
                  Tambah Kendala Lain
                </button>
              )}
            </div>

            {reportIncident && (
              <div className="space-y-3">
                {incidentItems.map((inc, index) => (
                  <div
                    key={inc.id}
                    className="rounded-xl border-l-2 border-[#EF4444] border-y border-r border-[#E2E8F0] bg-[#FAFAFA] p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-[#DC2626]">
                        Kendala #{index + 1}
                      </span>
                      {incidentItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIncident(inc.id)}
                          className="text-[#94A3B8] hover:text-[#DC2626] transition p-1"
                          title="Hapus Kendala"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                          Unit Terkait
                        </label>
                        <select
                          value={inc.equipmentCode}
                          onChange={(e) =>
                            handleUpdateIncident(
                              inc.id,
                              "equipmentCode",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                        >
                          {request.equipment.map((eq) => (
                            <option key={eq.unitCode} value={eq.unitCode}>
                              {eq.unitCode} · {eq.assetName}
                            </option>
                          ))}
                        </select>
                      </div>

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
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                        >
                          <option value="LOW">Rendah (Low)</option>
                          <option value="MEDIUM">Sedang (Medium)</option>
                          <option value="HIGH">Tinggi (High)</option>
                          <option value="CRITICAL">Kritis (Critical)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                        Judul Kendala <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={inc.title}
                        onChange={(e) =>
                          handleUpdateIncident(inc.id, "title", e.target.value)
                        }
                        placeholder="Contoh: Kabel power robek / sensor suhu eror"
                        className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                        Deskripsi Kendala <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={inc.description}
                        onChange={(e) =>
                          handleUpdateIncident(
                            inc.id,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Jelaskan kondisi atau kendala fisik yang ditemukan saat pengembalian..."
                        className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Waste Disposal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reportWaste}
                  onChange={(e) => setReportWaste(e.target.checked)}
                  className="size-4 rounded border-[#CBD5E1] text-[#F9B129] focus:ring-[#F9B129]"
                />
                <span className="text-[13px] font-bold text-[#1E293B]">
                  3. Pencatatan Pembuangan Limbah B3
                </span>
              </label>
              {reportWaste && (
                <button
                  type="button"
                  onClick={handleAddWaste}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-bold text-[#475569] hover:bg-[#F8FAFC] transition"
                >
                  <Plus className="size-3.5" />
                  Tambah Catatan Limbah Lain
                </button>
              )}
            </div>

            {reportWaste && (
              <div className="space-y-3">
                {containerList.length === 0 ? (
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[12px] text-[#64748B]">
                    Tidak ada wadah jeriken limbah yang aktif di laboratorium ini.
                  </div>
                ) : (
                  wasteItems.map((w, index) => {
                    const selC = containerList.find(
                      (c) => c.id === w.containerId,
                    );
                    const curVol = Number(selC?.currentVolume) || 0;
                    const maxCap = Number(selC?.maxCapacity) || 0;
                    const remCap = Math.max(0, maxCap - curVol);
                    const qtyNum = parseFloat(w.quantity);
                    const isOver =
                      !isNaN(qtyNum) && qtyNum > remCap + 0.001;

                    return (
                      <div
                        key={w.id}
                        className="rounded-xl border-l-2 border-[#F9B129] border-y border-r border-[#E2E8F0] bg-[#FAFAFA] p-3.5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-[#1E293B] flex items-center gap-1.5">
                            <FlaskConical className="size-3.5 text-[#F9B129]" />
                            Catatan Limbah #{index + 1}
                          </span>
                          {wasteItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveWaste(w.id)}
                              className="text-[#94A3B8] hover:text-[#DC2626] transition p-1"
                              title="Hapus Limbah"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                              Wadah Jeriken Penampung <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={w.containerId}
                              onChange={(e) =>
                                handleUpdateWaste(
                                  w.id,
                                  "containerId",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                            >
                              {containerList.map((c) => {
                                const cRem = Math.max(
                                  0,
                                  Number(c.maxCapacity) - Number(c.currentVolume),
                                );
                                return (
                                  <option key={c.id} value={c.id}>
                                    [{c.code}] {c.name} · Sisa: {cRem.toFixed(2)}{" "}
                                    {c.unit}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                              Volume Limbah ({w.unit}){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={w.quantity}
                                onChange={(e) =>
                                  handleUpdateWaste(
                                    w.id,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                placeholder={`Maks: ${remCap.toFixed(2)}`}
                                className={`w-full rounded-xl border bg-white px-3 py-2 text-[12px] font-mono text-[#1E293B] outline-none ${
                                  isOver
                                    ? "border-[#DC2626] focus:border-[#DC2626]"
                                    : "border-[#CBD5E1] focus:border-[#F9B129]"
                                }`}
                              />
                              <span className="text-[12px] font-bold text-[#64748B]">
                                {w.unit}
                              </span>
                            </div>
                            {isOver && (
                              <p className="mt-1 text-[11px] text-[#DC2626]">
                                Melebihi sisa kapasitas wadah ({remCap.toFixed(2)}{" "}
                                {w.unit}). Sesuaikan atau tambah catatan limbah
                                baru.
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                            Deskripsi Senyawa / Cairan Kimia{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={w.chemicalDescription}
                            onChange={(e) =>
                              handleUpdateWaste(
                                w.id,
                                "chemicalDescription",
                                e.target.value,
                              )
                            }
                            placeholder="Contoh: Larutan sisa titrasi HCl 0.1M dan Aquades"
                            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                            Catatan Limbah (Opsional)
                          </label>
                          <input
                            type="text"
                            value={w.notes}
                            onChange={(e) =>
                              handleUpdateWaste(w.id, "notes", e.target.value)
                            }
                            placeholder="Catatan penanganan limbah..."
                            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-[11px] text-[#1E293B] outline-none focus:border-[#F9B129]"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Section 4: General PLP Verification Notes */}
          <div className="space-y-2 border-t border-[#E2E8F0] pt-4">
            <label className="text-[12px] font-bold text-[#1E293B] block">
              4. Catatan Verifikasi Akhir PLP (Opsional)
            </label>
            <textarea
              rows={2}
              value={plpNotes}
              onChange={(e) => setPlpNotes(e.target.value)}
              placeholder="Contoh: Sesi pengembalian telah diverifikasi lengkap langsung di meja sirkulasi lab."
              className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129]"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="border-t border-[#E2E8F0] px-6 py-4 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-[#64748B]">
            Status request akan langsung diset <strong>COMPLETED</strong>.
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="plp-manual-return-form"
              disabled={submitting}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F9B129] px-5 text-[12px] font-bold text-[#212121] shadow-2xs transition hover:bg-[#E5A020] focus-visible:outline-[#F9B129] disabled:opacity-60"
            >
              <CheckCircle2 className="size-4" />
              {submitting ? "Menyimpan & Menyelesaikan..." : "Simpan & Selesaikan Sesi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
