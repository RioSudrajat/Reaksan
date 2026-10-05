"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export function QuickIncidentDialog({
  defaultRoomCode = "",
  defaultEquipmentCode = "",
  defaultRequestId,
  triggerLabel = "Lapor Insiden",
  triggerVariant = "default",
  onSuccess,
}: {
  defaultRoomCode?: string;
  defaultEquipmentCode?: string;
  defaultRequestId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "warning" | "outline";
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [roomCode, setRoomCode] = useState(defaultRoomCode);
  const [equipmentCode, setEquipmentCode] = useState(defaultEquipmentCode);
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setRoomCode(defaultRoomCode);
    setEquipmentCode(defaultEquipmentCode);
    setSeverity("MEDIUM");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!roomCode && !equipmentCode) {
      setError("Pilih minimal ruangan atau kode equipment.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Deskripsi insiden minimal 10 karakter.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiRequest("/api/plp/incidents", {
        method: "POST",
        body: {
          title: title.trim(),
          roomCode: roomCode.trim() ? roomCode.trim().toUpperCase() : undefined,
          equipmentCode: equipmentCode.trim() ? equipmentCode.trim().toUpperCase() : undefined,
          requestId: defaultRequestId || undefined,
          severity,
          description: description.trim(),
        },
      });
      setOpen(false);
      resetForm();
      router.refresh();
      onSuccess?.();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const triggerClasses =
    triggerVariant === "warning"
      ? "inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-1.5 text-[12px] font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
      : triggerVariant === "outline"
        ? "inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
        : "inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#FDB913] px-3.5 py-1.5 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className={triggerClasses}
      >
        <AlertTriangle className="size-4 shrink-0 text-current" aria-hidden="true" />
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incident-dialog-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3
                  id="incident-dialog-title"
                  className="text-[15px] font-bold text-[#121826]"
                >
                  Lapor Insiden Operasional
                </h3>
                <p className="mt-0.5 text-[12px] text-[#64748B]">
                  Catat kerusakan alat, kendala lab, atau anomali fasilitas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F8F9FA] hover:text-[#121826]"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[12px] font-medium text-[#DC2626]"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Judul Insiden <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Lensa objektif mikroskop berjamur / retak"
                  className={controlClass + " mt-1"}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Kode Ruangan / Lab
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Contoh: LAB-KIMIA-01"
                    className={controlClass + " mt-1"}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Kode Asset Alat (Opsional)
                  </label>
                  <input
                    type="text"
                    value={equipmentCode}
                    onChange={(e) => setEquipmentCode(e.target.value)}
                    placeholder="Contoh: EQ-MC-001"
                    className={controlClass + " mt-1"}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Tingkat Keparahan
                </label>
                <select
                  value={severity}
                  onChange={(e) =>
                    setSeverity(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
                  }
                  className={controlClass + " mt-1"}
                >
                  <option value="LOW">LOW · Gangguan ringan, masih dapat beroperasi</option>
                  <option value="MEDIUM">MEDIUM · Perlu perhatian, fungsi terbatas</option>
                  <option value="HIGH">HIGH · Rusak, tidak dapat digunakan</option>
                  <option value="CRITICAL">CRITICAL · Bahaya keselamatan / mendesak</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Deskripsi & Kronologi <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan kondisi kerusakan atau kendala yang ditemukan..."
                  className={controlClass + " mt-1 resize-none"}
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-[12px] font-semibold text-[#121826] transition hover:bg-[#F8F9FA] disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-10 items-center rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] disabled:opacity-60"
                >
                  {pending ? "Menyimpan..." : "Kirim Laporan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
