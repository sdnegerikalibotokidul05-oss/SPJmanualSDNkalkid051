import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export type PaperSize = 'A4' | 'F4';

export interface GeneratePdfOptions {
  filename?: string;
  documentTitle?: string;
  paperSize?: PaperSize;
  onProgress?: (progressText: string) => void;
}

export interface PrintDocumentOptions {
  documentTitle?: string;
  isModal?: boolean;
  paperSize?: PaperSize;
}

/**
 * Converts an OKLCH color string (e.g. "oklch(0.208 0.042 265)")
 * into a standard CSS rgb/rgba string ("rgb(14, 23, 43)").
 * Guarantees compatibility with all canvas & PDF rendering engines.
 */
function oklchToRgb(L: number, C: number, H: number, A: number = 1): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767434729 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const gamma = (x: number): number => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const R = Math.round(gamma(r) * 255);
  const G = Math.round(gamma(g) * 255);
  const B = Math.round(gamma(bl) * 255);

  return A < 1 ? `rgba(${R}, ${G}, ${B}, ${A})` : `rgb(${R}, ${G}, ${B})`;
}

/**
 * Searches and replaces any oklch(...) occurrences in a string
 */
function replaceOklchInString(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) return str;
  return str.replace(
    /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+(?:deg)?)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi,
    (_match, lStr, cStr, hStr, aStr) => {
      try {
        const L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
        const C = parseFloat(cStr);
        const H = parseFloat(hStr);
        const A = aStr ? (aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;
        return oklchToRgb(L, C, H, A);
      } catch {
        return 'rgb(0, 0, 0)';
      }
    }
  );
}

/**
 * Sanitizes any OKLCH colors and resets layout constraints in the cloned DOM tree
 * so that html2canvas captures full, unclipped content.
 */
function prepareAndSanitizeClonedDocument(clonedDoc: Document, clonedElement: HTMLElement) {
  // 1. Reset all parent hierarchy constraints in the clone
  let parent = clonedElement.parentElement;
  while (parent && parent !== clonedDoc.body) {
    parent.style.overflow = 'visible';
    parent.style.maxHeight = 'none';
    parent.style.height = 'auto';
    parent.style.position = 'static';
    parent.style.transform = 'none';
    parent.style.padding = '0';
    parent.style.margin = '0';
    parent = parent.parentElement;
  }

  if (clonedDoc.body) {
    clonedDoc.body.style.overflow = 'visible';
    clonedDoc.body.style.height = 'auto';
    clonedDoc.body.style.margin = '0';
    clonedDoc.body.style.padding = '0';
  }

  // 2. Set clean unclipped dimensions on target element
  // Narrow printable content width: 184.6mm (~698px at 96 DPI)
  clonedElement.style.overflow = 'visible';
  clonedElement.style.maxHeight = 'none';
  clonedElement.style.height = 'auto';
  clonedElement.style.width = '794px'; // 210mm at 96 DPI
  clonedElement.style.maxWidth = 'none';
  clonedElement.style.boxSizing = 'border-box';
  clonedElement.style.boxShadow = 'none';
  clonedElement.style.border = 'none';
  clonedElement.style.margin = '0 auto';
  clonedElement.style.backgroundColor = '#ffffff';
  clonedElement.style.color = '#000000';

  // 3. Sanitize all <style> tags for OKLCH
  try {
    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach(tag => {
      if (tag.textContent && tag.textContent.includes('oklch')) {
        tag.textContent = replaceOklchInString(tag.textContent);
      }
    });
  } catch (e) {
    console.warn('Failed to sanitize style tags:', e);
  }

  // 4. Convert computed oklch colors into explicit inline RGB styles
  const colorProperties = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
  ];

  const processElement = (el: HTMLElement) => {
    try {
      const computed = window.getComputedStyle(el);
      for (const prop of colorProperties) {
        const val = (computed as any)[prop];
        if (val && typeof val === 'string' && val.includes('oklch')) {
          (el.style as any)[prop] = replaceOklchInString(val);
        }
      }
    } catch {
      // Ignore unsupported elements
    }
  };

  processElement(clonedElement);
  const descendants = clonedElement.querySelectorAll<HTMLElement>('*');
  descendants.forEach(processElement);
}

/**
 * Searches near targetY for a clean blank row (white space) to avoid cutting through text/rows
 */
function findBestBreakY(canvas: HTMLCanvasElement, targetY: number, lookbackPx: number = 80): number {
  if (targetY >= canvas.height) return canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return targetY;

  try {
    const startY = Math.max(0, targetY - lookbackPx);
    const height = targetY - startY;
    const imgData = ctx.getImageData(0, startY, canvas.width, height);
    const data = imgData.data;

    // Search upwards from targetY for a row of predominantly white pixels
    for (let row = height - 1; row >= 0; row--) {
      let isRowBlank = true;
      for (let x = 0; x < canvas.width; x += 12) {
        const idx = (row * canvas.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r < 240 || g < 240 || b < 240) {
          isRowBlank = false;
          break;
        }
      }
      if (isRowBlank) {
        return startY + row;
      }
    }
  } catch {
    // If getImageData fails, fallback to targetY
  }
  return targetY;
}

