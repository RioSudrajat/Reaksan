"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

type RoomOption = {
  id: string;
  code: string;
  name: string;
};

export function ReceiveBatchDialog({
  materialCode,
  materialName,
  unit,
  rooms,
}: {
  materialCode: string;
  materialName: string;
  unit: string;
  rooms: RoomOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roomCode, setRoomCode] = useState(rooms[0]?.code ?? "");
  const [lotNumber, setLotNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rooms.length === 0) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/api/plp/inventory/materials/${materialCode}/batches`, {
        method: "POST",
        body: {
          roomCode,
          lotNumber: lotNumber.trim() || undefined,
          quantity: Number(quantity),
          expiryDate: expiryDate ? expiryDate : undefined,
          active: true,
        },
      });
      setOpen(false);
      setLotNumber("");
      setQuantity("");
      setExpiryDate("");
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
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#FDB913] px-3.5 py-1.5 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <Plus className="size-4" aria-hidden="true" />
        Terima Batch Baru
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receive-batch-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                  {materialCode} · {materialName}
                </p>
                <h3 id="receive-batch-title" className="text-[16px] font-bold text-[#121826]">
                  Penerimaan Batch Material Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F8F9FA] hover:text-[#121826]"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Tutup</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="plp-batch-room"
                  className="block text-[11px] font-semibold text-[#64748B]"
                >
                  Ruangan Penyimpanan (Lab Anda)
                </label>
                <select
                  id="plp-batch-room"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  required
                  className={controlClass + " mt-1"}
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.code}>
                      {room.name} ({room.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="plp-batch-lot"
                  className="block text-[11px] font-semibold text-[#64748B]"
                >
                  Nomor Lot / Batch (Opsional)
                </label>
                <input
                  id="plp-batch-lot"
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="misal: LOT-2026-A1"
                  className={controlClass + " mt-1"}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="plp-batch-quantity"
                    className="block text-[11px] font-semibold text-[#64748B]"
                  >
                    Jumlah Diterima ({unit})
                  </label>
                  <input
                    id="plp-batch-quantity"
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="misal: 1000"
                    className={controlClass + " mt-1"}
                  />
                </div>

                <div>
                  <label
                    htmlFor="plp-batch-expiry"
                    className="block text-[11px] font-semibold text-[#64748B]"
                  >
                    Tanggal Kedaluwarsa (Expiry)
                  </label>
                  <input
                    id="plp-batch-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className={controlClass + " mt-1"}
                  />
                </div>
              </div>

              <p className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-3 text-[11px] leading-5 text-[#64748B]">
                Stok yang baru diterima akan otomatis dicatat ke buku besar transaksi (*ledger*) dengan tipe <strong>RECEIVE</strong> dan menambah stok fisik ruangan.
              </p>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] font-medium text-[#DC2626]"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-[12px] font-semibold text-[#121826] transition hover:bg-[#F8F9FA]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#FDB913] px-5 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                >
                  {pending ? "Menyimpan..." : "Terima Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
