"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export function StockAdjustDialog({
  batchId,
  lotNumber,
  roomName,
  currentQuantity,
  unit,
}: {
  batchId: string;
  lotNumber: string | null;
  roomName: string;
  currentQuantity: number;
  unit: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"decrease" | "increase">("decrease");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"ADJUST" | "EXPIRE">("ADJUST");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount) || 0;
  const deltaQuantity = mode === "decrease" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
  const projectedQuantity = Math.max(0, Math.round((currentQuantity + deltaQuantity) * 1000) / 1000);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Masukkan jumlah perubahan yang valid (lebih dari 0).");
      return;
    }
    if (mode === "decrease" && parsedAmount > currentQuantity) {
      setError(`Pengurangan melebihi stok fisik saat ini (${currentQuantity} ${unit}).`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiRequest(
        `/api/plp/inventory/materials/batches/${batchId}/adjust`,
        {
          method: "POST",
          body: {
            type,
            deltaQuantity,
            reason: reason.trim(),
          },
        },
      );
      setOpen(false);
      setAmount("");
      setReason("");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAmount("");
          setReason("");
          setError(null);
          setOpen(true);
        }}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-white px-2.5 py-1 text-[11px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38529B]"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        Sesuaikan Stok
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-adjust-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#929292]">
                  {lotNumber ?? "Batch tanpa lot"} · {roomName}
                </p>
                <h3 id="stock-adjust-title" className="text-[16px] font-bold text-[#212121]">
                  Penyesuaian Stok Batch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#929292] hover:bg-[#F5F5F5] hover:text-[#212121]"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Tutup</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="rounded-xl bg-[#F5F5F5] p-3 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Stok Fisik Saat Ini</span>
                  <span className="font-bold text-[#212121]">
                    {currentQuantity} {unit}
                  </span>
                </div>
                {parsedAmount > 0 && (
                  <div className="mt-2 flex justify-between border-t border-[#E5E5E5] pt-2">
                    <span className="text-[#6B6B6B]">Perkiraan Setelah Koreksi</span>
                    <span
                      className={
                        "font-bold " +
                        (mode === "decrease"
                          ? "text-[#9E3636]"
                          : "text-[#03683A]")
                      }
                    >
                      {projectedQuantity} {unit} ({deltaQuantity > 0 ? `+${deltaQuantity}` : deltaQuantity})
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-[#6B6B6B]">
                  Arah Penyesuaian
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("decrease");
                      setType("ADJUST");
                    }}
                    className={
                      "inline-flex min-h-10 items-center justify-center rounded-xl border text-[12px] font-bold transition " +
                      (mode === "decrease"
                        ? "border-[#9E3636] bg-[#FDE9E9] text-[#9E3636]"
                        : "border-[#E1E1E1] bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]")
                    }
                  >
                    Kurangi Stok (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("increase");
                      setType("ADJUST");
                    }}
                    className={
                      "inline-flex min-h-10 items-center justify-center rounded-xl border text-[12px] font-bold transition " +
                      (mode === "increase"
                        ? "border-[#03683A] bg-[#E5F5ED] text-[#03683A]"
                        : "border-[#E1E1E1] bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]")
                    }
                  >
                    Tambah Stok (+)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="adjust-amount"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Jumlah ({unit})
                  </label>
                  <input
                    id="adjust-amount"
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="misal: 5"
                    className={controlClass + " mt-1"}
                  />
                </div>

                <div>
                  <label
                    htmlFor="adjust-type"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Kategori Ledger
                  </label>
                  <select
                    id="adjust-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "ADJUST" | "EXPIRE")}
                    className={controlClass + " mt-1"}
                  >
                    <option value="ADJUST">ADJUST · Koreksi / Kerusakan</option>
                    <option value="EXPIRE">EXPIRE · Dibuang Kedaluwarsa</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="adjust-reason"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Alasan Penyesuaian (Wajib)
                </label>
                <input
                  id="adjust-reason"
                  type="text"
                  required
                  minLength={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="misal: Botol pecah saat praktikum, atau selisih fisik"
                  className={controlClass + " mt-1"}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FDE9E9] p-3 text-[12px] text-[#9E3636]"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F5F5F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#38529B] px-5 text-[12px] font-bold text-white hover:bg-[#2C417C] disabled:opacity-70"
                >
                  {pending ? "Menyimpan..." : "Simpan Penyesuaian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