/**
 * Generates and downloads an unclipped A4 PDF directly in the browser.
 * Pemotongan proporsional sesuai margin standar A4 (Narrow 12.7mm):
 * Tidak memaksakan 1 lembar utuh; dokumen mengalir secara alami per lembar A4.
 */
export async function generateAndDownloadPdf(
  element: HTMLElement | null,
  options: GeneratePdfOptions = {}
): Promise<boolean> {
  if (!element) {
    console.error('generateAndDownloadPdf: Element not found');
    return false;
  }

  const filename = options.filename || 'dokumen_sekolah.pdf';
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Temporarily reset scroll of parent container to top so html2canvas doesn't offset
  const parentScrollable = element.parentElement;
  const originalScrollTop = parentScrollable ? parentScrollable.scrollTop : 0;
  if (parentScrollable) {
    parentScrollable.scrollTop = 0;
  }

  try {
    options.onProgress?.('Menyiapkan dokumen...');

    // Wait for all images inside the element to load
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });
    await Promise.all(imagePromises);

    const paperSize: PaperSize = options.paperSize || 'A4';
    options.onProgress?.(`Merender tata letak ${paperSize === 'F4' ? 'F4 / Folio (21 × 33 cm)' : 'A4 (21 × 29.7 cm)'}...`);

    // Render DOM using html2canvas-pro with full unclipped height
    const canvas = await html2canvas(element, {
      scale: 2, // 2x resolution for sharp 300 DPI text and tables
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollY: 0,
      scrollX: 0,
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        prepareAndSanitizeClonedDocument(clonedDoc, clonedEl);
      },
    });

    options.onProgress?.(`Menyusun halaman PDF proporsional (${paperSize})...`);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperSize === 'F4' ? [210, 330] : 'a4',
      compress: true,
    });

    // Standar Kertas:
    // A4: 210mm x 297mm (Narrow Margin 12.7mm)
    // F4 (Folio): 210mm x 330mm (Narrow Margin 12.7mm)
    const pageWidthMm = 210;
    const pageHeightMm = paperSize === 'F4' ? 330 : 297;
    const marginMm = 12.7;

    const printableWidthMm = pageWidthMm - (marginMm * 2);   // 184.6 mm
    const printableHeightMm = pageHeightMm - (marginMm * 2); // 304.6 mm for F4, 271.6 mm for A4

    // Rasio pixel per mm pada lebar kanvas
    const pxPerMm = canvas.width / printableWidthMm;
    const maxPageCanvasHeight = Math.floor(printableHeightMm * pxPerMm);

    let yOffset = 0;
    let pageIndex = 0;

    while (yOffset < canvas.height) {
      if (pageIndex > 0) {
        pdf.addPage(paperSize === 'F4' ? [210, 330] : 'a4', 'portrait');
      }

      const remainingHeight = canvas.height - yOffset;
      let targetSliceHeight = Math.min(maxPageCanvasHeight, remainingHeight);

      // If remaining height is more than one page, find a clean row boundary to avoid cutting text
      if (targetSliceHeight < remainingHeight) {
        const breakY = findBestBreakY(canvas, yOffset + targetSliceHeight, 80);
        targetSliceHeight = Math.max(100, breakY - yOffset);
      }

      const sliceHeightMm = targetSliceHeight / pxPerMm;

      // Create slice canvas
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = targetSliceHeight;
      const sliceCtx = sliceCanvas.getContext('2d');

      if (sliceCtx) {
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0, yOffset, canvas.width, targetSliceHeight,
          0, 0, canvas.width, targetSliceHeight
        );
      }

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);

      // Add to PDF with exact 12.7mm margins
      pdf.addImage(
        sliceData,
        'JPEG',
        marginMm,
        marginMm,
        printableWidthMm,
        sliceHeightMm,
        undefined,
        'FAST'
      );

      yOffset += targetSliceHeight;
      pageIndex++;
    }

    options.onProgress?.('Mengunduh PDF...');
    pdf.save(cleanFilename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  } finally {
    // Restore original scroll position
    if (parentScrollable) {
      parentScrollable.scrollTop = originalScrollTop;
    }
  }
}

/**
 * Unified print utility function that dynamically targets only the specific
 * print-ready container of the current active document, ensuring that CSS styles
 * inside index.css correctly force page breaks and clean formatting during browser native printing.
 */
