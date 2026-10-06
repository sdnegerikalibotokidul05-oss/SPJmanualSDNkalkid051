import { TaxType, TransactionItem } from '../types/index.ts';

/**
 * Section 9 Tax Calculator & Ketentuan Perpajakan Republik Indonesia
 * 
 * Ketentuan Dasar Sesuai Regulasi Perpajakan Pemerintah Indonesia:
 * 1. Tanpa Pajak (NON):
 *    - Objek bukan kena pajak / barang bebas pajak
 *    - DPP = Jumlah Belanja, PPN = 0, PPh 23 = 0
 * 
 * 2. PPN 11% (UU HPP No. 7 Tahun 2021):
 *    - Harga barang yang dimasukkan adalah harga final (inklusif PPN 11%)
 *    - DPP = Math.round(Jumlah / 1.11)
 *    - PPN = Jumlah - DPP (setara 11% x DPP)
 *    - PPh 23 = 0
 * 
 * 3. PPh 23 4% (UU PPh Pasal 23 ayat 1a):
 *    - Pemotongan jasa/sewa bagi Wajib Pajak / rekanan yang TIDAK MEMILIKI NPWP (tarif 100% lebih tinggi dari tarif normal 2% = 4%)
 *    - Transaksi murni jasa tanpa PPN
 *    - DPP = Jumlah Belanja
 *    - PPh 23 = Math.round(DPP * 0.04)
 *    - PPN = 0
 * 
 * 4. PPh 23 3% (Tarif PPh 23 Khusus):
 *    - Pemotongan jasa/sewa dengan tarif efektif 3%
 *    - Transaksi murni jasa tanpa PPN
 *    - DPP = Jumlah Belanja
 *    - PPh 23 = Math.round(DPP * 0.03)
 *    - PPN = 0
 * 
 * 5. PPh 23 (3%) + PPN (11%):
 *    - Jasa kena pajak PPN 11% dengan pemotongan PPh 23 tarif 3%
 *    - Sesuai ketentuan perpajakan RI, dasar pemotongan PPh 23 adalah nilai DPP sebelum PPN:
 *    - DPP = Math.round(Jumlah / 1.11)
 *    - PPN = Jumlah - DPP
 *    - PPh 23 = Math.round(DPP * 0.03)
 * 
 * 6. PPh 23 (4%) + PPN (11%):
 *    - Jasa kena pajak PPN 11% dengan pemotongan PPh 23 tarif 4% (rekanan non-NPWP)
 *    - DPP = Math.round(Jumlah / 1.11)
 *    - PPN = Jumlah - DPP
 *    - PPh 23 = Math.round(DPP * 0.04)
 * 
 * ATURAN MUTLAK SISTEM (Section 9):
 * Harga barang yang dimasukkan pengguna adalah HARGA FINAL PER BARANG yang sudah termasuk pajak.
 * Total belanja = Volume x Harga Final.
 * Pajak TIDAK MENAMBAHKAN total nilai transaksi belanja.
 */

export interface TaxOptionDefinition {
  id: TaxType;
  label: string;
  shortLabel: string;
  category: 'Tanpa Pajak' | 'PPN' | 'PPh 23' | 'PPh 23 + PPN';
  ratePpn: number;
  ratePph23: number;
  description: string;
  regulationReference: string;
}

export const TAX_OPTIONS: TaxOptionDefinition[] = [
  {
    id: 'NON',
    label: 'Tanpa Pajak',
    shortLabel: 'Tanpa Pajak',
    category: 'Tanpa Pajak',
    ratePpn: 0,
    ratePph23: 0,
    description: 'Bebas pajak / bukan objek pajak',
    regulationReference: 'Bebas PPN & PPh 23',
  },
  {
    id: 'PPN_11',
    label: 'PPN 11%',
    shortLabel: 'PPN 11%',
    category: 'PPN',
    ratePpn: 11,
    ratePph23: 0,
    description: 'Pajak Pertambahan Nilai 11% (UU HPP)',
    regulationReference: 'UU No. 7 Tahun 2021 (UU HPP)',
  },
  {
    id: 'PPH23_4',
    label: 'PPh 23 4%',
    shortLabel: 'PPh 23 4%',
    category: 'PPh 23',
    ratePpn: 0,
    ratePph23: 4,
    description: 'PPh 23 tarif 4% (Jasa/Sewa rekanan tanpa NPWP)',
    regulationReference: 'UU PPh Pasal 23 (Non-NPWP +100%)',
  },
  {
    id: 'PPH23_3',
    label: 'PPh 23 3%',
    shortLabel: 'PPh 23 3%',
    category: 'PPh 23',
    ratePpn: 0,
    ratePph23: 3,
    description: 'PPh 23 tarif 3% (Jasa khusus / ketentuan tarif 3%)',
    regulationReference: 'UU PPh Pasal 23 Tarif 3%',
  },
  {
    id: 'PPH23_3_PPN',
    label: 'PPh 23 (3%) + PPN (11%)',
    shortLabel: 'PPh 23 3% + PPN',
    category: 'PPh 23 + PPN',
    ratePpn: 11,
    ratePph23: 3,
    description: 'Kombinasi PPN 11% + PPh 23 (3% dari DPP)',
    regulationReference: 'PPN UU HPP + PPh 23 (3% DPP)',
  },
  {
    id: 'PPH23_4_PPN',
    label: 'PPh 23 (4%) + PPN (11%)',
    shortLabel: 'PPh 23 4% + PPN',
    category: 'PPh 23 + PPN',
    ratePpn: 11,
    ratePph23: 4,
    description: 'Kombinasi PPN 11% + PPh 23 (4% non-NPWP dari DPP)',
    regulationReference: 'PPN UU HPP + PPh 23 Non-NPWP (4% DPP)',
  },
];

