import React, { useState, useMemo } from 'react';
import { Transaction, Store, ExpenseType } from '../../types';
import { api } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatRupiah, getIndonesianDate } from '../../utils/numbering';
import { getTaxLabel } from '../../utils/taxCalculator';
import {
  Database,
  Search,
  Filter,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Printer,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  X,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';

interface DatabaseTransaksiViewProps {
  transactions: Transaction[];
  stores: Store[];
  expenseTypes: ExpenseType[];
  onRefresh: () => void;
  onEdit: (trx: Transaction) => void;
  onOpenDocuments: (trx: Transaction) => void;
}

export const DatabaseTransaksiView: React.FC<DatabaseTransaksiViewProps> = ({
  transactions,
  stores,
  expenseTypes,
  onRefresh,
  onEdit,
  onOpenDocuments,
}) => {
  const { showToast } = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStoreId, setFilterStoreId] = useState('all');
  const [filterExpenseTypeId, setFilterExpenseTypeId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [detailTrx, setDetailTrx] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Filtered
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        t.id.toLowerCase().includes(q) ||
        t.storeNama.toLowerCase().includes(q) ||
        t.expenseTypeName.toLowerCase().includes(q) ||
        (t.nomorSP && t.nomorSP.toLowerCase().includes(q)) ||
        (t.nomorBAST && t.nomorBAST.toLowerCase().includes(q)) ||
        t.items.some(i => i.uraian.toLowerCase().includes(q));

      const matchStore = filterStoreId === 'all' || t.storeId === filterStoreId;
      const matchExpense = filterExpenseTypeId === 'all' || t.expenseTypeId === filterExpenseTypeId;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;

      let matchDate = true;
      if (startDate) {
        matchDate = matchDate && t.tanggalTransaksi >= startDate;
      }
      if (endDate) {
        matchDate = matchDate && t.tanggalTransaksi <= endDate;
      }

      return matchSearch && matchStore && matchExpense && matchStatus && matchDate;
    });
  }, [transactions, searchQuery, filterStoreId, filterExpenseTypeId, filterStatus, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTransaction(deleteTarget.id);
      showToast(`Transaksi ${deleteTarget.id} berhasil dihapus`, 'success');
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus transaksi', 'error');
    }
  };

  const handleDuplicate = async (trx: Transaction) => {
    setIsDuplicating(true);
    try {
      const duplicated = await api.duplicateTransaction(trx.id);
      showToast(`Transaksi berhasil diduplikasi menjadi ${duplicated.id}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Gagal menduplikasi transaksi', 'error');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStoreId('all');
    setFilterExpenseTypeId('all');
    setFilterStatus('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Database Transaksi Belanja Sekolah</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Arsip seluruh transaksi belanja, nomor surat resmi, rincian barang, dan generator dokumen.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total Terdata: <span className="font-bold text-slate-900">{transactions.length}</span> Transaksi
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pencarian & Filter Transaksi</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cari Transaksi / Toko / Barang
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ID, nama toko, barang, nomor SP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Store Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Filter Toko / CV
            </label>
            <select
              value={filterStoreId}
              onChange={(e) => {
                setFilterStoreId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="all">Semua Rekanan</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.namaToko}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Jenis Belanja
            </label>
            <select
              value={filterExpenseTypeId}
              onChange={(e) => {
                setFilterExpenseTypeId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="all">Semua Jenis Belanja</option>
              {expenseTypes.map(e => (
                <option key={e.id} value={e.id}>
                  {e.namaJenisBelanja}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status Berkas
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="all">Semua Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Draf">Draf</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Database className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci atau rentang tanggal</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-32 font-mono">ID Transaksi</th>
                  <th className="py-3 px-4 w-28">Tanggal</th>
                  <th className="py-3 px-4">Toko / Rekanan</th>
                  <th className="py-3 px-4">Jenis Belanja</th>
                  <th className="py-3 px-4">Nomor SP / BAST</th>
                  <th className="py-3 px-4 text-right">Total Belanja</th>
                  <th className="py-3 px-4 text-center w-24">Status</th>
                  <th className="py-3 px-4 text-center w-40">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map(trx => (
                  <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {trx.id}
                      <span className="block text-[10px] text-slate-400">Urut #{trx.nomorUrut}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {getIndonesianDate(trx.tanggalTransaksi)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{trx.storeNama}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{trx.storePemilik}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {trx.expenseTypeName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <div className="truncate max-w-[180px]">{trx.nomorSP || '-'}</div>
                      <div className="text-slate-400 truncate max-w-[180px]">{trx.nomorBAST || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatRupiah(trx.totalTransaksi)}
                      <span className="block text-[10px] font-normal text-slate-500">{trx.items.length} item</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${trx.status === 'Selesai' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {trx.status === 'Selesai' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => setDetailTrx(trx)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Open Document Generator */}
                        <button
                          onClick={() => onOpenDocuments(trx)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          title="Cetak Berita Acara & SP"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEdit(trx)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Transaksi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate */}
                        <button
                          disabled={isDuplicating}
                          onClick={() => handleDuplicate(trx)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                          title="Duplikasi Transaksi Ini"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(trx)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Halaman {currentPage} dari {totalPages} ({filteredTransactions.length} transaksi)
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {detailTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Detail Transaksi {detailTrx.id}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    ({getIndonesianDate(detailTrx.tanggalTransaksi)})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekanan: <strong>{detailTrx.storeNama}</strong> ({detailTrx.storePemilik})
                </p>
              </div>
              <button
                onClick={() => setDetailTrx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Doc Numbers Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Surat Pesanan (SP)</span>
                  <span className="font-semibold text-slate-900">{detailTrx.nomorSP || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">BAST</span>
                  <span className="font-semibold text-slate-900">{detailTrx.nomorBAST || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">BAHPB</span>
                  <span className="font-semibold text-slate-900">{detailTrx.nomorBAHPB || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">BAPB</span>
                  <span className="font-semibold text-slate-900">{detailTrx.nomorBAPB || '-'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Daftar Barang Belanja
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">No</th>
                        <th className="py-2.5 px-3">Uraian Barang / Jasa</th>
                        <th className="py-2.5 px-2 w-14 text-center bg-slate-100">Vol</th>
                        <th className="py-2.5 px-3 w-20">Satuan</th>
                        <th className="py-2.5 px-3 w-28 text-left">Harga Final</th>
                        <th className="py-2.5 px-3 w-28 text-left">Total Belanja</th>
                        <th className="py-2.5 px-3 w-28 text-left">DPP</th>
                        <th className="py-2.5 px-3 w-36 text-left">Pajak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {detailTrx.items.map((it, idx) => {
                        const hasPPN = (it.ppn || 0) > 0;
                        const hasPPh23 = (it.pph23 || 0) > 0;
                        let pphRateLabel = 'PPh 23 4%';
                        if (it.pajak === 'PPH23_3' || it.pajak === 'PPH23_3_PPN') {
                          pphRateLabel = 'PPh 23 3%';
                        }

                        return (
                          <tr key={it.id || idx} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">{it.uraian}</td>
                            <td className="py-2.5 px-2 text-center bg-slate-100/60 font-mono text-slate-800">{it.volume}</td>
                            <td className="py-2.5 px-3 text-slate-600">{it.satuan}</td>
                            <td className="py-2.5 px-3 text-left font-mono text-slate-800">{formatRupiah(it.harga)}</td>
                            <td className="py-2.5 px-3 text-left font-mono font-semibold text-slate-900">{formatRupiah(it.jumlah)}</td>
                            <td className="py-2.5 px-3 text-left font-mono text-slate-700">{formatRupiah(it.dpp)}</td>
                            <td className="py-2.5 px-3 text-left text-[11px] align-top">
                              {hasPPN || hasPPh23 ? (
                                <div className="space-y-1 leading-tight font-mono">
                                  {hasPPN && (
                                    <div>
                                      <div className="font-semibold text-slate-700 font-sans">PPn 11% :</div>
                                      <div className="text-slate-900">{formatRupiah(it.ppn!)}</div>
                                    </div>
                                  )}
                                  {hasPPh23 && (
                                    <div>
                                      <div className="font-semibold text-slate-700 font-sans">{pphRateLabel} :</div>
                                      <div className="text-slate-900">{formatRupiah(it.pph23!)}</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Tax Decomposition */}
              <div className="p-4 bg-slate-900 text-white rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-indigo-300 block uppercase font-semibold">Total Nilai Transaksi</span>
                  <span className="text-xl font-bold font-mono tracking-tight">{formatRupiah(detailTrx.totalTransaksi)}</span>
                  <div className="text-[11px] text-slate-300 mt-1 italic">
                    {detailTrx.catatan || 'Tidak ada catatan tambahan'}
                  </div>
                </div>
                <div className="space-y-1 text-slate-300 font-mono text-right sm:text-left sm:pl-6 sm:border-l sm:border-slate-800">
                  <div className="text-[11px] flex justify-between">
                    <span className="text-slate-400">Dasar Pengenaan Pajak (DPP):</span>
                    <span>{formatRupiah(detailTrx.totalDPP)}</span>
                  </div>
                  <div className="text-[11px] flex justify-between font-semibold text-emerald-400 pt-1 border-t border-slate-800">
                    <span className="text-slate-300">Pajak (PPN & PPh 23):</span>
                    <span>{formatRupiah(detailTrx.totalPajak)}</span>
                  </div>
                  {((detailTrx.totalPPN || 0) > 0 || (detailTrx.totalPPh23 || 0) > 0) && (
                    <div className="text-[10px] flex justify-between text-slate-400 pl-2">
                      <span>Rincian:</span>
                      <span>
                        {(detailTrx.totalPPN || 0) > 0 && `PPN: ${formatRupiah(detailTrx.totalPPN || 0)}`}
                        {(detailTrx.totalPPN || 0) > 0 && (detailTrx.totalPPh23 || 0) > 0 && ' · '}
                        {(detailTrx.totalPPh23 || 0) > 0 && `PPh 23: ${formatRupiah(detailTrx.totalPPh23 || 0)}`}
                      </span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 pt-1">
                    User Pembuat: {detailTrx.userPembuat}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
              <button
                onClick={() => {
                  const target = detailTrx;
                  setDetailTrx(null);
                  onOpenDocuments(target);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Buka Cetak Dokumen (SP, BAST, BAHPB, BAPB)</span>
              </button>

              <button
                onClick={() => setDetailTrx(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Transaksi Belanja?"
        message={`Apakah Anda yakin ingin menghapus transaksi "${deleteTarget?.id}" senilai ${deleteTarget ? formatRupiah(deleteTarget.totalTransaksi) : ''}? Dokumen terkait tidak dapat dipulihkan.`}
        confirmLabel="Hapus Transaksi"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
