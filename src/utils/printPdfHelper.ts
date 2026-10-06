import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface GeneratePdfOptions {
  filename?: string;
  documentTitle?: string;
  onProgress?: (progressText: string) => void;
}

/**
 * Generates and downloads a high-resolution A4 PDF directly in the browser
 * Works 100% inside sandboxed iframes without relying on window.print()
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

    options.onProgress?.('Merender tata letak A4...');

    // Render DOM to high-resolution canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 2x resolution for sharp 300 DPI text and tables
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    options.onProgress?.('Menyusun file PDF...');

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Standard A4 dimensions in mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 8; // Margin inside PDF

    const printableWidth = pageWidthMm - (marginMm * 2);
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = marginMm;

    // First page
    pdf.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= (pageHeightMm - (marginMm * 2));

    // Subsequent pages if document height exceeds single A4 page
    while (heightLeft > 5) { // Threshold for tiny trailing white-spaces
      position = marginMm - (imgHeight - heightLeft);
      pdf.addPage('a4', 'portrait');
      pdf.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pageHeightMm - (marginMm * 2));
    }

    options.onProgress?.('Mengunduh PDF...');
    pdf.save(cleanFilename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

/**
 * Executes browser print.
 * If blocked by iframe sandbox ('allow-modals' restriction),
 * automatically falls back to generating a PDF download.
 */
export async function printOrSaveDocument(
  element: HTMLElement | null,
  options: GeneratePdfOptions = {}
): Promise<{ method: 'print' | 'pdf'; success: boolean }> {
  if (!element) return { method: 'print', success: false };

  // Try direct iframe-based printing first
  let printSucceeded = false;
  try {
    // Check if we are inside an iframe and window.print might be blocked
    const isSandboxedIframe = window.self !== window.top;

    if (!isSandboxedIframe) {
      window.print();
      return { method: 'print', success: true };
    }

    // Inside iframe: try printing via hidden iframe helper
    printSucceeded = await tryHiddenIframePrint(element, options.documentTitle);
    if (printSucceeded) {
      return { method: 'print', success: true };
    }
  } catch (err) {
    console.warn('Direct print blocked or failed, falling back to PDF download:', err);
  }

  // Fallback: Generate real PDF download immediately
  const pdfSuccess = await generateAndDownloadPdf(element, options);
  return { method: 'pdf', success: pdfSuccess };
}

/**
 * Attempts to print using a clean, isolated hidden iframe containing only the document
 */
function tryHiddenIframePrint(element: HTMLElement, title?: string): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      // Collect all styles from the current document
      let stylesHtml = '';
      const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
      styleElements.forEach(el => {
        stylesHtml += el.outerHTML;
      });

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title || 'Cetak Dokumen Sekolah'}</title>
            ${stylesHtml}
            <style>
              @page {
                size: A4 portrait;
                margin: 12.7mm;
              }
              body {
                background: white !important;
                color: black !important;
                font-family: Arial, Helvetica, sans-serif !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            </style>
          </head>
          <body>
            ${element.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow?.focus();

      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
          // Give user time before cleanup
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
          resolve(true);
        } catch (printErr) {
          console.warn('iframe.contentWindow.print error:', printErr);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve(false);
        }
      }, 500);
    } catch (e) {
      console.warn('Hidden iframe print error:', e);
      resolve(false);
    }
  });
}
