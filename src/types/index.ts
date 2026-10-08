export type UserRole = 'admin' | 'operator' | 'bendahara';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  expiresAt: string;
}

export interface SchoolProfile {
  id: string;
  namaSekolah: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  alamatSekolah: string;
  desaKelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodePos: string;
  nomorTelepon: string;
  emailSekolah: string;
  namaPengurusBarang: string;
  nipPengurusBarang: string;
  logoUrl: string;
  updatedAt: string;
}

export interface SchoolLetterhead {
  id: string;
  pemerintahDaerah: string; // Baris 1: 18pt bold
  dinasTerkait: string;      // Baris 2: 18pt bold
  namaUnitSekolah: string;  // Baris 3: 24pt bold
  alamatBaris: string;
  kontakBaris: string;
  logoWidthCm: number;      // default 2 cm
  logoHeightCm: number;     // default 3 cm
  garisGaya: 'ganda' | 'tunggal' | 'tebal';
  fontFamily: string;       // default "Arial"
  updatedAt: string;
}

export interface Store {
  id: string;
  nomorUrut: number;
  namaPemilik: string;
  namaToko: string;
  alamatToko: string;
  nomorTelepon: string;
  keterangan: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseType {
  id: string;
  namaJenisBelanja: string;
  keterangan: string;
  statusAktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemMaster {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  kategori: string;
  hargaDefault: number;
  statusAktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaxType =
  | 'NON'           // Tanpa Pajak
  | 'PPN_11'        // PPN 11%
  | 'PPH23_4'       // PPh 23 4%
  | 'PPH23_3'       // PPh 23 3%
  | 'PPH23_3_PPN'   // PPh 23 3% + PPN
  | 'PPH23_4_PPN'   // PPh 23 4% + PPN
  | 'PPH23_PPN'     // PPh 23 + PPN (default 4%)
  | 'PAJAK_LAIN';   // Pajak Lainnya (kompatibilitas)

export interface TransactionItem {
  id: string;
  no: number;
  uraian: string;
  satuan: string;
  volume: number;
  harga: number; // Harga Final per barang (termasuk pajak jika kena pajak)
  pajak: TaxType;
  jumlah: number; // Volume * Harga (TIDAK bertambah pajak di atas total)
  dpp: number; // Komponen Dasar Pengenaan Pajak
  ppn: number; // Komponen PPN (jika ada)
  pph23: number; // Komponen PPh 23 (jika ada)
  nilaiPajak: number; // Total Komponen Pajak (PPN + PPh 23)
}

export type TransactionStatus = 'Selesai' | 'Draf' | 'Dibatalkan';

export interface Transaction {
  id: string; // unique ID, e.g. TRX-202610-0001
  nomorUrut: number;
  tanggalTransaksi: string;
  storeId: string;
  storeNama: string;
  storePemilik: string;
  storeAlamat: string;
  storeTelepon: string;
  expenseTypeId: string;
  expenseTypeName: string;
  nomorSP: string;
  tanggalSP: string;
  nomorBAST: string;
  tanggalBAST: string;
  nomorBAHPB: string;
  tanggalBAHPB: string;
  nomorBAPB: string;
  tanggalBAPB: string;
  items: TransactionItem[];
  totalTransaksi: number;
  totalDPP: number;
  totalPPN: number;
  totalPPh23: number;
  totalPajak: number;
  statusPajakSummary: string;
  userPembuat: string;
  timestamp: string;
  status: TransactionStatus;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSequenceConfig {
  id: string;
  tahun: number;
  kodeSekolah: string;
  formatSP: string;
  formatBAST: string;
  formatBAHPB: string;
  formatBAPB: string;
  nextSeqSP: number;
  nextSeqBAST: number;
  nextSeqBAHPB: number;
  nextSeqBAPB: number;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  user: string;
  aktivitas: string;
  waktu: string;
  idData: string;
  keterangan: string;
}

export interface DatabaseSchema {
  version: number;
  users: User[];
  school_profile: SchoolProfile;
  school_letterhead: SchoolLetterhead;
  stores: Store[];
  expense_types: ExpenseType[];
  items: ItemMaster[];
  transactions: Transaction[];
  document_sequences: DocumentSequenceConfig;
  audit_logs: AuditLog[];
  deleted_ids?: string[];
}
