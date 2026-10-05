"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export function OpnameSessionActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<"complete" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function complete() {
    setPending("complete");
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/plp/opname/${sessionId}/complete`, {
        method: "POST",
        body: notes ? { notes } : {},
      });
      setSuccess("Sesi hitung diselesaikan. Laporan selisih siap dilihat.");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  async function cancel() {
    setPending("cancel");
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/plp/opname/${sessionId}/cancel`, {
        method: "POST",
      });
      setSuccess("Sesi hitung dibatalkan.");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
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
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
          Catatan penutup (opsional)
        </span>
        <input
          type="text"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          placeholder="Ringkasan kondisi hitung"
          className={controlClass}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={complete}
          disabled={pending !== null}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {pending === "complete" ? "Menyelesaikan..." : "Selesaikan sesi"}
        </button>
        {confirmCancel ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={pending !== null}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#DC2626] px-4 text-[12px] font-bold text-white shadow-xs transition hover:bg-[#B91C1C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626] disabled:opacity-60"
            >
              <XCircle className="size-4" aria-hidden="true" />
              {pending === "cancel" ? "Membatalkan..." : "Konfirmasi batalkan"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              disabled={pending !== null}
              className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#121826] transition hover:bg-[#F8F9FA]"
            >
              Tidak jadi
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#FECACA] bg-white px-4 text-[12px] font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
          >
            <XCircle className="size-4" aria-hidden="true" />
            Batalkan sesi
          </button>
        )}
      </div>
    </div>
  );
}
