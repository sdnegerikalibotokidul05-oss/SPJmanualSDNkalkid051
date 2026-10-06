import React, { useState, useMemo } from 'react';
import { Transaction, Store, ExpenseType } from '../../types';
import { useSchool } from '../../context/SchoolContext';
import { OfficialLetterhead } from '../documents/OfficialLetterhead';
import { formatRupiah, getIndonesianDate } from '../../utils/numbering';
import { generateAndDownloadPdf, printOrSaveDocument } from '../../utils/printPdfHelper';
import { useToast } from '../common/Toast';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Building,
  Tag,
  Store as StoreIcon,
  Download,
  Loader2,
} from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  stores: Store[];
  expenseTypes: ExpenseType[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  stores,
  expenseTypes,
}) => {
  const { profile, letterhead } = useSchool();

  // Filters
  const [filterStoreId, setFilterStoreId] = useState('all');
  const [filterExpenseTypeId, setFilterExpenseTypeId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<'rekap-belanja' | 'rekap-toko' | 'register-dokumen'>('rekap-belanja');

  // Filtered transactions
  const filteredTrx = useMemo(() => {
    return transactions.filter(t => {
      const matchStore = filterStoreId === 'all' || t.storeId === filterStoreId;
      const matchExp = filterExpenseTypeId === 'all' || t.expenseTypeId === filterExpenseTypeId;
      let matchDate = true;
      if (startDate) matchDate = matchDate && t.tanggalTransaksi >= startDate;
      if (endDate) matchDate = matchDate && t.tanggalTransaksi <= endDate;
      return matchStore && matchExp && matchDate;
    });
  }, [transactions, filterStoreId, filterExpenseTypeId, startDate, endDate]);

  // Aggregate Metrics
  const totalBelanja = filteredTrx.reduce((acc, t) => acc + t.totalTransaksi, 0);
  const totalDPP = filteredTrx.reduce((acc, t) => acc + t.totalDPP, 0);
  const totalPPN = filteredTrx.reduce((acc, t) => acc + (t.totalPPN || t.items.reduce((s, it) => s + (it.ppn || 0), 0)), 0);
  const totalPPh23 = filteredTrx.reduce((acc, t) => acc + (t.totalPPh23 || t.items.reduce((s, it) => s + (it.pph23 || 0), 0)), 0);
  const totalPajak = filteredTrx.reduce((acc, t) => acc + t.totalPajak, 0);

  // Group by Store
  const storeSummary = useMemo(() => {
    const map: Record<string, { store: Store | undefined; total: number; count: number; dpp: number; ppn: number; pph23: number; pajak: number }> = {};
    filteredTrx.forEach(t => {
      if (!map[t.storeId]) {
        map[t.storeId] = {
          store: stores.find(s => s.id === t.storeId),
          total: 0,
          count: 0,
          dpp: 0,
          ppn: 0,
          pph23: 0,
          pajak: 0,
        };
      }
      map[t.storeId].total += t.totalTransaksi;
      map[t.storeId].count += 1;
      map[t.storeId].dpp += t.totalDPP;
      map[t.storeId].ppn += (t.totalPPN || t.items.reduce((s, it) => s + (it.ppn || 0), 0));
      map[t.storeId].pph23 += (t.totalPPh23 || t.items.reduce((s, it) => s + (it.pph23 || 0), 0));
      map[t.storeId].pajak += t.totalPajak;
    });
    return Object.values(map);
  }, [filteredTrx, stores]);

  const { showToast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  const getReportFilename = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    switch (reportType) {
      case 'rekap-belanja':
        return `Rekapitulasi_Belanja_${dateStr}.pdf`;
      case 'rekap-toko':
        return `Rekapitulasi_Rekanan_${dateStr}.pdf`;
      case 'register-dokumen':
        return `Register_Nomor_Dokumen_${dateStr}.pdf`;
      default:
        return `Laporan_Sekolah_${dateStr}.pdf`;
    }
  };

  const handleDownloadReportPdf = async () => {
    const element = document.getElementById('printable-report-page');
    if (!element) {
      showToast('Halaman laporan tidak ditemukan.', 'error');
      return;
    }
    setIsExportingPdf(true);
    setPdfProgress('Menyiapkan file PDF...');
    try {
      const filename = getReportFilename();
      const ok = await generateAndDownloadPdf(element, {
        filename,
        documentTitle: 'Laporan Administrasi Sekolah',
        onProgress: (p) => setPdfProgress(p),
      });
      if (ok) {
        showToast('Laporan berhasil diunduh sebagai PDF!', 'success');
      } else {
        showToast('Gagal membuat file PDF. Silakan coba kembali.', 'error');
      }
    } catch (err) {
      console.error('Download report error:', err);
      showToast('Terjadi kendala saat membuat PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  const handlePrintReport = async () => {
    const element = document.getElementById('printable-report-page');
    if (!element) return;
    setIsExportingPdf(true);
    setPdfProgress('Membuka cetak...');
    try {
      const res = await printOrSaveDocument(element, {
        filename: getReportFilename(),
        documentTitle: 'Laporan Administrasi Sekolah',
        onProgress: (p) => setPdfProgress(p),
      });
      if (res.method === 'pdf') {
        showToast('Pencetakan dialihkan ke unduh PDF karena batasan browser.', 'info');
      }
    } catch (err) {
      console.warn('Print report error:', err);
      await handleDownloadReportPdf();
    } finally {
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Laporan Administrasi & Rekapitulasi Belanja</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Buku kas pengadaan, rekap per rekanan, dan register penomoran dokumen resmi sekolah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct PDF Download (.pdf) */}
          <button
            onClick={handleDownloadReportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="Unduh langsung laporan resmi dalam format PDF (.pdf)"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{pdfProgress || 'Memproses...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Simpan PDF (.pdf)</span>
              </>
            )}
          </button>

          {/* Print to printer */}
          <button
            onClick={handlePrintReport}
            disabled={isExportingPdf}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="Cetak langsung laporan ke printer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Filter Controls (Screen Only) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Parameter Laporan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Jenis Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
            >
              <option value="rekap-belanja">Rekapitulasi Belanja & Pajak</option>
              <option value="rekap-toko">Rekapitulasi Per Toko / Rekanan</option>
              <option value="register-dokumen">Register Nomor Dokumen (SP, BAST)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Filter Rekanan
            </label>
            <select
              value={filterStoreId}
              onChange={(e) => setFilterStoreId(e.target.value)}
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
            />
          </div>
        </div>

        {/* Aggregated Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Total Nilai Belanja</span>
            <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(totalBelanja)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block">DPP (Dasar Pajak)</span>
            <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(totalDPP)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block">PPN 11% (UU HPP)</span>
            <span className="text-sm font-bold font-mono text-indigo-700 tabular-nums">
              {formatRupiah(totalPPN)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Potongan PPh 23</span>
            <span className="text-sm font-bold font-mono text-amber-700 tabular-nums">
              {formatRupiah(totalPPh23)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Total Komponen Pajak</span>
            <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
              {formatRupiah(totalPajak)}
            </span>
          </div>
        </div>
      </div>

      {/* Report Paper Preview Container (Matches A4 Standard) */}
      <div className="bg-slate-200/80 p-4 sm:p-8 rounded-xl flex justify-center shadow-inner print:p-0 print:bg-white">
        <div
          id="printable-report-page"
          className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-[12.7mm] text-black border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {/* Letterhead */}
          <OfficialLetterhead letterhead={letterhead} profile={profile} />

          {/* Report Body */}
          <div className="mt-5 text-[10pt]">
            {/* Title */}
            <div className="text-center font-bold mb-4">
              <div className="text-[12pt] uppercase tracking-wide">
                {reportType === 'rekap-belanja' && 'BUKU REGISTER REKAPITULASI BELANJA SEKOLAH'}
                {reportType === 'rekap-toko' && 'REKAPITULASI PENGADAAN PER REKANAN / TOKO'}
                {reportType === 'register-dokumen' && 'REGISTER PENOMORAN DOKUMEN PENGADAAN (SP & BAST)'}
              </div>
              <div className="text-[9.5pt] font-normal text-slate-700 mt-0.5">
                {startDate || endDate
                  ? `Periode: ${startDate ? getIndonesianDate(startDate) : 'Awal'} s.d. ${endDate ? getIndonesianDate(endDate) : 'Sekarang'}`
                  : `Tahun Anggaran ${new Date().getFullYear()}`}
              </div>
            </div>

            {/* Content Table 1: Rekap Belanja */}
            {reportType === 'rekap-belanja' && (
              <div className="space-y-4">
                <table className="w-full text-[8.5pt] border-collapse border border-black my-2">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black py-1 px-1.5 w-7">No</th>
                      <th className="border border-black py-1 px-2 w-20">Tanggal</th>
                      <th className="border border-black py-1 px-2 text-left">Penyedia Toko / CV</th>
                      <th className="border border-black py-1 px-2 text-left">Jenis Belanja</th>
                      <th className="border border-black py-1 px-2 w-24 text-right">Total Belanja</th>
                      <th className="border border-black py-1 px-2 w-20 text-right">DPP</th>
                      <th className="border border-black py-1 px-2 w-18 text-right">PPN 11%</th>
                      <th className="border border-black py-1 px-2 w-18 text-right">PPh 23</th>
                      <th className="border border-black py-1 px-2 text-center w-24">Pajak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrx.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="border border-black py-6 text-center text-slate-500 italic">
                          Tidak ada transaksi belanja pada periode yang dipilih
                        </td>
                      </tr>
                    ) : (
                      filteredTrx.map((trx, idx) => {
                        const trxPPN = trx.totalPPN || trx.items.reduce((s, it) => s + (it.ppn || 0), 0);
                        const trxPPh23 = trx.totalPPh23 || trx.items.reduce((s, it) => s + (it.pph23 || 0), 0);
                        return (
                          <tr key={trx.id}>
                            <td className="border border-black py-1 px-1.5 text-center">{idx + 1}</td>
                            <td className="border border-black py-1 px-2 text-center whitespace-nowrap">
                              {trx.tanggalTransaksi}
                            </td>
                            <td className="border border-black py-1 px-2 font-medium">{trx.storeNama}</td>
                            <td className="border border-black py-1 px-2 text-slate-700">{trx.expenseTypeName}</td>
                            <td className="border border-black py-1 px-2 text-right font-medium">{formatRupiah(trx.totalTransaksi)}</td>
                            <td className="border border-black py-1 px-2 text-right text-slate-700">{formatRupiah(trx.totalDPP)}</td>
                            <td className="border border-black py-1 px-2 text-right text-indigo-900">
                              {trxPPN > 0 ? formatRupiah(trxPPN) : '-'}
                            </td>
                            <td className="border border-black py-1 px-2 text-right text-amber-900">
                              {trxPPh23 > 0 ? formatRupiah(trxPPh23) : '-'}
                            </td>
                            <td className="border border-black py-1 px-2 text-center text-[7.5pt] text-slate-600">
                              {trx.statusPajakSummary}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={4} className="border border-black py-1.5 px-2 text-right uppercase">
                        Jumlah Total
                      </td>
                      <td className="border border-black py-1.5 px-2 text-right font-bold">
                        {formatRupiah(totalBelanja)}
                      </td>
                      <td className="border border-black py-1.5 px-2 text-right">
                        {formatRupiah(totalDPP)}
                      </td>
                      <td className="border border-black py-1.5 px-2 text-right text-indigo-900">
                        {formatRupiah(totalPPN)}
                      </td>
                      <td className="border border-black py-1.5 px-2 text-right text-amber-900">
                        {formatRupiah(totalPPh23)}
                      </td>
                      <td className="border border-black py-1.5 px-2 text-center text-[7.5pt]">
                        {formatRupiah(totalPajak)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Content Table 2: Rekap Per Toko */}
            {reportType === 'rekap-toko' && (
              <div className="space-y-4">
                <table className="w-full text-[9pt] border-collapse border border-black my-2">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black py-1.5 px-2 w-8">No</th>
                      <th className="border border-black py-1.5 px-3 text-left">Nama Toko / CV Rekanan</th>
                      <th className="border border-black py-1.5 px-3 text-left">Nama Pemilik</th>
                      <th className="border border-black py-1.5 px-2 w-20 text-center">Frekuensi</th>
                      <th className="border border-black py-1.5 px-3 w-32 text-right">Total Transaksi</th>
                      <th className="border border-black py-1.5 px-3 w-28 text-right">Komponen Pajak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeSummary.map((item, idx) => (
                      <tr key={item.store?.id || idx}>
                        <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
                        <td className="border border-black py-1 px-3 font-semibold">{item.store?.namaToko || '-'}</td>
                        <td className="border border-black py-1 px-3">{item.store?.namaPemilik || '-'}</td>
                        <td className="border border-black py-1 px-2 text-center">{item.count} Transaksi</td>
                        <td className="border border-black py-1 px-3 text-right font-bold">{formatRupiah(item.total)}</td>
                        <td className="border border-black py-1 px-3 text-right">{formatRupiah(item.pajak)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={4} className="border border-black py-1.5 px-3 text-right uppercase">
                        Total Seluruh Toko
                      </td>
                      <td className="border border-black py-1.5 px-3 text-right">
                        {formatRupiah(totalBelanja)}
                      </td>
                      <td className="border border-black py-1.5 px-3 text-right">
                        {formatRupiah(totalPajak)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Content Table 3: Register Dokumen */}
            {reportType === 'register-dokumen' && (
              <div className="space-y-4">
                <table className="w-full text-[8.5pt] border-collapse border border-black my-2">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black py-1.5 px-2 w-8">No</th>
                      <th className="border border-black py-1.5 px-2 w-20">Tanggal</th>
                      <th className="border border-black py-1.5 px-2 text-left">Penyedia</th>
                      <th className="border border-black py-1.5 px-2">Nomor Surat Pesanan (SP)</th>
                      <th className="border border-black py-1.5 px-2">Nomor BAST</th>
                      <th className="border border-black py-1.5 px-2">Nomor BAHPB</th>
                      <th className="border border-black py-1.5 px-2">Nomor BAPB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrx.map((trx, idx) => (
                      <tr key={trx.id}>
                        <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
                        <td className="border border-black py-1 px-2 text-center whitespace-nowrap">{trx.tanggalTransaksi}</td>
                        <td className="border border-black py-1 px-2 font-medium">{trx.storeNama}</td>
                        <td className="border border-black py-1 px-2 font-mono">{trx.nomorSP || '-'}</td>
                        <td className="border border-black py-1 px-2 font-mono">{trx.nomorBAST || '-'}</td>
                        <td className="border border-black py-1 px-2 font-mono">{trx.nomorBAHPB || '-'}</td>
                        <td className="border border-black py-1 px-2 font-mono">{trx.nomorBAPB || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signature Block */}
            <div className="grid grid-cols-2 text-center text-[10pt] mt-8 pt-4 gap-4 break-inside-avoid">
              <div>
                <div>Mengetahui,</div>
                <div>Pengurus Barang Sekolah</div>
                <div className="h-20"></div>
                <div className="font-bold underline uppercase">{profile.namaPengurusBarang}</div>
                <div>NIP. {profile.nipPengurusBarang || '-'}</div>
              </div>

              <div>
                <div>{profile.kabupatenKota}, {getIndonesianDate(new Date().toISOString().split('T')[0])}</div>
                <div>Kepala Sekolah {profile.namaSekolah}</div>
                <div className="h-20"></div>
                <div className="font-bold underline uppercase">{profile.namaKepalaSekolah}</div>
                <div>NIP. {profile.nipKepalaSekolah || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
