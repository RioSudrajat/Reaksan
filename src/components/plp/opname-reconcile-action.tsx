"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, RefreshCw, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export function OpnameReconcileAction({
  sessionId,
  batchesWithDifference,
  positiveTotal,
  negativeTotal,
}: {
  sessionId: string;
  batchesWithDifference: number;
  positiveTotal: number;
  negativeTotal: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleReconcile(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: { reconciledCount: number } }>(
        `/api/plp/opname/${sessionId}/reconcile`,
        {
          method: "POST",
          body: {
            reason: reason.trim() || undefined,
          },
        },
      );
      setSuccess(
        `Berhasil merekonsiliasi ${res.data.reconciledCount} batch stok secara otomatis.`,
      );
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (batchesWithDifference === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Rekonsiliasi Stok Otomatis ({batchesWithDifference} batch)
        </button>
      </div>

      {success && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#BFE3CE] bg-[#E5F5ED] px-4 py-3 text-[12px] font-medium text-[#03683A]"
        >
          {success}
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reconcile-dialog-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3
                  id="reconcile-dialog-title"
                  className="text-[15px] font-bold text-[#212121]"
                >
                  Konfirmasi Rekonsiliasi Otomatis
                </h3>
                <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
                  Perbarui stok fisik di sistem sesuai hasil hitungan opname.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#929292] hover:bg-[#F5F5F5] hover:text-[#212121]"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#F2D9A4] bg-[#FFFDF7] p-3.5 text-[12px] text-[#5D4A1B]">
              <p className="font-semibold">Ringkasan penyesuaian:</p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-[#6B6B6B]">
                <li>
                  <strong className="text-[#212121]">{batchesWithDifference}</strong> batch akan disesuaikan kuantitas fisiknya.
                </li>
                <li>
                  Total selisih positif: <strong className="text-[#03683A]">+{positiveTotal.toFixed(3)}</strong>
                </li>
                <li>
                  Total selisih negatif: <strong className="text-[#9E3636]">{negativeTotal.toFixed(3)}</strong>
                </li>
              </ul>
              <p className="mt-2 text-[11px] text-[#929292]">
                Transaksi mutasi stok bertipe <code>ADJUST</code> akan dicatat secara otomatis untuk audit trail.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] px-3.5 py-2.5 text-[12px] font-medium text-[#9E3636]"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleReconcile} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                  Alasan / Catatan Penyesuaian (Opsional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Koreksi selisih opname triwulan I"
                  className={controlClass + " mt-1"}
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] disabled:opacity-60"
                >
                  <CheckCheck className="size-4" aria-hidden="true" />
                  {pending ? "Menerapkan..." : "Terapkan Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
