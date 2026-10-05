"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";

type ReviewAction = "approve" | "revision" | "reject";

const actionCopy: Record<
  ReviewAction,
  { label: string; hint: string; tone: "primary" | "warning" | "danger" }
> = {
  approve: {
    label: "Setujui request",
    hint: "Reservasi dan stok langsung dipesan. Student menerima notifikasi.",
    tone: "primary",
  },
  revision: {
    label: "Minta revisi",
    hint: "Student bisa memperbaiki lalu mengirim ulang.",
    tone: "warning",
  },
  reject: {
    label: "Tolak request",
    hint: "Tolak dengan alasan yang jelas. Tidak ada reservasi yang dibuat.",
    tone: "danger",
  },
};

export function RequestReviewPanel({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const locked = status !== "PENDING_PLP";

  async function submit() {
    if (!action) return;
    if (action !== "approve" && note.trim().length < 3) {
      setError("Tulis alasan minimal 3 karakter untuk aksi ini.");
      return;
    }
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/requests/${requestId}/review`, {
        method: "POST",
        body: { action, note },
      });
      setSuccess(`Request berhasil di-${action === "approve" ? "setujui" : action === "revision" ? "minta revisi" : "tolak"}.`);
      setAction(null);
      setNote("");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (locked) {
    return (
      <div className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] px-4 py-3 text-[12px] text-[#6B6B6B]">
        Review hanya tersedia saat status <strong>PENDING_PLP</strong>. Status
        sekarang: <strong>{status}</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["approve", "revision", "reject"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setAction(option);
              setError("");
              setSuccess("");
            }}
            aria-pressed={action === option}
            className={
              "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] " +
              (action === option
                ? option === "reject"
                  ? "bg-[#DC2626] text-white shadow-xs"
                  : option === "revision"
                    ? "bg-[#FEF7E6] border border-[#FDE68A] text-[#8D6500] shadow-xs"
                    : "bg-[#FDB913] text-[#121826] shadow-xs"
                : "border border-[#E5E7EB] bg-white text-[#121826] hover:bg-[#F8F9FA]")
            }
          >
            {option === "approve" ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : option === "revision" ? (
              <RotateCcw className="size-4" aria-hidden="true" />
            ) : (
              <XCircle className="size-4" aria-hidden="true" />
            )}
            {actionCopy[option].label}
          </button>
        ))}
      </div>

      {action && (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
          <p className="text-[12px] text-[#64748B]">{actionCopy[action].hint}</p>
          <label className="mt-3 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              {action === "approve" ? "Catatan (opsional)" : "Alasan"}
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#121826] outline-none transition focus:border-[#FDB913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
              placeholder={
                action === "approve"
                  ? "Contoh: slot aman, stok cukup."
                  : "Tuliskan alasan yang bisa dipahami mahasiswa."
              }
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] transition hover:bg-[#E5A700] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] shadow-xs disabled:opacity-60"
          >
            {pending ? "Memproses..." : `Konfirmasi: ${actionCopy[action].label}`}
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-medium text-[#991B1B]"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[12px] font-medium text-[#166534]"
        >
          {success}
        </p>
      )}
    </div>
  );
}