export function getTaxLabel(type: TaxType): string {
  switch (type) {
    case 'NON':
      return 'Tanpa Pajak';
    case 'PPN_11':
      return 'PPN 11%';
    case 'PPH23_4':
      return 'PPh 23 4%';
    case 'PPH23_3':
      return 'PPh 23 3%';
    case 'PPH23_3_PPN':
      return 'PPh 23 3% + PPN 11%';
    case 'PPH23_4_PPN':
    case 'PPH23_PPN':
      return 'PPh 23 4% + PPN 11%';
    case 'PAJAK_LAIN':
      return 'Pajak Lainnya';
    default:
      return 'Tanpa Pajak';
  }
}

export function getTaxShortBadge(type: TaxType): string {
  switch (type) {
    case 'NON':
      return 'Tanpa Pajak';
    case 'PPN_11':
      return 'PPN 11%';
    case 'PPH23_4':
      return 'PPh 23 (4%)';
    case 'PPH23_3':
      return 'PPh 23 (3%)';
    case 'PPH23_3_PPN':
      return 'PPh 23 (3%) + PPN';
    case 'PPH23_4_PPN':
    case 'PPH23_PPN':
      return 'PPh 23 (4%) + PPN';
    default:
      return 'Tanpa Pajak';
  }
}

export function calculateItemAmounts(
  volume: number,
  harga: number,
  pajak: TaxType
): { jumlah: number; dpp: number; ppn: number; pph23: number; nilaiPajak: number } {
  const vol = Number(volume) || 0;
  const prc = Number(harga) || 0;
  const jumlah = Math.round(vol * prc);

  let dpp = jumlah;
  let ppn = 0;
  let pph23 = 0;

  if (pajak === 'PPN_11') {
    // Sesuai UU HPP No. 7/2021 tarif PPN 11%
    // DPP = Harga / 1.11
    // PPN = Jumlah - DPP (11% x DPP)
    dpp = Math.round(jumlah / 1.11);
    ppn = jumlah - dpp;
    pph23 = 0;
  } else if (pajak === 'PPH23_4') {
    // PPh 23 tarif 4% (non-NPWP / 100% lebih tinggi dari 2%)
    dpp = jumlah;
    ppn = 0;
    pph23 = Math.round(dpp * 0.04);
  } else if (pajak === 'PPH23_3') {
    // PPh 23 tarif 3%
    dpp = jumlah;
    ppn = 0;
    pph23 = Math.round(dpp * 0.03);
  } else if (pajak === 'PPH23_3_PPN') {
    // Kombinasi PPN 11% dan PPh 23 3% dari DPP
    dpp = Math.round(jumlah / 1.11);
    ppn = jumlah - dpp;
    pph23 = Math.round(dpp * 0.03);
  } else if (pajak === 'PPH23_4_PPN' || pajak === 'PPH23_PPN') {
    // Kombinasi PPN 11% dan PPh 23 4% (non-NPWP) dari DPP
    dpp = Math.round(jumlah / 1.11);
    ppn = jumlah - dpp;
    pph23 = Math.round(dpp * 0.04);
  } else if (pajak === 'PAJAK_LAIN') {
    dpp = Math.round(jumlah / 1.02);
    ppn = 0;
    pph23 = jumlah - dpp;
  } else {
    // Tanpa Pajak (NON)
    dpp = jumlah;
    ppn = 0;
    pph23 = 0;
  }

  const nilaiPajak = ppn + pph23;

  return {
    jumlah,
    dpp,
    ppn,
    pph23,
    nilaiPajak,
  };
}

export function calculateTransactionSummary(items: TransactionItem[]): {
  totalTransaksi: number;
  totalDPP: number;
  totalPPN: number;
  totalPPh23: number;
  totalPajak: number;
  statusPajakSummary: string;
} {
  let totalTransaksi = 0;
  let totalDPP = 0;
  let totalPPN = 0;
  let totalPPh23 = 0;
  let totalPajak = 0;

  const usedTaxes = new Set<TaxType>();

  for (const item of items) {
    totalTransaksi += item.jumlah;
    totalDPP += item.dpp;
    totalPPN += (item.ppn || 0);
    totalPPh23 += (item.pph23 || 0);
    totalPajak += item.nilaiPajak;
    usedTaxes.add(item.pajak);
  }

  let statusPajakSummary = 'Tanpa Pajak';
  if (usedTaxes.size === 1) {
    const singleType = Array.from(usedTaxes)[0];
    statusPajakSummary = getTaxLabel(singleType);
  } else if (usedTaxes.size > 1) {
    const labels = Array.from(usedTaxes).map(t => getTaxLabel(t));
    statusPajakSummary = `Kombinasi (${labels.join(', ')})`;
  }

  return {
    totalTransaksi,
    totalDPP,
    totalPPN,
    totalPPh23,
    totalPajak,
    statusPajakSummary,
  };
}
