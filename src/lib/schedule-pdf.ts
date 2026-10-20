import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ScheduleEvent } from "@/components/schedule-data";
import { requestStatusLabels } from "@/components/schedule-data";
import type { PlpScheduleEvent } from "@/services/plp.service";

function formatDateId(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function formatTimeId(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function calculateDays(startAt: string, endAt: string) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
}

export function exportScheduleEventsToPdf({
  events,
  periodLabel,
  roomDisplay,
  filename,
}: {
  events: ScheduleEvent[];
  periodLabel: string;
  roomDisplay: string;
  filename: string;
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const margin = 14;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("UNIVERSITAS PADJADJARAN · FAKULTAS MIPA · REAKSAN LAB", margin, 14);

  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("RIWAYAT & AGENDA PEMINJAMAN LABORATORIUM", margin, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    `Periode: ${periodLabel}   |   Fasilitas: ${roomDisplay}   |   Total: ${events.length} Permohonan Terjadwal`,
    margin,
    27,
  );

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, 30, pageWidth - margin, 30);

  // Table Body Rows
  const bodyRows = events.map((evt, idx) => {
    const days = calculateDays(evt.startAt, evt.endAt);
    const equipItems = (evt.equipment || []).map(
      (eq) => `• ${eq.name} [${eq.unitLabel || eq.unitId}]`,
    );
    const matItems = (evt.materials || []).map(
      (m) => `• ${m.name} (${m.quantity} ${m.unit})`,
    );
    const facilityText =
      [...equipItems, ...matItems].join("\n") || "Hanya pemakaian ruangan";

    let statusText = (requestStatusLabels[evt.status] || evt.status).toUpperCase();
    if (evt.status === "OVERDUE") {
      statusText += "\n(Belum Kembali)";
    }

    return [
      String(idx + 1),
      `[${evt.requestCode || "-"}]\n${evt.title}`,
      `${evt.actor}\nDosen: ${evt.supervisor || "-"}`,
      facilityText,
      `${formatDateId(evt.startAt)} – ${formatDateId(evt.endAt)}\n(${days} hari)`,
      statusText,
    ];
  });

  autoTable(doc, {
    startY: 33,
    margin: { left: margin, right: margin, top: 33, bottom: 20 },
    head: [
      [
        "No.",
        "KODE & JUDUL PENELITIAN",
        "PEMINJAM & PEMBIMBING",
        "FASILITAS & BAHAN",
        "JADWAL & DURASI",
        "STATUS",
      ],
    ],
    body: bodyRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // #1E293B
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [33, 33, 33],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      cellPadding: 3,
      valign: "top",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #F8FAFC
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center", fontStyle: "bold", cellPadding: 2 },
      1: { cellWidth: 67 },
      2: { cellWidth: 49 },
      3: { cellWidth: 68 },
      4: { cellWidth: 41 },
      5: { cellWidth: 30, halign: "center", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      // Custom colored status text
      if (data.section === "body" && data.column.index === 5) {
        const raw = String(data.cell.raw);
        if (raw.includes("LEWAT TENGGAT")) {
          doc.setTextColor(220, 38, 38); // red-600
        } else if (raw.includes("DISETUJUI")) {
          doc.setTextColor(4, 132, 68); // green
        } else if (raw.includes("SEDANG DIGUNAKAN")) {
          doc.setTextColor(174, 124, 29); // amber
        } else if (raw.includes("SELESAI")) {
          doc.setTextColor(71, 85, 105); // slate-600
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbers
      const pageCount = doc.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400

      const printedAt = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date());

      doc.text(
        `Dicetak otomatis dari Sistem Laboratorium Reaksan UNPAD · ${printedAt}`,
        margin,
        doc.internal.pageSize.getHeight() - 8,
      );

      const pageStr = `Halaman ${data.pageNumber} dari ${pageCount}`;
      doc.text(
        pageStr,
        pageWidth - margin - doc.getTextWidth(pageStr),
        doc.internal.pageSize.getHeight() - 8,
      );
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If there's enough room on the last page for signature block, add it, otherwise add new page
  if (finalY + 35 > pageHeight - 15) {
    doc.addPage();
  }

  const sigY = (finalY + 35 > pageHeight - 15 ? 20 : finalY + 12);
  const sigX = pageWidth - margin - 65;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(33, 33, 33);
  doc.text("Jatinangor, ....................................", sigX, sigY);
  doc.text("Koordinator PLP Laboratorium,", sigX, sigY + 5);
  doc.text("( _____________________________ )", sigX, sigY + 23);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("NIP. ........................................", sigX, sigY + 28);

  const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(safeFilename);
}

export function exportDailyRunSheetToPdf({
  events,
  date,
  roomName,
  filename,
}: {
  events: PlpScheduleEvent[];
  date: string;
  roomName?: string;
  filename: string;
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 12;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("UNIVERSITAS PADJADJARAN · FAKULTAS MIPA", margin, 14);

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("DAILY RUN SHEET OPERASIONAL LABORATORIUM", margin, 21);

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00+07:00`));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Tanggal: ${formattedDate}   |   Lab: ${roomName || "Semua Lab"}   |   Total: ${events.length} Sesi Operasional`,
    margin,
    27,
  );

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 30, pageWidth - margin, 30);

  const bodyRows = events.map((evt, idx) => {
    const timeRange = `${formatTimeId(evt.startAt)} - ${formatTimeId(evt.endAt)}`;
    const statusText = (requestStatusLabels[evt.status as keyof typeof requestStatusLabels] || evt.status).toUpperCase();

    return [
      String(idx + 1),
      timeRange,
      evt.roomName,
      `[${evt.code || "-"}]\n${evt.title}\nPeminjam: ${evt.actorName}`,
      evt.resource || "-",
      statusText,
    ];
  });

  autoTable(doc, {
    startY: 33,
    margin: { left: margin, right: margin, top: 33, bottom: 18 },
    head: [["No.", "WAKTU", "RUANGAN", "KEGIATAN & PEMINJAM", "ALAT & BAHAN", "STATUS"]],
    body: bodyRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [33, 33, 33],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      cellPadding: 2.5,
      valign: "top",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold", cellPadding: 2 },
      1: { cellWidth: 24, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 27 },
      3: { cellWidth: 53 },
      4: { cellWidth: 47 },
      5: { cellWidth: 23, halign: "center", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      const printedAt = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date());

      doc.text(
        `Dicetak otomatis dari Sistem Laboratorium Reaksan UNPAD · ${printedAt}`,
        margin,
        doc.internal.pageSize.getHeight() - 6,
      );

      const pageStr = `Halaman ${data.pageNumber} dari ${pageCount}`;
      doc.text(
        pageStr,
        pageWidth - margin - doc.getTextWidth(pageStr),
        doc.internal.pageSize.getHeight() - 6,
      );
    },
  });

  const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(safeFilename);
}
