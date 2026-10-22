import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type WastePdfLogItem = {
  code: string;
  disposedAt: string | Date;
  studentName: string;
  studentUsername?: string | null;
  requestCode?: string | null;
  containerName: string;
  containerCode: string;
  categoryName: string;
  categoryHazardBadge?: string | null;
  quantity: string | number;
  unit: string;
  chemicalDescription: string;
  status: string;
  notes?: string | null;
};

export type WastePdfSummary = {
  totalLogs: number;
  totalVolumeL: number;
  totalVolumeKg: number;
  byCategory: { name: string; volumeL: number; count: number }[];
};

export function exportWasteLogsToPdf({
  logs,
  summary,
  periodLabel,
  roomDisplay = "Seluruh Ruangan Lab",
  filename = "laporan-logbook-limbah.pdf",
}: {
  logs: WastePdfLogItem[];
  summary: WastePdfSummary;
  periodLabel: string;
  roomDisplay?: string;
  filename?: string;
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const margin = 14;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("FAKULTAS MIPA · SISTEM MANAJEMEN LABORATORIUM REAKSAN", margin, 14);

  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("LAPORAN LOGBOOK PEMBUANGAN & NERACA LIMBAH B3", margin, 21);

  // Subtitle / Filters
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    `Ruangan: ${roomDisplay}   |   Periode: ${periodLabel}   |   Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
    margin,
    27,
  );

  // Summary Metrics Banner Box
  const summaryY = 32;
  const boxWidth = (pageWidth - margin * 2 - 9) / 4;
  const boxHeight = 16;

  const metrics = [
    { label: "Total Log Pembuangan", value: `${summary.totalLogs} Transaksi` },
    { label: "Total Akumulasi Cair", value: `${summary.totalVolumeL.toFixed(2)} Liter` },
    { label: "Total Akumulasi Padat", value: `${summary.totalVolumeKg.toFixed(2)} kg` },
    { label: "Kategori Terdaftar", value: `${summary.byCategory.length} Kategori B3` },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, summaryY, boxWidth, boxHeight, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, summaryY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(m.value, x + 3, summaryY + 12);
  });

  // Data Table
  const tableData = logs.map((item, index) => {
    const dateStr = new Date(item.disposedAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const studentStr = item.studentUsername
      ? `${item.studentName} (${item.studentUsername})`
      : item.studentName;

    const statusBadge =
      item.status === "VERIFIED"
        ? "TERVERIFIKASI"
        : item.status === "REJECTED"
          ? "DITOLAK"
          : "LOGGED";

    return [
      (index + 1).toString(),
      dateStr,
      item.code,
      studentStr,
      item.requestCode || "-",
      item.containerName,
      item.categoryName,
      `${item.quantity} ${item.unit}`,
      item.chemicalDescription,
      statusBadge,
    ];
  });

  autoTable(doc, {
    startY: summaryY + boxHeight + 6,
    margin: { left: margin, right: margin },
    head: [
      [
        "No",
        "Waktu",
        "Kode Log",
        "Mahasiswa / Pelapor",
        "Permohonan",
        "Wadah Jerigen",
        "Kategori",
        "Volume",
        "Deskripsi Sisa Reaksi",
        "Status",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85], // slate-700
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 38 },
      4: { cellWidth: 24 },
      5: { cellWidth: 36 },
      6: { cellWidth: 30 },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 42 },
      9: { cellWidth: 21, halign: "center" },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageStr = `Halaman ${data.pageNumber}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        pageStr,
        pageWidth - margin - 20,
        doc.internal.pageSize.getHeight() - 7,
      );
    },
  });

  // Signature Block at the end of table
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 150;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If there's not enough room for signatures (needs ~35mm), add new page
  if (finalY + 38 > pageHeight) {
    doc.addPage();
  }

  const signY = finalY + 38 > pageHeight ? 20 : finalY + 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const leftSignX = margin + 15;
  const rightSignX = pageWidth - margin - 65;

  doc.text("Mengetahui,", leftSignX, signY);
  doc.text("Kepala Laboratorium,", leftSignX, signY + 4.5);
  doc.text("___________________________", leftSignX, signY + 22);
  doc.text("NIP. ....................................", leftSignX, signY + 26);

  doc.text("Petugas Pengelola / PLP,", rightSignX, signY);
  doc.text("Laboratorium Kimia,", rightSignX, signY + 4.5);
  doc.text("___________________________", rightSignX, signY + 22);
  doc.text("NIP. ....................................", rightSignX, signY + 26);

  doc.save(filename);
}
