import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type PdfExportOptions = {
  filename?: string;
  orientation?: "portrait" | "landscape";
  marginMm?: number;
  scale?: number;
};

/**
 * Exports an HTML element directly to a downloadable .pdf file
 * without requiring the user to go through the browser's printer dialog.
 */
export async function exportElementToPdf(
  target: string | HTMLElement,
  options: PdfExportOptions = {},
): Promise<void> {
  const element =
    typeof target === "string" ? document.getElementById(target) : target;

  if (!element) {
    console.error("Target element for PDF export not found:", target);
    window.print();
    return;
  }

  const {
    filename = "laporan.pdf",
    orientation = "landscape",
    marginMm = 10,
    scale = 2,
  } = options;

  // Add temporary print-mode class to render clean printable background
  const originalBackground = element.style.backgroundColor;
  element.style.backgroundColor = "#FFFFFF";

  // Dimensions for A4 in millimeters
  const isLandscape = orientation === "landscape";
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;

  const printableWidth = pageWidth - marginMm * 2;
  const printableHeight = pageHeight - marginMm * 2;
  const pageAspectRatio = printableHeight / printableWidth;

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: "#FFFFFF",
      windowWidth: element.scrollWidth,
      onclone: (clonedDoc) => {
        // Expand scroll containers so full table width and height are rendered without scrollbars
        const scrollContainers = clonedDoc.querySelectorAll(
          ".overflow-x-auto, .overflow-y-auto, [class*='overflow-x-']",
        );
        scrollContainers.forEach((el) => {
          (el as HTMLElement).style.overflow = "visible";
        });

        // Show elements intended specifically for PDF export
        const pdfOnlyEls = clonedDoc.querySelectorAll(".pdf-only");
        pdfOnlyEls.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.classList.remove("hidden");
          if (
            htmlEl.classList.contains("grid") ||
            htmlEl.classList.contains("print:grid")
          ) {
            htmlEl.style.display = "grid";
          } else if (
            htmlEl.classList.contains("flex") ||
            htmlEl.classList.contains("print:flex")
          ) {
            htmlEl.style.display = "flex";
          } else {
            htmlEl.style.display = "block";
          }
        });

        // Hide UI controls, action buttons, web-only elements, and print-hidden elements
        const hiddenEls = clonedDoc.querySelectorAll(
          ".print-hidden, .no-pdf, .pdf-hidden, button:not(.keep-in-pdf)",
        );
        hiddenEls.forEach((el) => {
          (el as HTMLElement).style.display = "none";
        });

        // Find printable container inside the cloned document
        const targetId = typeof target === "string" ? target : element.id;
        const clonedTarget = targetId
          ? (clonedDoc.getElementById(targetId) ?? clonedDoc.body)
          : clonedDoc.body;

        if (clonedTarget) {
          const clonedTargetEl = clonedTarget as HTMLElement;
          clonedTargetEl.style.boxSizing = "border-box";
          clonedTargetEl.style.padding = "24px";
          clonedTargetEl.style.backgroundColor = "#FFFFFF";
          clonedTargetEl.style.border = "none";
          clonedTargetEl.style.boxShadow = "none";

          const containerWidth = Math.max(1024, clonedTargetEl.offsetWidth || 1100);
          clonedTargetEl.style.width = `${containerWidth}px`;
          clonedTargetEl.style.maxWidth = `${containerWidth}px`;

          const pageHeightInDom = containerWidth * pageAspectRatio;

          // Prevent table rows from being sliced in half across page slices
          const tableRows = Array.from(
            clonedTargetEl.querySelectorAll("tbody tr"),
          ) as HTMLElement[];

          for (let i = 0; i < tableRows.length; i++) {
            const rEl = tableRows[i];
            if (rEl.classList.contains("pdf-page-break-spacer")) continue;
            const targetBox = clonedTargetEl.getBoundingClientRect();
            const rBox = rEl.getBoundingClientRect();
            const rTop = rBox.top - targetBox.top;
            const rBottom = rBox.bottom - targetBox.top;
            const pageIndex = Math.floor(rTop / pageHeightInDom);
            const pageBoundary = (pageIndex + 1) * pageHeightInDom;

            // If the row straddles across the page boundary, push it onto the next page
            const safetyCutoff = pageBoundary - 16;
            if (rTop < safetyCutoff && rBottom > safetyCutoff) {
              const spacerHeight = Math.max(0, pageBoundary - rTop + 4);
              const spacer = clonedDoc.createElement("tr");
              spacer.className = "pdf-page-break-spacer";
              spacer.style.height = `${spacerHeight}px`;
              spacer.style.border = "none";
              const td = clonedDoc.createElement("td");
              td.colSpan = 100;
              td.style.border = "none";
              td.style.padding = "0";
              td.style.height = `${spacerHeight}px`;
              spacer.appendChild(td);
              rEl.parentNode?.insertBefore(spacer, rEl);
            }
          }

          // Locate signature footer element
          const signatureEl = (clonedTargetEl.querySelector(
            ".pdf-signature-block, [data-pdf-signature], .pdf-only.grid, footer.border-t",
          ) ?? null) as HTMLElement | null;

          let totalPages = 1;

          if (signatureEl) {
            // Reset existing margin to measure clean content boundary
            signatureEl.style.marginTop = "0px";
            signatureEl.style.marginBottom = "0px";

            const targetBox = clonedTargetEl.getBoundingClientRect();
            const sigBox = signatureEl.getBoundingClientRect();
            const prevContentBottom = sigBox.top - targetBox.top;
            const sigHeight = signatureEl.offsetHeight || 130;
            const bottomPadding = 24;

            const currentPage = Math.floor(prevContentBottom / pageHeightInDom);
            const currentPageBottom = (currentPage + 1) * pageHeightInDom;
            const spaceLeftOnCurrent = currentPageBottom - prevContentBottom;

            // Required space: signature height + bottom padding + margin clearance
            const neededHeight = sigHeight + bottomPadding + 16;

            let chosenTargetSigTop: number;
            if (spaceLeftOnCurrent >= neededHeight) {
              // Fits on the current page: anchor cleanly at the bottom of this page
              chosenTargetSigTop = currentPageBottom - sigHeight - bottomPadding;
              totalPages = currentPage + 1;
            } else {
              // Does not fit on current page: push to next page and anchor at its bottom
              const nextPgBottom = (currentPage + 2) * pageHeightInDom;
              chosenTargetSigTop = nextPgBottom - sigHeight - bottomPadding;
              totalPages = currentPage + 2;
            }

            const finalMarginTop = Math.max(
              16,
              Math.floor(chosenTargetSigTop - prevContentBottom),
            );
            signatureEl.style.marginTop = `${finalMarginTop}px`;
          } else {
            const currentHeight =
              clonedTargetEl.scrollHeight || clonedTargetEl.offsetHeight;
            totalPages = Math.max(1, Math.ceil(currentHeight / pageHeightInDom));
          }

          // Explicitly clamp the DOM container height to exactly totalPages * pageHeightInDom
          // This guarantees zero subpixel bleed, no extra blank page, and exact 1:1 canvas-to-PDF page mapping
          const exactTargetHeight = Math.ceil(totalPages * pageHeightInDom);
          clonedTargetEl.style.minHeight = `${exactTargetHeight}px`;
          clonedTargetEl.style.height = `${exactTargetHeight}px`;
          clonedTargetEl.style.overflow = "hidden";
        }
      },
    });

    // Calculate canvas pixel height corresponding to one printable page height
    const pxPerMm = canvas.width / printableWidth;
    const pageHeightPx = Math.floor(printableHeight * pxPerMm);

    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const totalPagesInPdf = Math.max(
      1,
      Math.round(canvas.height / pageHeightPx),
    );

    for (let pageIdx = 0; pageIdx < totalPagesInPdf; pageIdx++) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = pageHeightPx;
      const pageCtx = pageCanvas.getContext("2d");

      if (pageCtx) {
        pageCtx.fillStyle = "#FFFFFF";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageHeightPx);
        pageCtx.drawImage(
          canvas,
          0,
          pageIdx * pageHeightPx,
          canvas.width,
          pageHeightPx,
          0,
          0,
          canvas.width,
          pageHeightPx,
        );

        const pageImgData = pageCanvas.toDataURL("image/png");

        if (pageIdx > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          pageImgData,
          "PNG",
          marginMm,
          marginMm,
          printableWidth,
          printableHeight,
          undefined,
          "FAST",
        );
      }
    }

    const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
  } catch (error) {
    console.error("Failed to generate PDF via canvas, falling back to window.print():", error);
    window.print();
  } finally {
    element.style.backgroundColor = originalBackground;
  }
}
