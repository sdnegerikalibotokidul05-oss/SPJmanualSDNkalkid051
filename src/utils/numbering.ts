/**
 * Utilities for formatting Indonesian currency, Roman month numerals,
 * Terbilang (spelling out currency), and document numbering.
 */

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function toRomanMonth(monthNumber: number): string {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const idx = Math.max(1, Math.min(12, monthNumber)) - 1;
  return romanMonths[idx];
}

export function getIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function terbilang(n: number): string {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  const num = Math.floor(Math.abs(n));

  if (num < 12) {
    return bilangan[num];
  } else if (num < 20) {
    return `${terbilang(num - 10)} Belas`;
  } else if (num < 100) {
    const sisa = num % 10;
    return `${terbilang(Math.floor(num / 10))} Puluh ${sisa > 0 ? terbilang(sisa) : ''}`.trim();
  } else if (num < 200) {
    const sisa = num - 100;
    return `Seratus ${sisa > 0 ? terbilang(sisa) : ''}`.trim();
  } else if (num < 1000) {
    const sisa = num % 100;
    return `${terbilang(Math.floor(num / 100))} Ratus ${sisa > 0 ? terbilang(sisa) : ''}`.trim();
  } else if (num < 2000) {
    const sisa = num - 1000;
    return `Seribu ${sisa > 0 ? terbilang(sisa) : ''}`.trim();
  } else if (num < 1000000) {
    const sisa = num % 1000;
    return `${terbilang(Math.floor(num / 1000))} Ribu ${sisa > 0 ? terbilang(sisa) : ''}`.trim();
  } else if (num < 1000000000) {
    const sisa = num % 1000000;
    return `${terbilang(Math.floor(num / 1000000))} Juta ${sisa > 0 ? terbilang(sisa) : ''}`.trim();
  } else if (num < 1000000000000) {
    const sisa = num % 1000000000;
    return `${terbilang(Math.floor(num / 1000000000))} Miliar ${sisa > 0 ? terbilang(sisa) : ''}`.trim();
  }
  return String(num);
}

export function terbilangRupiah(amount: number): string {
  if (amount === 0) return 'Nol Rupiah';
  const hasil = terbilang(amount);
  return `${hasil} Rupiah`;
}

/**
 * Format document numbers based on template
 * Tokens:
 * {nomor} -> e.g. "001" or "1"
 * {kode_dok} -> "SP", "BAST", "BAHPB", "BAPB"
 * {kode_sekolah} -> e.g. "SDN-KK05"
 * {romawi} -> e.g. "X"
 * {tahun} -> e.g. "2026"
 */
export function generateDocumentNumber(
  format: string,
  seq: number,
  kodeDok: string,
  kodeSekolah: string,
  dateStr?: string
): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const monthNum = d.getMonth() + 1;
  const year = d.getFullYear();
  const roman = toRomanMonth(monthNum);
  const padSeq = String(seq).padStart(3, '0');

  return format
    .replace('{nomor}', padSeq)
    .replace('{kode_dok}', kodeDok)
    .replace('{kode_sekolah}', kodeSekolah)
    .replace('{romawi}', roman)
    .replace('{tahun}', String(year));
}
