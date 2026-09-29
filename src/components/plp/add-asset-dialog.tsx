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

type EquipmentTypeOption = {
  id: string;
  name: string;
  category: string | null;
  usageType: string;
};

export function AddAssetDialog({
  rooms,
  equipmentTypes,
}: {
  rooms: RoomOption[];
  equipmentTypes: EquipmentTypeOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [equipmentTypeId, setEquipmentTypeId] = useState(
    equipmentTypes[0]?.id ?? "",
  );
  const [roomCode, setRoomCode] = useState(rooms[0]?.code ?? "");
  const [assetCode, setAssetCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [notes, setNotes] = useState("");
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
      await apiRequest("/api/plp/inventory/equipment", {
        method: "POST",
        body: {
          equipmentTypeId,
          roomCode,
          assetCode: assetCode.trim().toUpperCase(),
          serialNumber: serialNumber.trim() || undefined,
          status: "AVAILABLE",
          condition,
          notes: notes.trim() || undefined,
          active: true,
        },
      });
      setOpen(false);
      setAssetCode("");
      setSerialNumber("");
      setNotes("");
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
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#38529B] px-4 text-[12px] font-bold text-white transition hover:bg-[#2C417C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38529B]"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Asset ke Ruangan
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-asset-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#929292]">
                  Stok Ruangan
                </p>
                <h3 id="add-asset-title" className="text-[16px] font-bold text-[#212121]">
                  Tambah Equipment Asset Baru
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
              <div>
                <label
                  htmlFor="plp-asset-type"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Equipment Type (Katalog)
                </label>
                <select
                  id="plp-asset-type"
                  value={equipmentTypeId}
                  onChange={(e) => setEquipmentTypeId(e.target.value)}
                  required
                  className={controlClass + " mt-1"}
                >
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}{" "}
                      {type.category ? `(${type.category})` : ""} ·{" "}
                      {type.usageType === "BORROWABLE"
                        ? "Borrowable"
                        : "Usage only"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="plp-asset-room"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Ruangan Penempatan (Tersedia untuk Anda)
                </label>
                <select
                  id="plp-asset-room"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="plp-asset-code"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Kode Asset
                  </label>
                  <input
                    id="plp-asset-code"
                    type="text"
                    required
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    placeholder="misal: OVN-003"
                    className={controlClass + " mt-1 uppercase"}
                  />
                </div>

                <div>
                  <label
                    htmlFor="plp-asset-serial"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Nomor Seri (Opsional)
                  </label>
                  <input
                    id="plp-asset-serial"
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-12345"
                    className={controlClass + " mt-1"}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="plp-asset-condition"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Kondisi Awal
                </label>
                <select
                  id="plp-asset-condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className={controlClass + " mt-1"}
                >
                  <option value="GOOD">GOOD · Baik</option>
                  <option value="MINOR_ISSUE">MINOR ISSUE · Masalah kecil</option>
                  <option value="DAMAGED">DAMAGED · Rusak</option>
                  <option value="UNKNOWN">UNKNOWN · Belum dicek</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="plp-asset-notes"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="plp-asset-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Lokasi rak atau keterangan operasional..."
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
                  {pending ? "Menyimpan..." : "Simpan Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
