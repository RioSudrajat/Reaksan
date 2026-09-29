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
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
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
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
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
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F45959] px-4 text-[12px] font-bold text-white transition hover:bg-[#D94848] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
            >
              <XCircle className="size-4" aria-hidden="true" />
              {pending === "cancel" ? "Membatalkan..." : "Konfirmasi batalkan"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              disabled={pending !== null}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] transition hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Tidak jadi
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#F3C7C7] bg-white px-4 text-[12px] font-bold text-[#9E3636] transition hover:bg-[#FDE9E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            <XCircle className="size-4" aria-hidden="true" />
            Batalkan sesi
          </button>
        )}
      </div>
    </div>
  );
}
