"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export type OpnameCountEntry = {
  materialBatchId: string;
  materialCode: string;
  materialName: string;
  lotNumber: string | null;
  unit: string;
  counted: number;
};

export function OpnameCountForm({
  sessionId,
  entries,
}: {
  sessionId: string;
  entries: OpnameCountEntry[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      entries.map((entry) => [entry.materialBatchId, String(entry.counted)]),
    ),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function save(materialBatchId: string) {
    const parsed = Number(values[materialBatchId]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Isi jumlah fisik dengan angka 0 atau lebih.");
      return;
    }
    setPendingId(materialBatchId);
    setSavedId(null);
    setError("");
    try {
      await apiRequest(`/api/plp/opname/${sessionId}/count`, {
        method: "POST",
        body: { materialBatchId, countedQuantity: parsed },
      });
      setSavedId(materialBatchId);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-4 py-6 text-center text-[12px] text-[#6B6B6B]">
        Sesi ini tidak memiliki batch aktif untuk dihitung.
      </p>
    );
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
      {savedId && (
        <p
          role="status"
          className="rounded-xl border border-[#BFE3CE] bg-[#E5F5ED] px-4 py-3 text-[12px] font-medium text-[#03683A]"
        >
          Jumlah fisik tersimpan. Lanjutkan ke batch lain atau selesaikan sesi.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Input jumlah fisik per batch material
          </caption>
          <thead>
            <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
              <th scope="col" className="px-3 py-3 font-semibold">
                Material
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Lot
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Satuan
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Jumlah fisik
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.materialBatchId}
                className="border-b border-[#F1F0EC] last:border-0"
              >
                <td className="px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#212121]">
                    {entry.materialName}
                  </p>
                  <p className="text-[11px] text-[#929292]">
                    {entry.materialCode}
                  </p>
                </td>
                <td className="px-3 py-2 text-[12px] text-[#6B6B6B]">
                  {entry.lotNumber ?? "-"}
                </td>
                <td className="px-3 py-2 text-[12px] text-[#6B6B6B]">
                  {entry.unit}
                </td>
                <td className="px-3 py-2">
                  <label className="flex flex-col gap-1">
                    <span className="sr-only">
                      Jumlah fisik {entry.materialName}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      inputMode="decimal"
                      value={values[entry.materialBatchId] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [entry.materialBatchId]: event.target.value,
                        }))
                      }
                      className={controlClass}
                    />
                  </label>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => save(entry.materialBatchId)}
                    disabled={pendingId !== null}
                    className="inline-flex min-h-11 items-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
                  >
                    {pendingId === entry.materialBatchId
                      ? "Menyimpan..."
                      : "Simpan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#929292]">
        Hitung hanya mencatat angka fisik. Tidak ada penyesuaian stok otomatis;
        koreksi tetap lewat penyesuaian batch manual.
      </p>
    </div>
  );
}
