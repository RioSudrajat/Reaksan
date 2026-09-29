"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Wrench } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

type UnitProps = {
  id: string;
  code: string;
  label?: string;
  status: string;
  condition?: string;
  notes?: string | null;
};

const statusOptions = [
  { value: "AVAILABLE", label: "AVAILABLE · Siap digunakan" },
  { value: "MAINTENANCE", label: "MAINTENANCE · Dalam perbaikan" },
  { value: "DAMAGED", label: "DAMAGED · Rusak" },
  { value: "UNDER_INSPECTION", label: "UNDER INSPECTION · Pemeriksaan" },
  { value: "RETIRED", label: "RETIRED · Pensiun" },
];

const conditionOptions = [
  { value: "GOOD", label: "GOOD · Baik" },
  { value: "MINOR_ISSUE", label: "MINOR ISSUE · Masalah kecil" },
  { value: "DAMAGED", label: "DAMAGED · Rusak berat" },
  { value: "UNKNOWN", label: "UNKNOWN · Belum dicek" },
];

export function UnitStatusAction({
  unit,
  endpoint,
  variant = "quick-available",
}: {
  unit: UnitProps;
  endpoint?: string;
  variant?: "quick-available" | "full";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(
    variant === "quick-available" ? "AVAILABLE" : unit.status,
  );
  const [condition, setCondition] = useState<string>(unit.condition ?? "GOOD");
  const [notes, setNotes] = useState<string>(
    variant === "quick-available" ? "Perbaikan selesai, unit siap digunakan kembali." : (unit.notes ?? ""),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetEndpoint =
    endpoint ?? `/api/plp/inventory/equipment/units/${unit.id}`;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiRequest(targetEndpoint, {
        method: "PATCH",
        body: {
          status,
          condition,
          notes: notes.trim() || null,
        },
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    if (variant === "quick-available") {
      return (
        <button
          type="button"
          onClick={() => {
            setStatus("AVAILABLE");
            setCondition("GOOD");
            setNotes("Perbaikan/kalibrasi selesai, unit siap digunakan.");
            setOpen(true);
          }}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#E5F5ED] px-2.5 py-1 text-[11px] font-bold text-[#03683A] transition hover:bg-[#D3EFE0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03683A]"
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Set Available
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-white px-2.5 py-1 text-[11px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
      >
        <Wrench className="size-3.5 text-[#6B6B6B]" aria-hidden="true" />
        Ubah status
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dialog-title-${unit.id}`}
        className="w-full max-w-md rounded-2xl border border-[#E1E1E1] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F1F1F1] pb-3">
          <div>
            <h3
              id={`dialog-title-${unit.id}`}
              className="text-[15px] font-bold text-[#212121]"
            >
              Ubah Status Unit {unit.code}
            </h3>
            {unit.label && (
              <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                {unit.label} · Status saat ini:{" "}
                <span className="font-semibold text-[#212121]">
                  {unit.status}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="rounded-lg p-1 text-[#929292] hover:bg-[#F5F5F5]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
              Status Operasional *
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className={controlClass}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
              Kondisi Fisik *
            </span>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
              className={controlClass}
            >
              {conditionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
              Catatan Perubahan / Hasil Perbaikan
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Contoh: Kalibrasi sensor suhu selesai. Alat berfungsi normal."
              className={controlClass}
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] p-3 text-[12px] font-medium text-[#9E3636]"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] font-bold text-[#6B6B6B] hover:bg-[#F5F5F5]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] disabled:opacity-60"
            >
              {pending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
