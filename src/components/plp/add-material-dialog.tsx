"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";
import { ImageUploadField } from "@/components/image-upload-field";

type RoomOption = {
  id: string;
  code: string;
  name: string;
};

export function AddMaterialDialog({ rooms }: { rooms: RoomOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const category = "Reagen";
  const [baseUnit, setBaseUnit] = useState("mL");
  const [description, setDescription] = useState("");
  const [imageMediaId, setImageMediaId] = useState("");

  const [addBatch, setAddBatch] = useState(true);
  const [roomCode, setRoomCode] = useState(rooms[0]?.code ?? "");
  const [quantity, setQuantity] = useState("1000");
  const [lotNumber, setLotNumber] = useState("");
  const [storageLocation, setStorageLocation] = useState("Gudang Reagen");
  const [expiryDate, setExpiryDate] = useState("");
  const [source, setSource] = useState<"PURCHASE" | "GRANT_HIBAH" | "LEFTOVER">(
    "PURCHASE",
  );

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rooms.length === 0) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const parsedQty = parseFloat(quantity);
    if (addBatch && (isNaN(parsedQty) || parsedQty <= 0)) {
      setError("Jumlah fisik batch awal harus lebih dari 0.");
      setPending(false);
      return;
    }

    try {
      await apiRequest("/api/plp/inventory/materials", {
        method: "POST",
        body: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          category: category.trim() || undefined,
          baseUnit: baseUnit.trim(),
          description: description.trim() || undefined,
          imageMediaId: imageMediaId || undefined,
          initialBatch: addBatch
            ? {
                roomCode,
                quantity: parsedQty,
                lotNumber: lotNumber.trim() || undefined,
                storageLocation: storageLocation.trim() || undefined,
                expiryDate: expiryDate || null,
                source,
              }
            : undefined,
        },
      });

      setOpen(false);
      setCode("");
      setName("");
      setDescription("");
      setImageMediaId("");
      setLotNumber("");
      setStorageLocation("Gudang Reagen");
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
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Bahan Baru
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-material-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                  Inventori Bahan
                </p>
                <h3
                  id="add-material-title"
                  className="text-[16px] font-bold text-[#121826]"
                >
                  Daftarkan Bahan Kimia / Reagen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#FEF7E6] hover:text-[#121826] transition"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Tutup</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="plp-mat-name"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Nama Bahan Kimia / Reagen *
                </label>
                <input
                  id="plp-mat-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Ethanol Absolute 99.8%, H2SO4, NaCl P.A..."
                  className={controlClass + " mt-1"}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="plp-mat-code"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Kode Bahan *
                  </label>
                  <input
                    id="plp-mat-code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="misal: MAT-070"
                    className={controlClass + " mt-1 uppercase"}
                  />
                </div>

                <div>
                  <label
                    htmlFor="plp-mat-unit"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Satuan Dasar *
                  </label>
                  <select
                    id="plp-mat-unit"
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                    className={controlClass + " mt-1"}
                  >
                    <option value="mL">mL (Mililiter)</option>
                    <option value="L">L (Liter)</option>
                    <option value="g">g (Gram)</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="pcs">pcs (Buah/Strip)</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="plp-mat-desc"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Deskripsi / Keterangan Penyimpanan (Opsional)
                </label>
                <textarea
                  id="plp-mat-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="misal: Simpan di lemari asam khusus pelarut organik flammables"
                  className={controlClass + " mt-1"}
                />
              </div>

              <div>
                <ImageUploadField
                  label="Foto Botol / Kemasan Bahan"
                  help="Format gambar harus PNG, JPEG, atau WebP (maks. 5 MB)."
                  onMediaChange={setImageMediaId}
                />
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-3.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addBatch}
                    onChange={(e) => setAddBatch(e.target.checked)}
                    className="size-4 rounded accent-[#FDB913]"
                  />
                  <span className="text-[12px] font-bold text-[#121826]">
                    Catat Penerimaan Batch Fisik Awal
                  </span>
                </label>

                {addBatch && (
                  <div className="mt-3 space-y-3 border-t border-[#E5E7EB] pt-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="plp-mat-room"
                          className="block text-[11px] font-semibold text-[#6B6B6B]"
                        >
                          Ruangan Penempatan
                        </label>
                        <select
                          id="plp-mat-room"
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
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
                          htmlFor="plp-mat-qty"
                          className="block text-[11px] font-semibold text-[#6B6B6B]"
                        >
                          Jumlah Fisik ({baseUnit})
                        </label>
                        <input
                          id="plp-mat-qty"
                          type="number"
                          step="0.001"
                          min="0.001"
                          required
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className={controlClass + " mt-1"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="plp-mat-storage"
                          className="block text-[11px] font-semibold text-[#6B6B6B]"
                        >
                          Lokasi Rak / Lemari Penyimpanan
                        </label>
                        <input
                          id="plp-mat-storage"
                          type="text"
                          value={storageLocation}
                          onChange={(e) => setStorageLocation(e.target.value)}
                          placeholder="misal: Lemari Asam B3, Rak Reagen A"
                          className={controlClass + " mt-1"}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="plp-mat-lot"
                          className="block text-[11px] font-semibold text-[#6B6B6B]"
                        >
                          Nomor Lot / Batch Botol (Opsional)
                        </label>
                        <input
                          id="plp-mat-lot"
                          type="text"
                          value={lotNumber}
                          onChange={(e) => setLotNumber(e.target.value)}
                          placeholder="misal: LOT-2026-X1"
                          className={controlClass + " mt-1"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="plp-mat-source"
                          className="block text-[11px] font-semibold text-[#6B6B6B]"
                        >
                          Asal / Sumber Bahan
                        </label>
                        <select
                          id="plp-mat-source"
                          value={source}
                          onChange={(e) =>
                            setSource(
                              e.target.value as "PURCHASE" | "GRANT_HIBAH" | "LEFTOVER",
                            )
                          }
                          className={controlClass + " mt-1"}
                        >
                          <option value="PURCHASE">Pengadaan Baru Laboratorium</option>
                          <option value="GRANT_HIBAH">Hibah Dosen / Riset</option>
                          <option value="LEFTOVER">Sisa Praktikum Mahasiswa</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="plp-mat-expiry"
                          className="block text-[11px] font-semibold text-[#6B6B6B]"
                        >
                          Tanggal Kadaluarsa (Opsional)
                        </label>
                        <input
                          id="plp-mat-expiry"
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className={controlClass + " mt-1"}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] font-medium text-[#991B1B]"
                >
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-10 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[12px] font-semibold text-[#121826] hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#FDB913] px-5 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] disabled:opacity-60"
                >
                  {pending ? "Menyimpan..." : "Simpan Bahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
