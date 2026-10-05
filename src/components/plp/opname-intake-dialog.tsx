"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Plus, Sparkles, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

type MaterialOption = {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
  category?: string | null;
};

export function OpnameIntakeDialog({
  sessionId,
  materials,
}: {
  sessionId: string;
  materials: MaterialOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");
  const [mode, setMode] = useState<"CATALOG" | "NEW">(
    materials.length > 0 ? "CATALOG" : "NEW",
  );
  const [newMatName, setNewMatName] = useState("");
  const [newMatCode, setNewMatCode] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("mL");
  const newMatCategory = "Reagen";

  const [entrySource, setEntrySource] = useState<
    "GRANT_HIBAH" | "LEFTOVER_RETURN" | "DISCOVERY_FOUND"
  >("GRANT_HIBAH");
  const [quantity, setQuantity] = useState("100");
  const [storageLocation, setStorageLocation] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMaterial =
    materials.find((m) => m.id === materialId) ?? materials[0];

  const presets = [20, 50, 80, 100, 250, 500, 1000];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "CATALOG" && !materialId) {
      setError("Pilih master bahan terlebih dahulu.");
      return;
    }
    if (mode === "NEW") {
      if (!newMatName.trim()) {
        setError("Nama bahan kimia baru wajib diisi.");
        return;
      }
      if (!newMatCode.trim()) {
        setError("Kode bahan baru wajib diisi.");
        return;
      }
    }
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError("Isi takaran fisik dengan angka positif lebih dari 0.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      await apiRequest(`/api/plp/opname/${sessionId}/intake`, {
        method: "POST",
        body: {
          materialId: mode === "CATALOG" ? materialId : undefined,
          newMaterial:
            mode === "NEW"
              ? {
                  name: newMatName.trim(),
                  code: newMatCode.trim().toUpperCase(),
                  baseUnit: newMatUnit,
                  category: newMatCategory.trim() || undefined,
                }
              : undefined,
          countedQuantity: parsedQty,
          entrySource,
          storageLocation: storageLocation.trim() || undefined,
          lotNumber: lotNumber.trim() || undefined,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
        },
      });

      setOpen(false);
      setQuantity("100");
      setStorageLocation("");
      setLotNumber("");
      setExpiryDate("");
      setNotes("");
      setNewMatName("");
      setNewMatCode("");
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
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FEF7E6] px-4 text-[12px] font-semibold text-[#8D6500] transition hover:bg-[#FDF2D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        + Catat Bahan Hibah / Sisa
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="intake-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <h3
                  id="intake-dialog-title"
                  className="text-[16px] font-bold text-[#121826]"
                >
                  Catat Bahan Hibah, Sisa, atau Temuan
                </h3>
                <p className="mt-1 text-[12px] text-[#475569]">
                  Pencatatan langsung botol reagen fisik yang belum ada di sistem
                  saat sensus opname berlangsung.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#FEF7E6] hover:text-[#121826] transition"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-medium text-[#991B1B]"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Jenis Masukan */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Jenis Temuan / Asal Bahan *
                </label>
                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntrySource("GRANT_HIBAH")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                      entrySource === "GRANT_HIBAH"
                        ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534] font-bold shadow-xs"
                        : "border-[#E5E7EB] bg-white text-[#475569] hover:bg-[#F8F9FA]"
                    }`}
                  >
                    <Gift className="size-4 mb-1" />
                    <span className="text-[12px]">Hibah Dosen/Riset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntrySource("LEFTOVER_RETURN")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                      entrySource === "LEFTOVER_RETURN"
                        ? "border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500] font-bold shadow-xs"
                        : "border-[#E5E7EB] bg-white text-[#475569] hover:bg-[#F8F9FA]"
                    }`}
                  >
                    <Sparkles className="size-4 mb-1" />
                    <span className="text-[12px]">Sisa Praktikum</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntrySource("DISCOVERY_FOUND")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                      entrySource === "DISCOVERY_FOUND"
                        ? "border-[#E5E7EB] bg-[#F8F9FA] text-[#121826] font-bold shadow-xs"
                        : "border-[#E5E7EB] bg-white text-[#475569] hover:bg-[#F8F9FA]"
                    }`}
                  >
                    <Plus className="size-4 mb-1" />
                    <span className="text-[12px]">Temuan Fisik</span>
                  </button>
                </div>
              </div>

              {/* Mode Toggle Bahan */}
              <div className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setMode("CATALOG")}
                  className={`flex-1 rounded-lg py-1.5 transition ${
                    mode === "CATALOG"
                      ? "bg-white text-[#121826] shadow-xs border border-[#E5E7EB]"
                      : "text-[#64748B] hover:text-[#121826]"
                  }`}
                >
                  Pilih dari Katalog
                </button>
                <button
                  type="button"
                  onClick={() => setMode("NEW")}
                  className={`flex-1 rounded-lg py-1.5 transition ${
                    mode === "NEW"
                      ? "bg-white text-[#121826] shadow-xs border border-[#E5E7EB]"
                      : "text-[#64748B] hover:text-[#121826]"
                  }`}
                >
                  + Daftarkan Bahan Baru / Temuan
                </button>
              </div>

              {mode === "CATALOG" ? (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Pilih Bahan Kimia *
                  </label>
                  <select
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                    className={`mt-1.5 ${controlClass}`}
                    required
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code}) - {m.category || "Umum"} [{m.baseUnit}]
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-[#FDE68A] bg-[#FEF7E6]/40 p-3.5">
                  <p className="text-[11px] font-bold text-[#8D6500]">
                    Data Bahan Kimia Baru
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569]">
                      Nama Bahan Kimia *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMatName}
                      onChange={(e) => setNewMatName(e.target.value)}
                      placeholder="misal: Metanol 99.5%, Asam Oksalat..."
                      className={controlClass + " mt-1 bg-white"}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569]">
                        Kode Bahan *
                      </label>
                      <input
                        type="text"
                        required
                        value={newMatCode}
                        onChange={(e) => setNewMatCode(e.target.value)}
                        placeholder="MAT-080"
                        className={controlClass + " mt-1 bg-white uppercase"}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569]">
                        Satuan Dasar
                      </label>
                      <select
                        value={newMatUnit}
                        onChange={(e) => setNewMatUnit(e.target.value)}
                        className={controlClass + " mt-1 bg-white"}
                      >
                        <option value="mL">mL</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Takaran Fisik & Preset Chips */}
              {(() => {
                const currentUnit = mode === "NEW" ? newMatUnit : (selectedMaterial?.baseUnit ?? "unit");
                return (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                        Takaran Fisik Nyata ({currentUnit}) *
                      </label>
                      <span className="text-[11px] text-[#64748B]">Pilih cepat:</span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantity(String(preset))}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                            quantity === String(preset)
                              ? "bg-[#121826] text-white shadow-xs"
                              : "bg-[#F8F9FA] border border-[#E5E7EB] text-[#475569] hover:bg-[#FEF7E6] hover:text-[#8D6500]"
                          }`}
                        >
                          {preset} {currentUnit}
                        </button>
                      ))}
                    </div>

                    <div className="relative mt-2">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Contoh: 150"
                        className={`${controlClass} pr-12`}
                        required
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-[12px] font-bold text-[#475569]">
                          {currentUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Lokasi Simpan / Rak */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
                  Lokasi Rak / Lemari Penyimpanan (Opsional)
                </label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="Contoh: Rak 2 - Pelarut Organik, Lemari Asam, Meja 1"
                  className={`mt-1.5 ${controlClass}`}
                />
              </div>

              {/* Lot Number & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
                    Nomor Lot / Kode Botol
                  </label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Otomatis jika kosong"
                    className={`mt-1.5 ${controlClass}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
                    Masa Kadaluarsa
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className={`mt-1.5 ${controlClass}`}
                  />
                </div>
              </div>

              {/* Catatan / Keterangan Sumber */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#929292]">
                  Catatan / Keterangan Sumber
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Hibah dari penelitian Dr. Hendra, botol masih tersegel 80%."
                  className={`mt-1.5 ${controlClass}`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-[#FDB913] px-5 py-2.5 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
                >
                  {pending ? "Menyimpan..." : "Simpan ke Sesi Opname"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
