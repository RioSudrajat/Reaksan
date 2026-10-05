import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { ExportLink } from "@/components/export-link";
import { PrintButton } from "@/components/plp/print-button";
import { formatDate } from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { getRoomScope } from "@/services/access-scope.service";
import { getOpnameSessionDetail } from "@/services/opname.service";
import { cn } from "cn";

export const metadata: Metadata = { title: "Lembar & Berita Acara Opname" };

const numberFormat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

function formatNum(val: number) {
  return numberFormat.format(val);
}

function formatSigned(val: number) {
  return `${val > 0 ? "+" : ""}${numberFormat.format(val)}`;
}

export default async function OpnameSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requirePermission({ inventory: ["manage-any"] });
  const scope = await getRoomScope(user.id, user.role);
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const session = await getOpnameSessionDetail(parsedId.data);
  if (!session) notFound();
  if (!scope.all && !scope.roomCodes.includes(session.roomCode)) notFound();

  // Summary calculations
  const totalEntries = session.entries.length;
  const entriesWithDiff = session.entries.filter((e) => Math.abs(e.difference) > 1e-4);
  const matchedEntries = totalEntries - entriesWithDiff.length;
  const positiveDiffTotal = session.entries
    .filter((e) => e.difference > 1e-4)
    .reduce((acc, e) => acc + e.difference, 0);
  const negativeDiffTotal = session.entries
    .filter((e) => e.difference < -1e-4)
    .reduce((acc, e) => acc + e.difference, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          aside, header, nav, .print-hidden, .pdf-hidden {
            display: none !important;
          }
          #opname-official-sheet {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: #212121 !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: calc(100vh - 20mm) !important;
          }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100% !important; max-width: 100% !important; table-layout: auto !important; page-break-inside: auto; }
          tr { break-inside: avoid !important; page-break-inside: avoid !important; page-break-after: auto; }
          th, td { word-break: break-word !important; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .pdf-signature-block {
            margin-top: auto !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: auto;
          }
        }
      `}</style>

      {/* Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print-hidden">
        <Link
          href={`/plp/inventory/opname/${session.id}`}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#212121] transition hover:bg-[#F5F5F5] hover:border-[#212121]/30 shadow-2xs"
        >
          <ArrowLeft className="size-3.5 text-[#6B6B6B]" aria-hidden="true" />
          <span>Kembali ke Detail Sesi</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <PrintButton
            targetId="opname-official-sheet"
            filename={`berita_acara_opname_${session.id.slice(0, 8)}.pdf`}
            orientation="landscape"
            label="Unduh Berita Acara PDF"
          />
          <ExportLink
            report="opname-variance"
            query={{ sessionId: session.id }}
            label="Unduh Laporan Lengkap CSV"
          />
        </div>
      </div>

      {/* Official Printable Sheet Card */}
      <div
        id="opname-official-sheet"
        className="rounded-2xl border border-[#E1E1E1] bg-white p-6 sm:p-8 shadow-xs"
      >
        {/* Letterhead Kop Resmi */}
        <header className="border-b-2 border-[#212121] pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#AE7C1D]">
                Universitas Padjadjaran · Laboratorium Reaksan
              </p>
              <h1 className="text-[18px] font-bold text-[#212121]">
                BERITA ACARA & LEMBAR HASIL SENSUS STOK OPNAME
              </h1>
              <p className="text-[12px] text-[#6B6B6B]">
                Laporan inventarisasi fisik, verifikasi baseline sistem, dan rekapitulasi selisih stok laboratorium.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="inline-block rounded-lg bg-[#FEF1CC] px-3 py-1 font-mono text-[11px] font-bold text-[#AE7C1D] border border-[#F9B129]/30">
                {session.status === "COMPLETED" ? "STATUS: SELESAI" : "STATUS: BERJALAN"}
              </span>
            </div>
          </div>

          {/* Session Metadata Grid */}
          <div className="mt-4 grid gap-2 text-[12px] sm:grid-cols-2 lg:grid-cols-4 rounded-xl bg-[#F8F9FA] p-3 border border-[#E1E1E1]/80">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                Ruang Laboratorium
              </span>
              <strong className="text-[#212121] font-semibold">
                {session.roomName} ({session.roomCode})
              </strong>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                Waktu Pelaksanaan
              </span>
              <span className="text-[#212121]">
                {formatDate(session.startedAt)}
                {session.completedAt && ` s/d ${formatDate(session.completedAt)}`}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                Petugas Pelaksana
              </span>
              <span className="text-[#212121] font-medium">
                {session.startedByName}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                ID Sesi Opname
              </span>
              <span className="font-mono text-[11px] text-[#6B6B6B] truncate block">
                {session.id}
              </span>
            </div>
          </div>

          {/* Summary Metric Ribbon */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center text-[11px]">
            <div className="rounded-lg border border-[#E1E1E1] bg-white p-2">
              <span className="block text-[10px] text-[#6B6B6B]">Total Item</span>
              <strong className="text-[14px] font-bold text-[#212121] tabular-nums">
                {totalEntries}
              </strong>
            </div>
            <div className="rounded-lg border border-[#E1E1E1] bg-white p-2">
              <span className="block text-[10px] text-[#6B6B6B]">Sesuai (Match)</span>
              <strong className="text-[14px] font-bold text-[#16A34A] tabular-nums">
                {matchedEntries}
              </strong>
            </div>
            <div className="rounded-lg border border-[#E1E1E1] bg-white p-2">
              <span className="block text-[10px] text-[#6B6B6B]">Berselisih</span>
              <strong className={cn("text-[14px] font-bold tabular-nums", entriesWithDiff.length > 0 ? "text-[#AE7C1D]" : "text-[#212121]")}>
                {entriesWithDiff.length}
              </strong>
            </div>
            <div className="rounded-lg border border-[#E1E1E1] bg-white p-2">
              <span className="block text-[10px] text-[#6B6B6B]">Varian Positif</span>
              <strong className="text-[14px] font-bold text-[#16A34A] tabular-nums">
                {formatSigned(positiveDiffTotal)}
              </strong>
            </div>
            <div className="rounded-lg border border-[#E1E1E1] bg-white p-2">
              <span className="block text-[10px] text-[#6B6B6B]">Varian Negatif</span>
              <strong className="text-[14px] font-bold text-[#DC2626] tabular-nums">
                {formatSigned(negativeDiffTotal)}
              </strong>
            </div>
          </div>
        </header>

        {/* Complete Sensus & Variance Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px]">
            <caption className="sr-only">
              Daftar sensus fisik, baseline sistem, dan selisih stok opname
            </caption>
            <thead>
              <tr className="border-b-2 border-[#212121] bg-[#F8F9FA] text-[10px] font-bold uppercase tracking-wider text-[#212121]">
                <th scope="col" className="w-8 px-2 py-2.5 text-center">
                  No
                </th>
                <th scope="col" className="px-2 py-2.5 min-w-[180px]">
                  Fasilitas / Bahan
                </th>
                <th scope="col" className="px-2 py-2.5 min-w-[120px]">
                  Lokasi Simpan
                </th>
                <th scope="col" className="px-2 py-2.5 min-w-[100px]">
                  Lot / Label
                </th>
                <th scope="col" className="px-2 py-2.5 w-16 text-center">
                  Satuan
                </th>
                <th scope="col" className="px-2 py-2.5 w-24 text-right">
                  Baseline (Sistem)
                </th>
                <th scope="col" className="px-2 py-2.5 w-24 text-right">
                  Jumlah Fisik
                </th>
                <th scope="col" className="px-2 py-2.5 w-24 text-right">
                  Selisih (Variance)
                </th>
                <th scope="col" className="px-2 py-2.5 min-w-[130px]">
                  Kondisi & Catatan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E1E1]">
              {session.entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-[#6B6B6B]">
                    Tidak ada item fisik atau bahan aktif terdaftar pada ruangan ini.
                  </td>
                </tr>
              ) : (
                session.entries.map((entry, index) => {
                  const hasDiff = Math.abs(entry.difference) > 1e-4;
                  const isPositive = entry.difference > 1e-4;
                  const isNegative = entry.difference < -1e-4;
                  const typeLabel =
                    entry.itemType === "MATERIAL"
                      ? "Bahan"
                      : entry.itemType === "INSTRUMENT"
                        ? "Instrumen"
                        : "Alat";

                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        "transition",
                        hasDiff && "bg-[#FEF1CC]/15 font-medium",
                      )}
                    >
                      {/* No */}
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] text-[#6B6B6B]">
                        {index + 1}
                      </td>

                      {/* Name & Code */}
                      <td className="px-2 py-2.5 text-[#212121]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{entry.materialName}</span>
                            <span className="rounded bg-[#F5F5F5] px-1 py-0.2 text-[9px] font-bold text-[#6B6B6B] border border-[#E1E1E1]">
                              {typeLabel}
                            </span>
                          </div>
                          <span className="block font-mono text-[10px] text-[#6B6B6B]">
                            {entry.materialCode}
                          </span>
                        </div>
                      </td>

                      {/* Storage Location */}
                      <td className="px-2 py-2.5 text-[#6B6B6B] text-[11px]">
                        {entry.storageLocation ?? "-"}
                      </td>

                      {/* Lot or Asset Code */}
                      <td className="px-2 py-2.5 font-mono text-[11px] text-[#212121]">
                        {entry.lotNumber ?? "-"}
                      </td>

                      {/* Unit */}
                      <td className="px-2 py-2.5 text-center text-[#6B6B6B] text-[11px]">
                        {entry.unit}
                      </td>

                      {/* Baseline (System) */}
                      <td className="px-2 py-2.5 text-right font-mono text-[12px] font-medium text-[#212121] tabular-nums">
                        {formatNum(entry.baseline)}
                      </td>

                      {/* Counted (Physical) */}
                      <td className="px-2 py-2.5 text-right font-mono text-[12px] font-bold text-[#212121] tabular-nums">
                        {formatNum(entry.counted)}
                      </td>

                      {/* Difference */}
                      <td className="px-2 py-2.5 text-right font-mono text-[12px] font-bold tabular-nums">
                        {hasDiff ? (
                          <span
                            className={cn(
                              "inline-block rounded px-1.5 py-0.5 text-[11px]",
                              isPositive && "bg-[#E5F5ED] text-[#03683A]",
                              isNegative && "bg-[#FDE9E9] text-[#9E3636]",
                            )}
                          >
                            {formatSigned(entry.difference)}
                          </span>
                        ) : (
                          <span className="text-[#6B6B6B]">0</span>
                        )}
                      </td>

                      {/* Condition & Notes */}
                      <td className="px-2 py-2.5 text-[11px]">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#212121]">
                            {entry.condition ?? "Baik"}
                          </span>
                          {(entry.varianceReason || entry.notes) && (
                            <p className="text-[10px] text-[#AE7C1D]">
                              {entry.varianceReason || entry.notes}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Official Signatures */}
        <footer
          data-pdf-signature="true"
          className="mt-10 border-t border-[#212121] pt-6 pdf-signature-block"
        >
          <div className="grid grid-cols-2 gap-12 text-[12px] text-[#212121]">
            <div>
              <p className="font-bold">Petugas Pencacah Fisik Lapangan:</p>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                Telah melakukan pemeriksaan dan penghitungan fisik secara langsung di lokasi.
              </p>
              <div className="mt-14 border-t border-dashed border-[#212121] pt-1">
                <p className="font-semibold">{session.startedByName}</p>
                <p className="text-[10px] text-[#6B6B6B]">Pranata Laboratorium Pendidikan</p>
              </div>
            </div>

            <div>
              <p className="font-bold">Verifikator / Mengetahui:</p>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                Hasil sensus diverifikasi dan disahkan untuk pembukuan persediaan laboratorium.
              </p>
              <div className="mt-14 border-t border-dashed border-[#212121] pt-1">
                <p className="font-semibold">{session.completedByName ?? "Koordinator Laboratorium"}</p>
                <p className="text-[10px] text-[#6B6B6B]">NIP / Identitas Verifikator Resmi</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[10px] text-[#6B6B6B] border-t border-[#E1E1E1] pt-2">
            <span>Dicetak secara resmi melalui Sistem Informasi Reaksan UNPAD</span>
            <span className="font-mono">Dokumen Referensi: {session.id}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
