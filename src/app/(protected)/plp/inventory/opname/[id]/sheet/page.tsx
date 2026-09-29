import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ExportLink } from "@/components/export-link";
import { PrintButton } from "@/components/plp/print-button";
import { formatDate } from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { getRoomScope } from "@/services/access-scope.service";
import { getOpnameSessionDetail } from "@/services/opname.service";

export const metadata: Metadata = { title: "Lembar Hitung Opname" };

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

  return (
    <div className="mx-auto max-w-3xl">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #count-sheet, #count-sheet * { visibility: visible; }
          #count-sheet { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
        }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <PrintButton />
        <ExportLink
          report="inventory-batches"
          query={{ room: session.roomCode }}
          label="Unduh batch CSV"
        />
        <ExportLink report="low-stock" label="Unduh stok rendah CSV" />
        <ExportLink report="issue-return" label="Unduh issue/return CSV" />
      </div>

      <div
        id="count-sheet"
        className="rounded-xl border border-[#E1E1E1] bg-white p-6"
      >
        <header className="border-b border-[#212121] pb-4">
          <h1 className="text-[18px] font-bold text-[#212121]">
            Lembar hitung stok opname
          </h1>
          <dl className="mt-3 grid gap-1 text-[12px] text-[#212121] sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="font-semibold">Room:</dt>
              <dd>
                {session.roomName} ({session.roomCode})
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Tanggal:</dt>
              <dd>{formatDate(session.startedAt)}</dd>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <dt className="font-semibold">Id sesi:</dt>
              <dd className="break-all font-mono text-[11px]">{session.id}</dd>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <dt className="font-semibold">Petugas:</dt>
              <dd>{session.startedByName}</dd>
            </div>
          </dl>
        </header>

        <table className="mt-4 w-full border-collapse text-left">
          <caption className="sr-only">
            Daftar batch untuk dihitung fisik
          </caption>
          <thead>
            <tr className="border-b border-[#212121] text-[11px] uppercase tracking-[0.06em] text-[#212121]">
              <th scope="col" className="w-10 px-2 py-2 font-semibold">
                No
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Material
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Lot
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Satuan
              </th>
              <th scope="col" className="w-32 px-2 py-2 font-semibold">
                Jumlah fisik
              </th>
            </tr>
          </thead>
          <tbody>
            {session.entries.map((entry, index) => (
              <tr key={entry.id} className="border-b border-[#D9D9D9]">
                <td className="px-2 py-2 text-[12px] text-[#212121]">
                  {index + 1}
                </td>
                <td className="px-2 py-2 text-[12px] text-[#212121]">
                  <span className="font-semibold">{entry.materialName}</span>
                  <span className="block text-[10px] text-[#6B6B6B]">
                    {entry.materialCode}
                  </span>
                </td>
                <td className="px-2 py-2 text-[12px] text-[#212121]">
                  {entry.lotNumber ?? "-"}
                </td>
                <td className="px-2 py-2 text-[12px] text-[#212121]">
                  {entry.unit}
                </td>
                <td
                  className="h-10 px-2 py-2"
                  aria-label="Kolom kosong jumlah fisik"
                />
              </tr>
            ))}
          </tbody>
        </table>

        {session.entries.length === 0 && (
          <p className="mt-4 text-[12px] text-[#6B6B6B]">
            Tidak ada batch aktif pada sesi ini.
          </p>
        )}

        <footer className="mt-8 grid gap-8 text-[12px] text-[#212121] sm:grid-cols-2">
          <div>
            <p>Dihitung oleh</p>
            <div className="mt-10 border-t border-[#212121] pt-1 text-[11px] text-[#6B6B6B]">
              Nama dan tanda tangan
            </div>
          </div>
          <div>
            <p>Diperiksa oleh</p>
            <div className="mt-10 border-t border-[#212121] pt-1 text-[11px] text-[#6B6B6B]">
              Nama dan tanda tangan
            </div>
          </div>
        </footer>
        <p className="mt-4 text-[10px] text-[#6B6B6B]">
          Lembar ini tidak menampilkan baseline. Gunakan print to PDF dari
          browser untuk arsip digital.
        </p>
      </div>
    </div>
  );
}
