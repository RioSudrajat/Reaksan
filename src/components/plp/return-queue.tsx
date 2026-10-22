"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  PackageCheck,
  Search,
  Undo2,
  Wrench,
  XCircle,
} from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { QuickIncidentDialog } from "@/components/plp/quick-incident-dialog";
import { PlpManualReturnDialog } from "@/components/plp/plp-manual-return-dialog";
import {
  RequestStatusBadge,
  formatRange,
} from "@/components/workspace";
import type { FulfillmentRequest } from "@/components/plp/types";

export function ReturnQueue({ requests }: { requests: FulfillmentRequest[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [unitStatuses, setUnitStatuses] = useState<
    Record<string, "AVAILABLE" | "MAINTENANCE">
  >({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Reject Return Dialog State
  const [rejectingRequest, setRejectingRequest] =
    useState<FulfillmentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Comprehensive Manual Return Dialog State
  const [manualReturnRequest, setManualReturnRequest] =
    useState<FulfillmentRequest | null>(null);

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const eqText = r.equipment
      .map((e) => `${e.unitCode} ${e.assetName}`)
      .join(" ")
      .toLowerCase();
    const matText = r.materials
      .map((m) => m.name)
      .join(" ")
      .toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.actorName.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.roomName.toLowerCase().includes(q) ||
      eqText.includes(q) ||
      matText.includes(q)
    );
  });

  const handleOpenInspection = (req: FulfillmentRequest) => {
    if (expanded === req.id) {
      setExpanded(null);
      return;
    }
    setExpanded(req.id);
    setError("");
    setNotes("");

    // Smart pre-fill for ALL equipment in this request
    const initialStatuses: Record<string, "AVAILABLE" | "MAINTENANCE"> = {};
    const submissionConditions = req.returnSubmission?.unitConditions ?? [];
    const reportedGeneral = req.returnSubmission?.condition ?? "GOOD";

    req.equipment.forEach((item) => {
      const studentReport = submissionConditions.find(
        (u) => u.unitCode === item.unitCode,
      );
      if (studentReport) {
        initialStatuses[item.unitCode] =
          studentReport.condition === "GOOD" ? "AVAILABLE" : "MAINTENANCE";
      } else {
        initialStatuses[item.unitCode] =
          reportedGeneral === "DAMAGED" || reportedGeneral === "MINOR_ISSUE"
            ? "MAINTENANCE"
            : "AVAILABLE";
      }
    });
    setUnitStatuses(initialStatuses);
  };

  // 1. PLP Confirm & Complete Return
  async function confirmReturn(
    request: FulfillmentRequest,
    withInspection: boolean,
  ) {
    setPendingId(request.id);
    setError("");
    setSuccess("");

    const overrides = Object.entries(unitStatuses).map(([unitCode, status]) => {
      const item = request.equipment.find((e) => e.unitCode === unitCode);
      const unitId = item?.id ?? item?.unitId;
      return { unitId: unitId || undefined, unitCode, status };
    });

    const hasAnyMaintenance = Object.values(unitStatuses).includes("MAINTENANCE");

    try {
      await apiRequest(`/api/plp/requests/${request.id}/confirm-return`, {
        method: "POST",
        body: withInspection
          ? {
              notes: notes.trim(),
              equipmentStatus: hasAnyMaintenance ? "MAINTENANCE" : "AVAILABLE",
              unitStatuses: overrides.length > 0 ? overrides : undefined,
            }
          : { notes: notes.trim() },
      });
      setSuccess(
        `${request.code} berhasil dikonfirmasi dan diselesaikan. Unit telah disinkronkan ke katalog siap pakai.`,
      );
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

  // 2. PLP Reject / Request Revision on Return
  async function handleRejectReturn() {
    if (!rejectingRequest || !rejectReason.trim()) return;
    setPendingId(rejectingRequest.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/api/plp/requests/${rejectingRequest.id}/reject-return`,
        {
          method: "POST",
          body: { reason: rejectReason.trim() },
        },
      );
      setSuccess(
        `Pengembalian ${rejectingRequest.code} ditolak. Mahasiswa telah diberi notifikasi untuk revisi.`,
      );
      setRejectingRequest(null);
      setRejectReason("");
      setExpanded(null);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama mahasiswa, alat, lab..."
            aria-label="Cari pengembalian"
            className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-9 pr-3 text-[13px] text-[#1E293B] shadow-2xs outline-none transition placeholder:text-[#94A3B8] focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
          />
        </div>
        <p className="text-[12px] font-medium text-[#64748B]">
          Menampilkan <strong className="text-[#1E293B]">{filtered.length}</strong> request
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-medium text-[#DC2626] flex items-center gap-2"
        >
          <AlertTriangle className="size-4 shrink-0 text-[#DC2626]" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[12px] font-medium text-[#16A34A] flex items-center gap-2"
        >
          <CheckCircle2 className="size-4 shrink-0 text-[#16A34A]" />
          <span>{success}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center text-[#64748B]">
          <PackageCheck className="size-8 mx-auto text-[#94A3B8] mb-2" />
          <p className="text-[13px] font-semibold text-[#1E293B]">
            Tidak ada pengembalian yang ditemukan
          </p>
          <p className="text-[12px] mt-0.5">
            {search.trim()
              ? `Tidak ada yang cocok dengan pencarian "${search}".`
              : "Antrean pengembalian saat ini kosong."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((request) => {
            const overdue = request.overdue;
            const returning =
              request.status === "ACTIVE" || request.status === "OVERDUE";
            const isUnissued =
              !request.issuedAt &&
              (request.status === "ACTIVE" || request.status === "OVERDUE");
            const isAwaitingConfirmation = request.status === "RETURNED";
            const isExpanded = expanded === request.id;
            const busy = pendingId === request.id;
            const hasMaintenanceUnit = Object.values(unitStatuses).some(
              (s) => s === "MAINTENANCE",
            );
            const equipmentOptions = request.equipment.map((e) => ({
              code: e.unitCode,
              label: `${e.unitCode} · ${e.assetName}`,
            }));

            // Student submission preview
            const submission = request.returnSubmission;
            const reportedCondition = submission?.condition ?? "GOOD";
            const wastesList =
              submission?.wastes || (submission?.waste ? [submission.waste] : []);
            const incidentsList =
              submission?.incidents ||
              (submission?.incident ? [submission.incident] : []);

            return (
              <li
                key={request.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs transition-all hover:border-[#CBD5E1]"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-[14px] font-bold text-[#1E293B]">
                        {request.title}
                      </h3>
                      {isAwaitingConfirmation && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FEF7E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#8D6500]">
                          <PackageCheck className="size-3.5" />
                          Menunggu Konfirmasi PLP
                        </span>
                      )}
                      {overdue && returning && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                          <Clock className="size-3" />
                          Lewat Tenggat
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#64748B]">
                      <span className="font-mono font-medium text-[#1E293B]">
                        {request.code}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-[#334155]">
                        {request.actorName}
                      </span>
                      <span>•</span>
                      <span>{request.roomName}</span>
                      <span>•</span>
                      <span className="font-medium [font-variant-numeric:tabular-nums]">
                        {formatRange(request.startAt, request.endAt)}
                      </span>
                    </div>

                    {/* Clean Monochromatic Summary Metadata (Quiet surfaces, no rainbow pill clutter) */}
                    <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
                      <span className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg">
                        <strong>{request.equipment.length}</strong> unit alat
                      </span>
                      {request.materials.length > 0 && (
                        <span className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg">
                          <strong>{request.materials.length}</strong> bahan
                        </span>
                      )}
                      {wastesList.length > 0 && (
                        <span className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg text-[#1E293B] font-medium">
                          {wastesList.length} catatan limbah
                        </span>
                      )}
                      {incidentsList.length > 0 && (
                        <span className="bg-[#F8FAFC] border border-[#FECACA] px-2.5 py-1 rounded-lg text-[#DC2626] font-medium">
                          {incidentsList.length} laporan kendala
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <RequestStatusBadge status={request.status} />
                  </div>
                </div>

                {/* Student Submission Slip: Clean Laboratory Verification Slip (Anti-Slop Design) */}
                {isAwaitingConfirmation && submission && (
                  <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs space-y-3.5">
                    {/* Header of Slip */}
                    <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-[#64748B]" />
                        <span className="font-bold text-[#1E293B] text-[13px]">
                          Laporan Mandiri Mahasiswa
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">
                          (Diserahkan saat selesai sesi)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#64748B]">Kondisi Keseluruhan:</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-md text-[11px] border ${
                            reportedCondition === "GOOD"
                              ? "bg-[#E5F5ED] text-[#048444] border-[#A7F3D0]"
                              : reportedCondition === "MINOR_ISSUE"
                                ? "bg-[#FFF4D9] text-[#8D6500] border-[#FDE68A]"
                                : "bg-[#FDE9E9] text-[#DC2626] border-[#FECACA]"
                          }`}
                        >
                          {reportedCondition === "GOOD"
                            ? "Baik / Normal"
                            : reportedCondition === "MINOR_ISSUE"
                              ? "Ada Kendala Ringan"
                              : "Rusak / Bermasalah"}
                        </span>
                      </div>
                    </div>

                    {/* Unit Conditions List */}
                    {submission.unitConditions &&
                      submission.unitConditions.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                            Pemeriksaan Fisik Per-Unit:
                          </p>
                          <div className="divide-y divide-[#F1F5F9] rounded-xl border border-[#E2E8F0] bg-[#FAFAFA]">
                            {submission.unitConditions.map((u, uIdx) => (
                              <div
                                key={u.unitCode || uIdx}
                                className="flex items-center justify-between px-3.5 py-2 text-[12px]"
                              >
                                <div className="min-w-0 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-[#1E293B]">
                                      {u.unitCode}
                                    </span>
                                    {u.unitName && (
                                      <span className="text-[#475569] font-medium truncate">
                                        {u.unitName}
                                      </span>
                                    )}
                                  </div>
                                  {u.notes && (
                                    <p className="text-[11px] text-[#64748B] italic mt-0.5">
                                      &ldquo;{u.notes}&rdquo;
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`font-semibold px-2 py-0.5 rounded-md text-[10px] shrink-0 border ${
                                    u.condition === "GOOD"
                                      ? "bg-[#E5F5ED] text-[#048444] border-[#A7F3D0]"
                                      : u.condition === "MINOR_ISSUE"
                                        ? "bg-[#FFF4D9] text-[#8D6500] border-[#FDE68A]"
                                        : "bg-[#FDE9E9] text-[#DC2626] border-[#FECACA]"
                                  }`}
                                >
                                  {u.condition === "GOOD"
                                    ? "Baik"
                                    : u.condition === "MINOR_ISSUE"
                                      ? "Ada Kendala"
                                      : "Rusak"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Reported Incidents (Quiet elegant accent strip, NO AI-slop pink card) */}
                    {incidentsList.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5" />
                          Laporan Kerusakan / Isu ({incidentsList.length} kendala)
                        </p>
                        <div className="space-y-1.5">
                          {incidentsList.map((inc, iIdx) => (
                            <div
                              key={iIdx}
                              className="rounded-xl border-l-2 border-[#EF4444] border-y border-r border-[#E2E8F0] bg-[#FAFAFA] p-3 text-[12px] space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#1E293B]">
                                  {inc.title}{" "}
                                  {inc.equipmentCode ? (
                                    <span className="font-mono font-normal text-[#64748B]">
                                      · {inc.equipmentCode}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-white border border-[#FECACA] text-[#DC2626]">
                                  {inc.severity}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#475569] leading-relaxed">
                                {inc.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reported Waste Logs (Quiet elegant amber accent, NO AI-slop purple card) */}
                    {wastesList.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                          <FlaskConical className="size-3.5 text-[#F9B129]" />
                          Pencatatan Pembuangan Limbah B3 ({wastesList.length} jenis)
                        </p>
                        <div className="space-y-1.5">
                          {wastesList.map((w, wIdx) => (
                            <div
                              key={wIdx}
                              className="rounded-xl border-l-2 border-[#F9B129] border-y border-r border-[#E2E8F0] bg-[#FAFAFA] p-3 text-[12px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between text-[12px]">
                                <span className="font-bold text-[#1E293B]">
                                  {w.chemicalDescription}
                                </span>
                                <span className="font-mono font-bold [font-variant-numeric:tabular-nums] text-[#1E293B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md text-[11px]">
                                  {w.quantity} {w.unit}
                                </span>
                              </div>
                              {w.notes && (
                                <p className="text-[11px] text-[#64748B]">
                                  Catatan: &ldquo;{w.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Student General Notes */}
                    {submission.notes && (
                      <div className="border-l-2 border-[#CBD5E1] pl-3 py-1 text-[12px] text-[#475569]">
                        <span className="font-semibold text-[#1E293B]">
                          Catatan Mahasiswa:
                        </span>{" "}
                        &ldquo;{submission.notes}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Action Row */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {isAwaitingConfirmation && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenInspection(request)}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-[12px] font-bold transition shadow-2xs ${
                          isExpanded
                            ? "border border-[#CBD5E1] bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
                            : "bg-[#F9B129] text-[#212121] hover:bg-[#E5A020] focus-visible:outline-[#F9B129]"
                        }`}
                      >
                        <CheckCircle2 className="size-4" />
                        {isExpanded
                          ? "Tutup Pemeriksaan"
                          : "Periksa & Konfirmasi Pengembalian"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRejectingRequest(request);
                          setRejectReason("");
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#DC2626] transition"
                      >
                        <XCircle className="size-4" />
                        Tolak / Minta Revisi
                      </button>
                    </>
                  )}

                  {returning && isUnissued && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setNotes(
                          "Request ditutup karena alat tidak pernah diambil oleh mahasiswa hingga batas waktu berakhir.",
                        );
                        confirmReturn(request, false);
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#DC2626] px-4 text-[12px] font-bold text-white shadow-2xs transition hover:bg-[#B91C1C] disabled:opacity-60"
                    >
                      <CheckCircle2 className="size-4" />
                      {busy ? "Memproses..." : "Tutup Request (Alat Tidak Diambil)"}
                    </button>
                  )}

                  {returning && !isUnissued && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-[#64748B]">
                        Menunggu mahasiswa menekan selesai di My Calendar...
                      </span>
                      <button
                        type="button"
                        onClick={() => setManualReturnRequest(request)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 text-[11px] font-bold text-[#475569] hover:bg-[#F8FAFC] transition shadow-2xs"
                      >
                        <Undo2 className="size-3.5" />
                        Catat Manual oleh PLP
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Box: Clean Lab Physical Inspection Sheet */}
                {isExpanded && isAwaitingConfirmation && (
                  <div className="mt-4 rounded-2xl border border-[#CBD5E1] bg-white p-5 shadow-xs space-y-5 animate-in fade-in-50 duration-200">
                    <div className="border-b border-[#E2E8F0] pb-3">
                      <h4 className="text-[14px] font-bold text-[#1E293B]">
                        Lembar Kerja Inspeksi Fisik & Konfirmasi PLP
                      </h4>
                      <p className="mt-0.5 text-[12px] text-[#64748B]">
                        Verifikasi kondisi fisik masing-masing unit di lab. Unit yang disetel <strong>Siap Pakai</strong> akan otomatis kembali tersedia di katalog.
                      </p>
                    </div>

                    {/* Unit Inspection Checklist (ALL units in request) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[12px] font-bold text-[#1E293B] uppercase tracking-wider">
                          Daftar Unit Sesi ({request.equipment.length} unit):
                        </label>
                        <span className="text-[11px] text-[#64748B]">
                          Klik status untuk tiap unit
                        </span>
                      </div>

                      <div className="space-y-2">
                        {request.equipment.map((item) => {
                          const currentStatus =
                            unitStatuses[item.unitCode] ?? "AVAILABLE";
                          const studentReport =
                            submission?.unitConditions?.find(
                              (u) => u.unitCode === item.unitCode,
                            );

                          return (
                            <div
                              key={item.unitCode}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] p-3.5"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-[13px] text-[#1E293B]">
                                    {item.unitCode}
                                  </span>
                                  <span className="text-[12px] font-medium text-[#334155]">
                                    {item.assetName}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#E2E8F0] bg-white text-[#64748B]">
                                    {item.usageType === "BORROWABLE"
                                      ? "Pinjam Bawa Pulang"
                                      : "In-Situ / Meja Lab"}
                                  </span>
                                </div>

                                {studentReport && (
                                  <p className="text-[11px] text-[#64748B]">
                                    Laporan Mahasiswa:{" "}
                                    <strong
                                      className={
                                        studentReport.condition === "GOOD"
                                          ? "text-[#048444]"
                                          : "text-[#DC2626]"
                                      }
                                    >
                                      {studentReport.condition === "GOOD"
                                        ? "Baik (Normal)"
                                        : "Ada Kendala"}
                                    </strong>
                                    {studentReport.notes &&
                                      ` — "${studentReport.notes}"`}
                                  </p>
                                )}
                              </div>

                              {/* Tactile Segmented Control Buttons */}
                              <div className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUnitStatuses((prev) => ({
                                      ...prev,
                                      [item.unitCode]: "AVAILABLE",
                                    }))
                                  }
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                                    currentStatus === "AVAILABLE"
                                      ? "bg-[#E5F5ED] text-[#048444] shadow-2xs"
                                      : "text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]"
                                  }`}
                                >
                                  <Check className="size-3.5" />
                                  Siap Pakai (Available)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUnitStatuses((prev) => ({
                                      ...prev,
                                      [item.unitCode]: "MAINTENANCE",
                                    }))
                                  }
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                                    currentStatus === "MAINTENANCE"
                                      ? "bg-[#FDE9E9] text-[#DC2626] shadow-2xs"
                                      : "text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]"
                                  }`}
                                >
                                  <Wrench className="size-3.5" />
                                  Perlu Perbaikan (Maintenance)
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Maintenance Alert Notification */}
                    {hasMaintenanceUnit && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#DC2626] flex items-center gap-1.5">
                            <AlertTriangle className="size-4 shrink-0" />
                            Unit berstatus MAINTENANCE
                          </p>
                          <p className="text-[11px] text-[#991B1B] mt-0.5">
                            Unit yang disetel maintenance akan otomatis dikarantina dari katalog siap pakai agar tidak dipinjam pengguna lain sebelum diperbaiki.
                          </p>
                        </div>
                        <QuickIncidentDialog
                          defaultRoomCode={request.roomCode}
                          defaultEquipmentCode={request.equipment[0]?.unitCode}
                          defaultRequestId={request.id}
                          availableEquipment={equipmentOptions}
                          triggerLabel="Buat Tiket Teknisi Tambahan"
                          triggerVariant="warning"
                        />
                      </div>
                    )}

                    {/* Verification Notes */}
                    <div>
                      <label className="text-[12px] font-semibold text-[#1E293B] block mb-1.5">
                        Catatan Verifikasi & Pemeriksaan PLP
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        maxLength={2000}
                        placeholder="Contoh: Alat lengkap dan bersih, limbah telah dimasukkan ke jeriken pelarut."
                        className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-[12px] text-[#1E293B] outline-none focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => setExpanded(null)}
                        className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC]"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmReturn(request, true)}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F9B129] px-5 text-[12px] font-bold text-[#212121] shadow-2xs transition hover:bg-[#E5A020] focus-visible:outline-[#F9B129] disabled:opacity-60"
                      >
                        <CheckCircle2 className="size-4" />
                        {busy ? "Menyelesaikan..." : "Konfirmasi & Selesaikan Request"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Reject Return Modal */}
      {rejectingRequest && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#DC2626]">
                <XCircle className="size-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#1E293B]">
                  Tolak Pengembalian
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {rejectingRequest.code} · {rejectingRequest.actorName}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[12px] text-[#475569] leading-relaxed">
              Jelaskan alasan penolakan agar mahasiswa dapat melengkapi atau
              memperbaiki (contoh: kabel tertinggal, meja belum dibersihkan, atau
              alat belum diserahkan ke meja PLP).
            </p>

            <div className="mt-3">
              <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Kabel power dan probe pH meter belum diletakkan di rak pengembalian."
                className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-[12px] text-[#1E293B] focus:border-[#DC2626] focus:outline-none"
                maxLength={2000}
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || pendingId === rejectingRequest.id}
                onClick={handleRejectReturn}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC2626] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#B91C1C] disabled:opacity-50"
              >
                {pendingId === rejectingRequest.id
                  ? "Memproses..."
                  : "Kirim Penolakan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive PLP Manual Return Dialog */}
      {manualReturnRequest && (
        <PlpManualReturnDialog
          request={manualReturnRequest}
          open={Boolean(manualReturnRequest)}
          onClose={() => setManualReturnRequest(null)}
          onSuccess={() => {
            setSuccess(
              `${manualReturnRequest.code} berhasil diselesaikan secara manual oleh PLP. Sesi ditandai COMPLETED dan katalog telah disinkronkan.`,
            );
            setManualReturnRequest(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
