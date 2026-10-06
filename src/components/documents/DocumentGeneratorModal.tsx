import React, { useState } from 'react';
import { Transaction } from '../../types';
import { useSchool } from '../../context/SchoolContext';
import { OfficialLetterhead } from './OfficialLetterhead';
import { formatRupiah, terbilangRupiah, getIndonesianDate } from '../../utils/numbering';
import { getTaxLabel } from '../../utils/taxCalculator';
import { generateAndDownloadPdf, printOrSaveDocument } from '../../utils/printPdfHelper';
import { useToast } from '../common/Toast';
import {
  X,
  Printer,
  FileText,
  FileCheck,
  CheckCircle,
  Download,
  Scroll,
  Loader2,
} from 'lucide-react';

interface DocumentGeneratorModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

type DocType = 'sp' | 'bast' | 'bahpb' | 'bapb' | 'rekap';

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { profile, letterhead } = useSchool();
  const { showToast } = useToast();
  const [activeDoc, setActiveDoc] = useState<DocType>('sp');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  if (!isOpen || !transaction) return null;

  const getDocInfo = () => {
    switch (activeDoc) {
      case 'sp':
        return { code: 'SP', title: 'Surat Pesanan (SP)', filename: `Surat_Pesanan_${transaction.id}.pdf` };
      case 'bast':
        return { code: 'BAST', title: 'Berita Acara Serah Terima (BAST)', filename: `BAST_${transaction.id}.pdf` };
      case 'bahpb':
        return { code: 'BAHPB', title: 'Hasil Pemeriksaan Barang (BAHPB)', filename: `BAHPB_${transaction.id}.pdf` };
      case 'bapb':
        return { code: 'BAPB', title: 'Penerimaan Barang (BAPB)', filename: `BAPB_${transaction.id}.pdf` };
      case 'rekap':
        return { code: 'REKAP', title: 'Rincian Belanja & Rekap Pajak', filename: `Rincian_Belanja_${transaction.id}.pdf` };
    }
  };

  const handleDownloadPdf = async () => {
    const docInfo = getDocInfo();
    const element = document.getElementById('printable-document-page');
    if (!element) {
      showToast('Halaman dokumen tidak ditemukan.', 'error');
      return;
    }
    setIsExportingPdf(true);
    setPdfProgress('Menyiapkan file PDF...');
    try {
      const ok = await generateAndDownloadPdf(element, {
        filename: docInfo.filename,
        documentTitle: docInfo.title,
        onProgress: (p) => setPdfProgress(p),
      });
      if (ok) {
        showToast(`Dokumen ${docInfo.title} berhasil diunduh sebagai PDF!`, 'success');
      } else {
        showToast('Gagal membuat file PDF. Silakan coba kembali.', 'error');
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      showToast('Terjadi kendala saat membuat PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  const handlePrint = async () => {
    const docInfo = getDocInfo();
    const element = document.getElementById('printable-document-page');
    if (!element) return;

    setIsExportingPdf(true);
    setPdfProgress('Membuka cetak...');
    try {
      const res = await printOrSaveDocument(element, {
        filename: docInfo.filename,
        documentTitle: docInfo.title,
        onProgress: (p) => setPdfProgress(p),
      });
      if (res.method === 'pdf') {
        showToast('Pencetakan dialihkan ke unduh PDF karena batasan preview browser.', 'info');
      }
    } catch (err) {
      console.warn('Print error:', err);
      // Fallback directly to PDF
      await handleDownloadPdf();
    } finally {
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Action Bar (Screen Only) */}
        <div className="print:hidden p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Scroll className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Generator Dokumen Berita Acara Resmi</h3>
              <p className="text-[11px] text-slate-400">
                Format Standar A4 Narrow Margin (1.27 cm) · {transaction.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action: Direct PDF Download (.pdf) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Unduh langsung file dokumen resmi dalam format .pdf standar A4"
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

            {/* Secondary Action: Print via Printer Dialog */}
            <button
              onClick={handlePrint}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Cetak dokumen ke printer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Document Switcher (Screen Only) */}
        <div className="print:hidden bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap gap-1 text-xs">
          <button
            onClick={() => setActiveDoc('sp')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer ${
              activeDoc === 'sp'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            1. Surat Pesanan (SP)
          </button>

          <button
            onClick={() => setActiveDoc('bast')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer ${
              activeDoc === 'bast'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            2. Berita Acara Serah Terima (BAST)
          </button>

          <button
            onClick={() => setActiveDoc('bahpb')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer ${
              activeDoc === 'bahpb'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            3. Hasil Pemeriksaan (BAHPB)
          </button>

          <button
            onClick={() => setActiveDoc('bapb')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer ${
              activeDoc === 'bapb'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            4. Penerimaan Barang (BAPB)
          </button>

          <button
            onClick={() => setActiveDoc('rekap')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer ${
              activeDoc === 'rekap'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            5. Rincian Nota & Belanja
          </button>
        </div>

        {/* Paper Container (A4 Printable Layout) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          <div
            id="printable-document-page"
            className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-[12.7mm] text-black border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* Standard Kop Surat Sekolah */}
            <OfficialLetterhead letterhead={letterhead} profile={profile} />

            {/* Document Content Switcher */}
            <div className="mt-5 text-[11pt] leading-normal">
              {activeDoc === 'sp' && (
                <SuratPesananDoc
                  trx={transaction}
                  profile={profile}
                />
              )}
              {activeDoc === 'bast' && (
                <BastDoc
                  trx={transaction}
                  profile={profile}
                />
              )}
              {activeDoc === 'bahpb' && (
                <BahpbDoc
                  trx={transaction}
                  profile={profile}
                />
              )}
              {activeDoc === 'bapb' && (
                <BapbDoc
                  trx={transaction}
                  profile={profile}
                />
              )}
              {activeDoc === 'rekap' && (
                <RekapDoc
                  trx={transaction}
                  profile={profile}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 1. SURAT PESANAN (SP)
const SuratPesananDoc: React.FC<{ trx: Transaction; profile: any }> = ({ trx, profile }) => {
  return (
    <div className="space-y-4">
      <div className="text-center font-bold">
        <div className="underline text-[13pt] uppercase tracking-wide">SURAT PESANAN (SP)</div>
        <div className="text-[10pt] font-normal mt-0.5 font-mono">
          Nomor: {trx.nomorSP || `.../SP/${profile.namaSekolah}/2026`}
        </div>
      </div>

      <div className="text-[10pt] text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini:
      </div>

      <table className="w-full text-[10pt] border-collapse ml-4">
        <tbody>
          <tr>
            <td className="w-44 py-0.5">Nama</td>
            <td className="w-4 py-0.5">:</td>
            <td className="font-semibold">{profile.namaKepalaSekolah}</td>
          </tr>
          <tr>
            <td className="py-0.5">NIP</td>
            <td className="py-0.5">:</td>
            <td>{profile.nipKepalaSekolah || '-'}</td>
          </tr>
          <tr>
            <td className="py-0.5">Jabatan</td>
            <td className="py-0.5">:</td>
            <td>Kepala Sekolah {profile.namaSekolah}</td>
          </tr>
          <tr>
            <td className="py-0.5">Alamat</td>
            <td className="py-0.5">:</td>
            <td>{profile.alamatSekolah}, {profile.kabupatenKota}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed">
        Dengan ini memberikan pesanan pengadaan barang kepada:
      </div>

      <table className="w-full text-[10pt] border-collapse ml-4">
        <tbody>
          <tr>
            <td className="w-44 py-0.5">Nama Toko / CV</td>
            <td className="w-4 py-0.5">:</td>
            <td className="font-semibold">{trx.storeNama}</td>
          </tr>
          <tr>
            <td className="py-0.5">Nama Pemilik / Pimpinan</td>
            <td className="py-0.5">:</td>
            <td>{trx.storePemilik}</td>
          </tr>
          <tr>
            <td className="py-0.5">Alamat</td>
            <td className="py-0.5">:</td>
            <td>{trx.storeAlamat}</td>
          </tr>
          <tr>
            <td className="py-0.5">Telepon</td>
            <td className="py-0.5">:</td>
            <td>{trx.storeTelepon || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed">
        Untuk menyediakan dan mengirimkan barang kebutuhan sekolah dengan rincian sebagai berikut:
      </div>

      {/* Table Items */}
      <table className="w-full text-[9.5pt] border-collapse border border-black my-2">
        <thead>
          <tr className="bg-slate-100 font-bold text-center">
            <th className="border border-black py-1.5 px-2 w-10">No</th>
            <th className="border border-black py-1.5 px-3 text-left">Nama Barang / Uraian</th>
            <th className="border border-black py-1.5 px-2 w-20">Satuan</th>
            <th className="border border-black py-1.5 px-2 w-16">Volume</th>
            <th className="border border-black py-1.5 px-3 text-right w-28">Harga (Rp)</th>
            <th className="border border-black py-1.5 px-3 text-right w-32">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {trx.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
              <td className="border border-black py-1 px-3">{item.uraian}</td>
              <td className="border border-black py-1 px-2 text-center">{item.satuan}</td>
              <td className="border border-black py-1 px-2 text-center">{item.volume}</td>
              <td className="border border-black py-1 px-3 text-right">{formatRupiah(item.harga)}</td>
              <td className="border border-black py-1 px-3 text-right font-medium">{formatRupiah(item.jumlah)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50">
            <td colSpan={5} className="border border-black py-1.5 px-3 text-right uppercase">
              Total Belanja Termasuk Pajak
            </td>
            <td className="border border-black py-1.5 px-3 text-right">
              {formatRupiah(trx.totalTransaksi)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-[9.5pt] italic text-slate-800">
        Terbilang: <strong>{terbilangRupiah(trx.totalTransaksi)}</strong>
      </div>

      <div className="text-[10pt] text-justify leading-relaxed mt-2">
        Demikian Surat Pesanan ini dibuat untuk dipergunakan sebagaimana mestinya dan barang diserahkan dalam keadaan baik dan lengkap.
      </div>

      {/* Signature Block */}
      <div className="grid grid-cols-2 text-center text-[10pt] mt-6 pt-4 gap-4 break-inside-avoid">
        <div>
          <div>Menerima dan Menyetujui,</div>
          <div className="font-semibold">{trx.storeNama}</div>
          <div className="h-20"></div>
          <div className="font-bold underline uppercase">{trx.storePemilik}</div>
          <div>Pemilik / Pimpinan</div>
        </div>

        <div>
          <div>{profile.kabupatenKota}, {getIndonesianDate(trx.tanggalSP || trx.tanggalTransaksi)}</div>
          <div>Kepala Sekolah {profile.namaSekolah}</div>
          <div className="h-20"></div>
          <div className="font-bold underline uppercase">{profile.namaKepalaSekolah}</div>
          <div>NIP. {profile.nipKepalaSekolah || '-'}</div>
        </div>
      </div>
    </div>
  );
};

// 2. BERITA ACARA SERAH TERIMA (BAST)
const BastDoc: React.FC<{ trx: Transaction; profile: any }> = ({ trx, profile }) => {
  return (
    <div className="space-y-4">
      <div className="text-center font-bold">
        <div className="underline text-[12pt] uppercase tracking-wide">BERITA ACARA SERAH TERIMA HASIL PEKERJAAN / BARANG</div>
        <div className="text-[10pt] font-normal mt-0.5 font-mono">
          Nomor: {trx.nomorBAST || `.../BAST/${profile.namaSekolah}/2026`}
        </div>
      </div>

      <div className="text-[10pt] text-justify leading-relaxed">
        Pada hari ini, tanggal <strong>{getIndonesianDate(trx.tanggalBAST || trx.tanggalTransaksi)}</strong>, yang bertanda tangan di bawah ini:
      </div>

      <table className="w-full text-[10pt] border-collapse ml-4">
        <tbody>
          <tr>
            <td className="w-44 py-0.5">1. Nama</td>
            <td className="w-4 py-0.5">:</td>
            <td className="font-semibold">{trx.storePemilik}</td>
          </tr>
          <tr>
            <td className="py-0.5">   Perusahaan / Toko</td>
            <td className="py-0.5">:</td>
            <td>{trx.storeNama}</td>
          </tr>
          <tr>
            <td className="py-0.5">   Alamat</td>
            <td className="py-0.5">:</td>
            <td>{trx.storeAlamat}</td>
          </tr>
          <tr>
            <td colSpan={3} className="py-1 text-slate-700 italic">
              Selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong> (Yang Menyerahkan)
            </td>
          </tr>
          <tr>
            <td className="w-44 py-0.5">2. Nama</td>
            <td className="w-4 py-0.5">:</td>
            <td className="font-semibold">{profile.namaKepalaSekolah}</td>
          </tr>
          <tr>
            <td className="py-0.5">   NIP</td>
            <td className="py-0.5">:</td>
            <td>{profile.nipKepalaSekolah || '-'}</td>
          </tr>
          <tr>
            <td className="py-0.5">   Jabatan</td>
            <td className="py-0.5">:</td>
            <td>Kepala Sekolah {profile.namaSekolah}</td>
          </tr>
          <tr>
            <td colSpan={3} className="py-1 text-slate-700 italic">
              Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong> (Yang Menerima)
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed">
        Menyatakan bahwa PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA dan PIHAK KEDUA telah menerima penyerahan barang belanja pengadaan dari PIHAK PERTAMA sesuai Surat Pesanan Nomor: <strong>{trx.nomorSP || '-'}</strong> dalam keadaan lengkap, baik, dan baru:
      </div>

      {/* Table Items */}
      <table className="w-full text-[9.5pt] border-collapse border border-black my-2">
        <thead>
          <tr className="bg-slate-100 font-bold text-center">
            <th className="border border-black py-1.5 px-2 w-10">No</th>
            <th className="border border-black py-1.5 px-3 text-left">Nama Barang / Uraian</th>
            <th className="border border-black py-1.5 px-2 w-20">Volume</th>
            <th className="border border-black py-1.5 px-2 w-20">Satuan</th>
            <th className="border border-black py-1.5 px-3 text-right w-32">Harga Satuan</th>
            <th className="border border-black py-1.5 px-3 text-right w-32">Total Harga</th>
          </tr>
        </thead>
        <tbody>
          {trx.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
              <td className="border border-black py-1 px-3">{item.uraian}</td>
              <td className="border border-black py-1 px-2 text-center">{item.volume}</td>
              <td className="border border-black py-1 px-2 text-center">{item.satuan}</td>
              <td className="border border-black py-1 px-3 text-right">{formatRupiah(item.harga)}</td>
              <td className="border border-black py-1 px-3 text-right font-medium">{formatRupiah(item.jumlah)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50">
            <td colSpan={5} className="border border-black py-1.5 px-3 text-right uppercase">
              Total Penerimaan Belanja
            </td>
            <td className="border border-black py-1.5 px-3 text-right">
              {formatRupiah(trx.totalTransaksi)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed mt-2">
        Demikian Berita Acara Serah Terima ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.
      </div>

      {/* Signature Block */}
      <div className="grid grid-cols-2 text-center text-[10pt] mt-6 pt-4 gap-4 break-inside-avoid">
        <div>
          <div>PIHAK PERTAMA</div>
          <div>Yang Menyerahkan,</div>
          <div className="font-semibold">{trx.storeNama}</div>
          <div className="h-20"></div>
          <div className="font-bold underline uppercase">{trx.storePemilik}</div>
          <div>Pemilik / Pimpinan</div>
        </div>

        <div>
          <div>PIHAK KEDUA</div>
          <div>Yang Menerima,</div>
          <div>Kepala Sekolah {profile.namaSekolah}</div>
          <div className="h-20"></div>
          <div className="font-bold underline uppercase">{profile.namaKepalaSekolah}</div>
          <div>NIP. {profile.nipKepalaSekolah || '-'}</div>
        </div>
      </div>
    </div>
  );
};

// 3. BERITA ACARA HASIL PEMERIKSAAN BARANG (BAHPB)
const BahpbDoc: React.FC<{ trx: Transaction; profile: any }> = ({ trx, profile }) => {
  return (
    <div className="space-y-4">
      <div className="text-center font-bold">
        <div className="underline text-[12pt] uppercase tracking-wide">BERITA ACARA HASIL PEMERIKSAAN BARANG (BAHPB)</div>
        <div className="text-[10pt] font-normal mt-0.5 font-mono">
          Nomor: {trx.nomorBAHPB || `.../BAHPB/${profile.namaSekolah}/2026`}
        </div>
      </div>

      <div className="text-[10pt] text-justify leading-relaxed">
        Pada hari ini, tanggal <strong>{getIndonesianDate(trx.tanggalBAHPB || trx.tanggalTransaksi)}</strong>, kami yang bertugas sebagai Pejabat / Pengurus Barang pada {profile.namaSekolah}:
      </div>

      <table className="w-full text-[10pt] border-collapse ml-4">
        <tbody>
          <tr>
            <td className="w-44 py-0.5">Nama</td>
            <td className="w-4 py-0.5">:</td>
            <td className="font-semibold">{profile.namaPengurusBarang}</td>
          </tr>
          <tr>
            <td className="py-0.5">NIP</td>
            <td className="py-0.5">:</td>
            <td>{profile.nipPengurusBarang || '-'}</td>
          </tr>
          <tr>
            <td className="py-0.5">Jabatan</td>
            <td className="py-0.5">:</td>
            <td>Pengurus Barang / Petugas Pemeriksa</td>
          </tr>
          <tr>
            <td className="py-0.5">Unit Kerja</td>
            <td className="py-0.5">:</td>
            <td>{profile.namaSekolah}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed">
        Telah melakukan pemeriksaan fisik, kuantitas, spesifikasi, dan mutu terhadap barang yang diserahkan oleh penyedia: <strong>{trx.storeNama}</strong> berdasarkan Surat Pesanan Nomor: <strong>{trx.nomorSP}</strong>, dengan hasil sebagai berikut:
      </div>

      {/* Table Items */}
      <table className="w-full text-[9.5pt] border-collapse border border-black my-2">
        <thead>
          <tr className="bg-slate-100 font-bold text-center">
            <th className="border border-black py-1.5 px-2 w-10">No</th>
            <th className="border border-black py-1.5 px-3 text-left">Nama Barang yang Diperiksa</th>
            <th className="border border-black py-1.5 px-2 w-20">Volume</th>
            <th className="border border-black py-1.5 px-2 w-20">Satuan</th>
            <th className="border border-black py-1.5 px-3 text-center w-28">Kondisi Fisik</th>
            <th className="border border-black py-1.5 px-3 text-center w-28">Kesesuaian</th>
          </tr>
        </thead>
        <tbody>
          {trx.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
              <td className="border border-black py-1 px-3">{item.uraian}</td>
              <td className="border border-black py-1 px-2 text-center">{item.volume}</td>
              <td className="border border-black py-1 px-2 text-center">{item.satuan}</td>
              <td className="border border-black py-1 px-3 text-center text-emerald-800 font-medium">100% Baik / Baru</td>
              <td className="border border-black py-1 px-3 text-center text-emerald-800 font-medium">Sesuai Pesanan</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed mt-2">
        Kesimpulan: Seluruh barang yang diperiksa dinyatakan <strong>MEMENUHI SYARAT, BAIK, DAN LENGKAP</strong> sehingga dapat diterima untuk diadministrasikan ke dalam pembukuan barang inventaris sekolah.
      </div>

      {/* Signature Block */}
      <div className="grid grid-cols-2 text-center text-[10pt] mt-6 pt-4 gap-4 break-inside-avoid">
        <div>
          <div>Mengetahui,</div>
          <div>Kepala Sekolah {profile.namaSekolah}</div>
          <div className="h-20"></div>
          <div className="font-bold underline uppercase">{profile.namaKepalaSekolah}</div>
          <div>NIP. {profile.nipKepalaSekolah || '-'}</div>
        </div>

        <div>
          <div>Petugas Pemeriksa,</div>
          <div>Pengurus Barang Sekolah</div>
          <div className="h-20"></div>
          <div className="font-bold underline uppercase">{profile.namaPengurusBarang}</div>
          <div>NIP. {profile.nipPengurusBarang || '-'}</div>
        </div>
      </div>
    </div>
  );
};

// 4. BERITA ACARA PENERIMAAN BARANG (BAPB)
const BapbDoc: React.FC<{ trx: Transaction; profile: any }> = ({ trx, profile }) => {
  return (
    <div className="space-y-4">
      <div className="text-center font-bold">
        <div className="underline text-[12pt] uppercase tracking-wide">BERITA ACARA PENERIMAAN BARANG (BAPB)</div>
        <div className="text-[10pt] font-normal mt-0.5 font-mono">
          Nomor: {trx.nomorBAPB || `.../BAPB/${profile.namaSekolah}/2026`}
        </div>
      </div>

      <div className="text-[10pt] text-justify leading-relaxed">
        Berdasarkan Berita Acara Hasil Pemeriksaan Barang Nomor: <strong>{trx.nomorBAHPB}</strong> tanggal {getIndonesianDate(trx.tanggalBAHPB || trx.tanggalTransaksi)}, maka pada hari ini tanggal <strong>{getIndonesianDate(trx.tanggalBAPB || trx.tanggalTransaksi)}</strong>, kami yang bertanda tangan di bawah ini:
      </div>

      <table className="w-full text-[10pt] border-collapse ml-4">
        <tbody>
          <tr>
            <td className="w-44 py-0.5">Nama Pengurus Barang</td>
            <td className="w-4 py-0.5">:</td>
            <td className="font-semibold">{profile.namaPengurusBarang}</td>
          </tr>
          <tr>
            <td className="py-0.5">NIP</td>
            <td className="py-0.5">:</td>
            <td>{profile.nipPengurusBarang || '-'}</td>
          </tr>
          <tr>
            <td className="py-0.5">Sekolah / Lembaga</td>
            <td className="py-0.5">:</td>
            <td>{profile.namaSekolah}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed">
        Telah menerima barang hasil pengadaan dari penyedia <strong>{trx.storeNama}</strong> dan mencatatnya ke dalam Buku Penerimaan Barang Sekolah untuk jenis mata belanja <strong>{trx.expenseTypeName}</strong>:
      </div>

      {/* Table Items */}
      <table className="w-full text-[9.5pt] border-collapse border border-black my-2">
        <thead>
          <tr className="bg-slate-100 font-bold text-center">
            <th className="border border-black py-1.5 px-2 w-10">No</th>
            <th className="border border-black py-1.5 px-3 text-left">Uraian Nama Barang</th>
            <th className="border border-black py-1.5 px-2 w-20">Volume</th>
            <th className="border border-black py-1.5 px-2 w-20">Satuan</th>
            <th className="border border-black py-1.5 px-3 text-right w-32">Harga Satuan</th>
            <th className="border border-black py-1.5 px-3 text-right w-32">Jumlah Total</th>
          </tr>
        </thead>
        <tbody>
          {trx.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
              <td className="border border-black py-1 px-3">{item.uraian}</td>
              <td className="border border-black py-1 px-2 text-center">{item.volume}</td>
              <td className="border border-black py-1 px-2 text-center">{item.satuan}</td>
              <td className="border border-black py-1 px-3 text-right">{formatRupiah(item.harga)}</td>
              <td className="border border-black py-1 px-3 text-right font-medium">{formatRupiah(item.jumlah)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50">
            <td colSpan={5} className="border border-black py-1.5 px-3 text-right uppercase">
              Total Nilai Barang Diterima
            </td>
            <td className="border border-black py-1.5 px-3 text-right">
              {formatRupiah(trx.totalTransaksi)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10pt] text-justify leading-relaxed mt-2">
        Demikian Berita Acara Penerimaan Barang ini dibuat rangkap secukupnya untuk dijadikan dasar pencatatan buku kas dan pembukuan aset persediaan sekolah.
      </div>

      {/* Signature Block (3 Parties) */}
      <div className="grid grid-cols-3 text-center text-[9pt] mt-6 pt-4 gap-2 break-inside-avoid">
        <div>
          <div>Penyedia Barang,</div>
          <div className="font-semibold">{trx.storeNama}</div>
          <div className="h-16"></div>
          <div className="font-bold underline uppercase">{trx.storePemilik}</div>
          <div>Pemilik Toko</div>
        </div>

        <div>
          <div>Penerima Barang,</div>
          <div>Pengurus Barang Sekolah</div>
          <div className="h-16"></div>
          <div className="font-bold underline uppercase">{profile.namaPengurusBarang}</div>
          <div>NIP. {profile.nipPengurusBarang || '-'}</div>
        </div>

        <div>
          <div>Mengetahui,</div>
          <div>Kepala Sekolah</div>
          <div className="h-16"></div>
          <div className="font-bold underline uppercase">{profile.namaKepalaSekolah}</div>
          <div>NIP. {profile.nipKepalaSekolah || '-'}</div>
        </div>
      </div>
    </div>
  );
};

// 5. RINCIAN BELANJA & PAJAK (REKAP)
const RekapDoc: React.FC<{ trx: Transaction; profile: any }> = ({ trx, profile }) => {
  return (
    <div className="space-y-4">
      <div className="text-center font-bold">
        <div className="underline text-[12pt] uppercase tracking-wide">LEMBAR RINCIAN NOTA & REKAPITULASI PAJAK BELANJA</div>
        <div className="text-[10pt] font-normal mt-0.5 font-mono">
          ID Transaksi: {trx.id} · Tanggal: {getIndonesianDate(trx.tanggalTransaksi)}
        </div>
      </div>

      <table className="w-full text-[10pt] border-collapse">
        <tbody>
          <tr>
            <td className="w-40 py-0.5 text-slate-600">Penyedia Toko / CV</td>
            <td className="w-4 py-0.5">:</td>
            <td className="font-semibold">{trx.storeNama} ({trx.storePemilik})</td>
          </tr>
          <tr>
            <td className="py-0.5 text-slate-600">Jenis Belanja</td>
            <td className="py-0.5">:</td>
            <td>{trx.expenseTypeName}</td>
          </tr>
          <tr>
            <td className="py-0.5 text-slate-600">Alamat Toko</td>
            <td className="py-0.5">:</td>
            <td>{trx.storeAlamat}</td>
          </tr>
          <tr>
            <td className="py-0.5 text-slate-600">Nomor Dokumen SP</td>
            <td className="py-0.5">:</td>
            <td className="font-mono">{trx.nomorSP}</td>
          </tr>
        </tbody>
      </table>

      {/* Items Table with Tax Breakdown (PPN & PPh 23) */}
      <table className="w-full text-[8.5pt] border-collapse border border-black my-2">
        <thead>
          <tr className="bg-slate-100 font-bold text-center">
            <th className="border border-black py-1 px-1.5 w-7">No</th>
            <th className="border border-black py-1 px-2 text-left">Uraian Barang / Jasa</th>
            <th className="border border-black py-1 px-1 w-10">Vol</th>
            <th className="border border-black py-1 px-1 w-14">Satuan</th>
            <th className="border border-black py-1 px-2 text-right w-20">Harga Final</th>
            <th className="border border-black py-1 px-2 text-right w-22">Total Belanja</th>
            <th className="border border-black py-1 px-2 text-right w-20">DPP</th>
            <th className="border border-black py-1 px-2 text-right w-20">PPN 11%</th>
            <th className="border border-black py-1 px-2 text-right w-20">PPh 23</th>
            <th className="border border-black py-1 px-1.5 w-24 text-center">Opsi Pajak</th>
          </tr>
        </thead>
        <tbody>
          {trx.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td className="border border-black py-1 px-1.5 text-center">{idx + 1}</td>
              <td className="border border-black py-1 px-2">{item.uraian}</td>
              <td className="border border-black py-1 px-1 text-center">{item.volume}</td>
              <td className="border border-black py-1 px-1 text-center">{item.satuan}</td>
              <td className="border border-black py-1 px-2 text-right">{formatRupiah(item.harga)}</td>
              <td className="border border-black py-1 px-2 text-right font-medium">{formatRupiah(item.jumlah)}</td>
              <td className="border border-black py-1 px-2 text-right text-slate-700">{formatRupiah(item.dpp)}</td>
              <td className="border border-black py-1 px-2 text-right text-indigo-900 font-medium">
                {item.ppn && item.ppn > 0 ? formatRupiah(item.ppn) : '-'}
              </td>
              <td className="border border-black py-1 px-2 text-right text-amber-900 font-medium">
                {item.pph23 && item.pph23 > 0 ? formatRupiah(item.pph23) : '-'}
              </td>
              <td className="border border-black py-1 px-1.5 text-center text-[8pt] text-slate-700">
                {getTaxLabel(item.pajak)}
              </td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50">
            <td colSpan={5} className="border border-black py-1 px-2 text-right uppercase">
              Total Akumulasi
            </td>
            <td className="border border-black py-1 px-2 text-right font-bold">
              {formatRupiah(trx.totalTransaksi)}
            </td>
            <td className="border border-black py-1 px-2 text-right">
              {formatRupiah(trx.totalDPP)}
            </td>
            <td className="border border-black py-1 px-2 text-right text-indigo-900 font-bold">
              {formatRupiah(trx.totalPPN || trx.items.reduce((acc, it) => acc + (it.ppn || 0), 0))}
            </td>
            <td className="border border-black py-1 px-2 text-right text-amber-900 font-bold">
              {formatRupiah(trx.totalPPh23 || trx.items.reduce((acc, it) => acc + (it.pph23 || 0), 0))}
            </td>
            <td className="border border-black py-1 px-1 text-center text-[7.5pt] text-slate-600">
              {trx.statusPajakSummary}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[9.5pt]">
        <div><strong>Status Pengenaan Pajak:</strong> {trx.statusPajakSummary}</div>
        <div className="mt-1"><strong>Terbilang:</strong> <em>{terbilangRupiah(trx.totalTransaksi)}</em></div>
        <div className="mt-1 text-[8.5pt] text-slate-600 leading-relaxed">
          * Dasar Perhitungan Pajak Pemerintah Indonesia: Harga final sudah mencakup pajak. Komponen PPN 11% dan PPh 23 dihitung dari Dasar Pengenaan Pajak (DPP). Pemotongan pajak tidak menambah total nilai belanja bruto.
        </div>
      </div>

      <div className="grid grid-cols-2 text-center text-[10pt] mt-6 pt-4 gap-4 break-inside-avoid">
        <div>
          <div>Lunas dibayar kepada rekanan,</div>
          <div>Penerima Pembayaran,</div>
          <div className="h-16"></div>
          <div className="font-bold underline uppercase">{trx.storePemilik}</div>
          <div>{trx.storeNama}</div>
        </div>

        <div>
          <div>Setuju dibayar,</div>
          <div>Kepala Sekolah {profile.namaSekolah}</div>
          <div className="h-16"></div>
          <div className="font-bold underline uppercase">{profile.namaKepalaSekolah}</div>
          <div>NIP. {profile.nipKepalaSekolah || '-'}</div>
        </div>
      </div>
    </div>
  );
};
