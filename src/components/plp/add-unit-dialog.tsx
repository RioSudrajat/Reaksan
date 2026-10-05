"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export function AddUnitDialog({
  assetCode,
  assetName,
  suggestedUnitCode,
}: {
  assetCode: string;
  assetName: string;
  suggestedUnitCode?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(suggestedUnitCode ?? `${assetCode}-U1`);
  const [label, setLabel] = useState("");
  const [storageLocation, setStorageLocation] = useState("Meja Praktikum 1");
  const [status, setStatus] = useState("AVAILABLE");
  const [condition, setCondition] = useState("GOOD");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/api/plp/inventory/equipment/${assetCode}/units`, {
        method: "POST",
        body: {
          code: code.trim().toUpperCase(),
          label: label.trim() || `Unit ${code.trim().toUpperCase()}`,
          storageLocation: storageLocation.trim() || undefined,
          status,
          condition,
          notes: notes.trim() || undefined,
          active: true,
        },
      });
      setOpen(false);
      setLabel("");
      setStorageLocation("Meja Praktikum 1");
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
        onClick={() => {
          setCode(suggestedUnitCode ?? `${assetCode}-U1`);
          setOpen(true);
        }}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#FDB913] px-3.5 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Unit Fisik
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-unit-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                  {assetCode} · {assetName}
                </p>
                <h3 id="add-unit-title" className="text-[16px] font-bold text-[#121826]">
                  Tambah Unit Fisik Baru
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
                  htmlFor="plp-unit-code"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Kode Unit (Unik)
                </label>
                <input
                  id="plp-unit-code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`misal: ${assetCode}-U01`}
                  className={controlClass + " mt-1 uppercase"}
                />
              </div>

              <div>
                <label
                  htmlFor="plp-unit-label"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Label Identifikasi Unit
                </label>
                <input
                  id="plp-unit-label"
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="misal: Unit 01 (Meja Lab 3)"
                  className={controlClass + " mt-1"}
                />
              </div>

              <div>
                <label
                  htmlFor="plp-unit-location"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Lokasi Penyimpanan (Meja / Rak / Gudang)
                </label>
                <input
                  id="plp-unit-location"
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="misal: Meja Praktikum 1 atau Rak Gantung B"
                  className={controlClass + " mt-1"}
                />
              </div>

              <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8F9FA] p-3 text-[11px] text-[#475569]">
                <p className="font-semibold text-[#121826]">🏷️ Tag QR Code Otomatis:</p>
                <p className="mt-0.5">
                  Unit akan langsung diterbitkan QR Code unik:{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-[#8D6500] border border-[#FDE68A]">
                    RK-UNT-{code.trim().toUpperCase()}
                  </code>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="plp-unit-status"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Status
                  </label>
                  <select
                    id="plp-unit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={controlClass + " mt-1"}
                  >
                    <option value="AVAILABLE">AVAILABLE · Siap pakai</option>
                    <option value="MAINTENANCE">MAINTENANCE · Perbaikan</option>
                    <option value="DAMAGED">DAMAGED · Rusak</option>
                    <option value="UNDER_INSPECTION">
                      UNDER INSPECTION · Inspeksi
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="plp-unit-condition"
                    className="block text-[11px] font-semibold text-[#6B6B6B]"
                  >
                    Kondisi
                  </label>
                  <select
                    id="plp-unit-condition"
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
              </div>

              <div>
                <label
                  htmlFor="plp-unit-notes"
                  className="block text-[11px] font-semibold text-[#6B6B6B]"
                >
                  Catatan Unit (Opsional)
                </label>
                <textarea
                  id="plp-unit-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan kelengkapan kabel, aksesoris, atau kalibrasi..."
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
                  {pending ? "Menyimpan..." : "Simpan Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