export async function printDocument(
  target: string | HTMLElement | null,
  options: PrintDocumentOptions = {}
): Promise<boolean> {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    console.error('printDocument: Container not found', target);
    return false;
  }

  const paperSize: PaperSize = options.paperSize || 'A4';
  const title = options.documentTitle || 'Dokumen Sekolah';
  const originalTitle = document.title;
  document.title = title;

  // Mark the specific active container for print styles
  document.querySelectorAll('[data-print-container]').forEach((el) => {
    if (el !== element) {
      el.removeAttribute('data-print-container');
    }
  });
  element.setAttribute('data-print-container', 'true');
  document.body.setAttribute('data-printing-active', 'true');
  document.body.setAttribute('data-paper-size', paperSize);
  if (options.isModal) {
    document.body.setAttribute('data-print-modal', 'true');
  } else {
    document.body.removeAttribute('data-print-modal');
  }

  // Inject dynamic @page size rule so browser print preview applies the selected paper size
  let dynamicStyle = document.getElementById('dynamic-paper-size-style');
  if (!dynamicStyle) {
    dynamicStyle = document.createElement('style');
    dynamicStyle.id = 'dynamic-paper-size-style';
    document.head.appendChild(dynamicStyle);
  }
  dynamicStyle.textContent = `
    @media print {
      @page {
        size: ${paperSize === 'F4' ? '210mm 330mm' : '210mm 297mm'} portrait;
        margin: 12.7mm;
      }
    }
  `;

  let cleanupRan = false;
  const cleanup = () => {
    if (cleanupRan) return;
    cleanupRan = true;
    document.title = originalTitle;
    document.body.removeAttribute('data-printing-active');
    document.body.removeAttribute('data-print-modal');
    document.body.removeAttribute('data-paper-size');
    element.removeAttribute('data-print-container');
    if (dynamicStyle && document.head.contains(dynamicStyle)) {
      document.head.removeChild(dynamicStyle);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  // Failsafe backup cleanup
  setTimeout(cleanup, 120000);

  let printSucceeded = false;

  // 1. Primary path: Native window.print()
  // Directly opens browser's native print menu (Chrome/Edge/Firefox/Safari)
  try {
    // 80ms tick allows the browser layout engine to acknowledge data-printing-active classes
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    window.print();
    printSucceeded = true;
  } catch (winErr: any) {
    console.warn('Direct window.print encountered an error or was sandboxed:', winErr);

    // 2. Secondary fallback: Isolated clean iframe print
    try {
      printSucceeded = await executeIsolatedIframePrint(element, title, paperSize);
    } catch (iframeErr) {
      console.warn('Isolated iframe print error:', iframeErr);
      printSucceeded = false;
    }
  }

  return printSucceeded;
}

/**
 * Creates an isolated clean iframe to invoke browser's native print dialog
 * specifically targeting only the active document container.
 */
function executeIsolatedIframePrint(
  element: HTMLElement,
  title: string,
  paperSize: PaperSize = 'A4'
): Promise<boolean> {
  return new Promise((resolve) => {
    let iframe: HTMLIFrameElement | null = null;
    let hasResolved = false;

    const safeResolve = (val: boolean) => {
      if (hasResolved) return;
      hasResolved = true;
      resolve(val);
      if (iframe && document.body.contains(iframe)) {
        setTimeout(() => {
          if (iframe && document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 5000);
      }
    };

    try {
      iframe = document.createElement('iframe');
      // CRITICAL: Do NOT use visibility: hidden or display: none!
      // In Chrome & Chromium, visibility: hidden completely suppresses the print dialog!
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        safeResolve(false);
        return;
      }

      // Collect all stylesheets from current document
      let stylesHtml = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        stylesHtml += node.outerHTML;
      });

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8" />
            <base href="${window.location.origin}/" />
            <title>${title}</title>
            ${stylesHtml}
            <style>
              @page {
                size: ${paperSize === 'F4' ? '210mm 330mm' : '210mm 297mm'} portrait;
                margin: 12.7mm;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                font-family: Arial, Helvetica, sans-serif !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
              }
              .print-target-wrapper {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background-color: #ffffff !important;
              }
              tr, .signature-block, .break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
              .page-break-before {
                break-before: page !important;
                page-break-before: always !important;
              }
              .page-break-after {
                break-after: page !important;
                page-break-after: always !important;
              }
            </style>
          </head>
          <body>
            <div class="print-target-wrapper">${element.outerHTML}</div>
          </body>
        </html>
      `);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          safeResolve(true);
        } catch {
          safeResolve(false);
        }
      };

      // Ensure images are loaded before printing
      const imgs = iframeDoc.querySelectorAll('img');
      if (imgs.length === 0) {
        setTimeout(triggerPrint, 200);
      } else {
        let loaded = 0;
        let done = false;
        const checkDone = () => {
          if (done) return;
          loaded++;
          if (loaded >= imgs.length) {
            done = true;
            setTimeout(triggerPrint, 150);
          }
        };

        imgs.forEach((img) => {
          if (img.complete) {
            checkDone();
          } else {
            img.onload = img.onerror = () => checkDone();
          }
        });

        // Failsafe timeout in case images take long
        setTimeout(() => {
          if (!done) {
            done = true;
            triggerPrint();
          }
        }, 800);
      }
    } catch {
      safeResolve(false);
    }
  });
}
