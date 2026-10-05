"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Wrench } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";
import type { IncidentView } from "@/components/schedule-data";

export function IncidentActions({ incident }: { incident: IncidentView }) {
  const router = useRouter();
  const [finding, setFinding] = useState(incident.assessment?.finding ?? "");
  const [assessment, setAssessment] = useState(
    incident.assessment?.assessment ?? "",
  );
  const [recommendedAction, setRecommendedAction] = useState(
    incident.assessment?.recommendedAction ?? "",
  );
  const [equipmentCondition, setEquipmentCondition] = useState("");
  const [assessStatus, setAssessStatus] = useState("UNDER_ASSESSMENT");
  const [resolution, setResolution] = useState(incident.resolution?.action ?? "");
  const [resolutionNotes, setResolutionNotes] = useState(
    incident.resolution?.notes ?? "",
  );
  const [equipmentStatus, setEquipmentStatus] = useState("AVAILABLE");
  const [pending, setPending] = useState<"assess" | "resolve" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function assess() {
    if (finding.trim().length < 3 || assessment.trim().length < 3) {
      setError("Isi finding dan assessment minimal 3 karakter.");
      return;
    }
    setPending("assess");
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/incidents/${incident.code}/assess`, {
        method: "POST",
        body: {
          finding,
          assessment,
          ...(recommendedAction ? { recommendedAction } : {}),
          ...(equipmentCondition ? { equipmentCondition } : {}),
          status: assessStatus,
        },
      });
      setSuccess("Assessment tersimpan. Pelapor menerima notifikasi.");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  async function resolve() {
    if (resolution.trim().length < 3) {
      setError("Tulis tindakan penyelesaian minimal 3 karakter.");
      return;
    }
    setPending("resolve");
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/incidents/${incident.code}/resolve`, {
        method: "POST",
        body: {
          action: resolution,
          ...(resolutionNotes ? { notes: resolutionNotes } : {}),
          ...(incident.equipmentCode ? { equipmentStatus } : {}),
        },
      });
      setSuccess("Incident ditandai selesai.");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  const resolved = incident.status === "RESOLVED";

  return (
    <div className="space-y-5">
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

      <section>
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#121826]">
          <ClipboardCheck className="size-4 text-[#8D6500]" aria-hidden="true" />
          Assessment
        </p>
        {resolved && incident.assessment && (
          <div className="mt-2 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-3 text-[12px] text-[#64748B]">
            <p className="font-semibold text-[#121826]">
              {incident.assessment.finding}
            </p>
            <p className="mt-1">{incident.assessment.assessment}</p>
            {incident.assessment.recommendedAction && (
              <p className="mt-1">
                Rekomendasi: {incident.assessment.recommendedAction}
              </p>
            )}
            <p className="mt-1 text-[11px] text-[#64748B]">
              oleh {incident.assessment.assessedByName}
            </p>
          </div>
        )}
        {!resolved && (
          <div className="mt-2 space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Finding
              </span>
              <input
                type="text"
                value={finding}
                onChange={(event) => setFinding(event.target.value)}
                maxLength={2000}
                className={controlClass}
                placeholder="Apa yang ditemukan saat pemeriksaan"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Assessment
              </span>
              <textarea
                value={assessment}
                onChange={(event) => setAssessment(event.target.value)}
                rows={3}
                maxLength={2000}
                className={controlClass}
                placeholder="Penilaian teknis dan dampaknya"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Rekomendasi (opsional)
              </span>
              <input
                type="text"
                value={recommendedAction}
                onChange={(event) => setRecommendedAction(event.target.value)}
                maxLength={1000}
                className={controlClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Kondisi equipment (opsional)
                </span>
                <select
                  value={equipmentCondition}
                  onChange={(event) => setEquipmentCondition(event.target.value)}
                  className={controlClass}
                >
                  <option value="">Tidak mengubah kondisi</option>
                  <option value="GOOD">GOOD</option>
                  <option value="MINOR_ISSUE">MINOR ISSUE</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Status incident
                </span>
                <select
                  value={assessStatus}
                  onChange={(event) => setAssessStatus(event.target.value)}
                  className={controlClass}
                >
                  <option value="UNDER_ASSESSMENT">Under assessment</option>
                  <option value="IN_MAINTENANCE">In maintenance</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={assess}
              disabled={pending !== null}
              className="inline-flex min-h-10 items-center rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
            >
              {pending === "assess" ? "Menyimpan..." : "Simpan assessment"}
            </button>
          </div>
        )}
      </section>

      <section className="border-t border-[#E5E7EB] pt-5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#121826]">
          <Wrench className="size-4 text-[#8D6500]" aria-hidden="true" />
          Resolusi
        </p>
        {resolved && incident.resolution && (
          <div className="mt-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-[12px] text-[#16A34A]">
            <p className="font-semibold">{incident.resolution.action}</p>
            {incident.resolution.notes && (
              <p className="mt-1">{incident.resolution.notes}</p>
            )}
            <p className="mt-1 text-[11px]">
              oleh {incident.resolution.resolvedByName}
            </p>
          </div>
        )}
        {!resolved && (
          <div className="mt-2 space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Tindakan
              </span>
              <input
                type="text"
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                maxLength={2000}
                className={controlClass}
                placeholder="Contoh: modul diganti dan dikalibrasi"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Catatan (opsional)
              </span>
              <input
                type="text"
                value={resolutionNotes}
                onChange={(event) => setResolutionNotes(event.target.value)}
                maxLength={2000}
                className={controlClass}
              />
            </label>
            {incident.equipmentCode && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Status equipment setelah resolusi
                </span>
                <select
                  value={equipmentStatus}
                  onChange={(event) => setEquipmentStatus(event.target.value)}
                  className={controlClass}
                >
                  <option value="AVAILABLE">AVAILABLE · siap dipakai</option>
                  <option value="MAINTENANCE">MAINTENANCE · perlu perbaikan</option>
                  <option value="DAMAGED">DAMAGED · rusak</option>
                  <option value="RETIRED">RETIRED · tidak dipakai lagi</option>
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={resolve}
              disabled={pending !== null}
              className="inline-flex min-h-10 items-center rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
            >
              {pending === "resolve" ? "Memproses..." : "Tandai selesai"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
