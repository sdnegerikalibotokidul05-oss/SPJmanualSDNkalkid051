import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface GeneratePdfOptions {
  filename?: string;
  documentTitle?: string;
  onProgress?: (progressText: string) => void;
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
 * to ensure that nothing is clipped or truncated by parent scroll/overflow/height.
 */
function prepareAndSanitizeClonedDocument(clonedDoc: Document, clonedElement: HTMLElement) {
  // 1. Reset all parent hierarchy constraints so the cloned element can expand fully
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

  // 2. Set exact A4 dimensions and clear clipping styles on the target element
  clonedElement.style.overflow = 'visible';
  clonedElement.style.maxHeight = 'none';
  clonedElement.style.height = 'auto';
  clonedElement.style.width = '794px'; // 210mm in CSS pixels at 96 DPI
  clonedElement.style.minHeight = '1123px'; // 297mm in CSS pixels at 96 DPI
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

  // 4. Walk elements and convert computed oklch colors into explicit inline RGB styles
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
 * Generates and downloads a pristine, complete, unclipped A4 PDF directly in the browser
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

    options.onProgress?.('Merender tata letak A4 penuh...');

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

    options.onProgress?.('Menyusun file PDF...');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const a4Aspect = pageHeightMm / pageWidthMm; // ~1.4143
    const canvasAspect = canvas.height / canvas.width;

    if (canvasAspect <= a4Aspect * 1.08) {
      // Single A4 document: scale cleanly to fit exactly within 210mm x 297mm
      // This completely prevents bottom signatures or footers from being cut off!
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const scale = Math.min(pageWidthMm / canvas.width, pageHeightMm / canvas.height);
      const renderW = canvas.width * scale;
      const renderH = canvas.height * scale;
      const xOffset = (pageWidthMm - renderW) / 2;
      const yOffset = (pageHeightMm - renderH) / 2;

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderW, renderH, undefined, 'FAST');
    } else {
      // Multi-page document (long tables / detailed reports):
      // Slice cleanly by A4 page height chunks so nothing is truncated or overlapping
      const pageCanvasHeight = Math.floor(canvas.width * a4Aspect);
      let y = 0;
      let pageIndex = 0;

      while (y < canvas.height) {
        if (pageIndex > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const chunkHeight = Math.min(pageCanvasHeight, canvas.height - y);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = pageCanvasHeight;
        const sliceCtx = sliceCanvas.getContext('2d');
        if (sliceCtx) {
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(
            canvas,
            0, y, canvas.width, chunkHeight,
            0, 0, canvas.width, chunkHeight
          );
        }

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(sliceData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');

        y += chunkHeight;
        pageIndex++;
      }
    }

    options.onProgress?.('Mengunduh PDF...');
    pdf.save(cleanFilename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  } finally {
    // Restore original scroll
    if (parentScrollable) {
      parentScrollable.scrollTop = originalScrollTop;
    }
  }
}

/**
 * Triggers the browser's native print menu dialog directly
 */
export function triggerBrowserPrint(): void {
  try {
    window.print();
  } catch (err) {
    console.warn('Native window.print failed:', err);
  }
}
