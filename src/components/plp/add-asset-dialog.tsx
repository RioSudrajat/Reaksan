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

type EquipmentTypeOption = {
  id: string;
  name: string;
  category: string | null;
  usageType: string;
  classification?: string;
};

export function AddAssetDialog({
  rooms,
  label,
  defaultClassification = "INSTRUMENT",
  defaultStorageLocation,
}: {
  rooms: RoomOption[];
  equipmentTypes?: EquipmentTypeOption[];
  label?: string;
  defaultClassification?: "INSTRUMENT" | "TOOL";
  defaultStorageLocation?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const newTypeCategory =
    defaultClassification === "TOOL" ? "Glassware" : "Peralatan";
  const classification = defaultClassification;
  const [newTypeUsage, setNewTypeUsage] = useState<"BORROWABLE" | "USAGE_ONLY">(
    "USAGE_ONLY",
  );
  const [imageMediaId, setImageMediaId] = useState("");
  const [roomCode, setRoomCode] = useState(rooms[0]?.code ?? "");
  const [assetCode, setAssetCode] = useState("");
  const [unitCount, setUnitCount] = useState(
    defaultClassification === "TOOL" ? "10" : "1",
  );
  const [storageLocation, setStorageLocation] = useState(
    defaultStorageLocation ??
      (defaultClassification === "TOOL"
        ? "Meja Praktikum 1-4"
        : "Gudang Instrumen"),
  );
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

    const parsedCount = parseInt(unitCount, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      setError("Jumlah unit fisik minimal 1.");
      setPending(false);
      return;
    }

    if (!newTypeName.trim()) {
      setError(`Nama ${classification === "TOOL" ? "alat" : "instrumen"} baru wajib diisi.`);
      setPending(false);
      return;
    }

    if (!assetCode.trim()) {
      setError("Kode aset wajib diisi.");
      setPending(false);
      return;
    }

    try {
      await apiRequest("/api/plp/inventory/equipment", {
        method: "POST",
        body: {
          newType: {
            name: newTypeName.trim(),
            category: newTypeCategory.trim() || undefined,
            classification,
            usageType: newTypeUsage,
            imageMediaId: imageMediaId || undefined,
          },
          roomCode,
          assetCode: assetCode.trim().toUpperCase(),
          unitCount: parsedCount,
          storageLocation: storageLocation.trim() || undefined,
          serialNumber: serialNumber.trim() || undefined,
          imageMediaId: imageMediaId || undefined,
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
      setNewTypeName("");
      setImageMediaId("");
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
        {label ?? (defaultClassification === "TOOL" ? "Tambah Alat ke Ruangan" : "Tambah Instrumen")}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-asset-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                  Stok Ruangan
                </p>
                <h3 id="add-asset-title" className="text-[16px] font-bold text-[#121826]">
                  {defaultClassification === "TOOL" ? "Tambah Alat Praktikum Baru" : "Tambah Instrumen Laboratorium"}
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
                  htmlFor="plp-new-type-name"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Nama {classification === "TOOL" ? "Alat / Glassware" : "Instrumen"} Baru *
                </label>
                <input
                  id="plp-new-type-name"
                  type="text"
                  required
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder={
                    classification === "TOOL"
                      ? "misal: Beker Glass 250 mL, Erlenmeyer 100 mL, Pipet Ukur 10 mL..."
                      : "misal: Spektrofotometer UV-Vis, HPLC, Sentrifugator..."
                  }
                  className={controlClass + " mt-1"}
                />
              </div>

              <div>
                <label
                  htmlFor="plp-new-type-usage"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Model Pemakaian
                </label>
                <select
                  id="plp-new-type-usage"
                  value={newTypeUsage}
                  onChange={(e) =>
                    setNewTypeUsage(
                      e.target.value as "BORROWABLE" | "USAGE_ONLY",
                    )
                  }
                  className={controlClass + " mt-1"}
                >
                  <option value="USAGE_ONLY">Pakai di Ruangan (Usage Only)</option>
                  <option value="BORROWABLE">Bisa Dipinjam Keluar (Borrowable)</option>
                </select>
              </div>

              <div>
                <ImageUploadField
                  label={defaultClassification === "TOOL" ? "Foto Alat / Glassware" : "Foto Instrumen Laboratorium"}
                  help="Format gambar harus PNG, JPEG, atau WebP (maks. 5 MB)."
                  onMediaChange={setImageMediaId}
                />
              </div>

              <div>
                <label
                  htmlFor="plp-asset-room"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Ruangan Penempatan
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
                    Kode Asset Utama
                  </label>
                  <input
                    id="plp-asset-code"
                    type="text"
                    required
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    placeholder="misal: HPS-003 atau GL-BEK-01"
                    className={controlClass + " mt-1 uppercase"}
                  />
                </div>

                <div>
                  <label
                    htmlFor="plp-asset-unit-count"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Jumlah Unit Fisik
                  </label>
                  <input
                    id="plp-asset-unit-count"
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={unitCount}
                    onChange={(e) => setUnitCount(e.target.value)}
                    className={controlClass + " mt-1"}
                  />
                  <p className="mt-1 text-[10px] text-[#929292]">
                    Ketik 1 untuk instrumen tunggal, atau &gt; 1 untuk glassware.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="plp-asset-storage"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Lokasi Penempatan Fisik (Meja / Rak / Lemari / Gudang)
                </label>
                <input
                  id="plp-asset-storage"
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="misal: Meja Praktikum 1-4, Rak Gantung Meja, atau Gudang Instrumen"
                  className={controlClass + " mt-1"}
                />
              </div>

              <div>
                <label
                  htmlFor="plp-asset-serial"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Nomor Seri Pabrik / No. BMN (Opsional)
                </label>
                <input
                  id="plp-asset-serial"
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="SN-12345 / BMN-001"
                  className={controlClass + " mt-1"}
                />
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
                  className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] font-medium text-[#991B1B]"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-[12px] font-semibold text-[#121826] hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FDB913] px-5 text-[12px] font-bold text-[#121826] shadow-xs hover:bg-[#EAA805] transition disabled:opacity-70"
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
