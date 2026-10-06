import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Transaction, Store, ExpenseType } from '../../types';
import { NavTab } from '../layout/Sidebar';
import { formatRupiah, getIndonesianDate } from '../../utils/numbering';
import {
  ShoppingCart,
  Store as StoreIcon,
  Tag,
  FileCheck,
  ArrowRight,
  PlusCircle,
  Database,
  FileSpreadsheet,
  Settings,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  stores: Store[];
  expenseTypes: ExpenseType[];
  onNavigate: (tab: NavTab) => void;
  onViewTransaction: (trx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  stores,
  expenseTypes,
  onNavigate,
  onViewTransaction,
}) => {
  const { profile } = useSchool();

  const totalNilaiBelanja = transactions.reduce((acc, t) => acc + (t.totalTransaksi || 0), 0);
  const totalTransaksiCount = transactions.length;
  const totalTokoCount = stores.length;
  const totalJenisBelanjaCount = expenseTypes.filter(e => e.statusAktif).length;
  // Each transaction has 4 documents (SP, BAST, BAHPB, BAPB)
  const totalDokumenCount = totalTransaksiCount * 4;

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Identity Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
            <img
              src={profile.logoUrl || '/src/assets/images/logo_sdn_kaliboto_kidul_05_1791253078034.jpg'}
              alt="Logo Sekolah"
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
              Selamat Datang di Portal Administrasi
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {profile.namaSekolah}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span>{profile.kecamatan}, {profile.kabupatenKota}</span>
              <span aria-hidden="true">·</span>
              <span>Kepala Sekolah: {profile.namaKepalaSekolah}</span>
              <span aria-hidden="true">·</span>
              <span>Pengurus Barang: {profile.namaPengurusBarang}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="shrink-0 flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => onNavigate('input-belanja')}
            className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Transaksi Baru</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Nilai Belanja */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Akumulasi Belanja</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-slate-900 font-mono tabular-nums truncate">
            {formatRupiah(totalNilaiBelanja)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {totalTransaksiCount} transaksi tercatat
          </div>
        </div>

        {/* Jumlah Transaksi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jumlah Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalTransaksiCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Status pengadaan valid
          </div>
        </div>

        {/* Data Rekanan Toko */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Toko / CV Rekanan</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <StoreIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalTokoCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Penyedia barang resmi
          </div>
        </div>

        {/* Dokumen Sah Diterbitkan */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Dokumen Berita Acara</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalDokumenCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            SP, BAST, BAHPB, BAPB
          </div>
        </div>

        {/* Jenis Belanja */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jenis Belanja Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalJenisBelanjaCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Mata anggaran belanja
          </div>
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
          Jalan Pintas Administrasi
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('input-belanja')}
            className="p-3 text-left border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-900">Input Belanja</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Catat nota & barang</div>
          </button>

          <button
            onClick={() => onNavigate('database-transaksi')}
            className="p-3 text-left border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/40 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-900">Database Belanja</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cari & cetak dokumen</div>
          </button>

          <button
            onClick={() => onNavigate('stores')}
            className="p-3 text-left border border-slate-200 rounded-lg hover:border-purple-400 hover:bg-purple-50/40 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <StoreIcon className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-900">Data Toko / CV</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Kelola data penyedia</div>
          </button>

          <button
            onClick={() => onNavigate('laporan')}
            className="p-3 text-left border border-slate-200 rounded-lg hover:border-amber-400 hover:bg-amber-50/40 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-900">Laporan Rekap</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Rekapitulasi berkas</div>
          </button>

          <button
            onClick={() => onNavigate('school-letterhead')}
            className="p-3 text-left border border-slate-200 rounded-lg hover:border-teal-400 hover:bg-teal-50/40 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-900">Kop Surat A4</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Konfigurasi cetak</div>
          </button>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Transaksi Belanja Terbaru</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar transaksi terakhir yang tersimpan di database sekolah
            </p>
          </div>
          <button
            onClick={() => onNavigate('database-transaksi')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Buka Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Database className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Belum ada data transaksi</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol Input Transaksi Baru untuk mulai mencatat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">No. Transaksi</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Toko / Rekanan</th>
                  <th className="py-3 px-4">Jenis Belanja</th>
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {trx.id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {getIndonesianDate(trx.tanggalTransaksi)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{trx.storeNama}</div>
                      <div className="text-[11px] text-slate-500">{trx.storePemilik}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {trx.expenseTypeName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatRupiah(trx.totalTransaksi)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onViewTransaction(trx)}
                        className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                      >
                        Detail & Dokumen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
