import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types';
import { useSchool } from '../../context/SchoolContext';
import { OfficialLetterhead } from './OfficialLetterhead';
import { formatRupiah, terbilangRupiah, getIndonesianDate } from '../../utils/numbering';
import { getTaxLabel } from '../../utils/taxCalculator';
import { generateAndDownloadPdf, printDocument, PaperSize } from '../../utils/printPdfHelper';
import { useToast } from '../common/Toast';
import {
  X,
  Printer,
  FileText,
  FileCheck,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Download,
  Scroll,
  Loader2,
  Settings2,
  RefreshCw,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
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
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [verification, setVerification] = useState<{
    isReady: boolean;
    containerFound: boolean;
    imagesCount: number;
    imagesLoaded: boolean;
    approxPages: number;
    environment: 'standalone' | 'iframe';
    lastChecked: string;
  } | null>(null);

  const runVerification = () => {
    const el = document.getElementById('printable-document-page');
    const containerFound = !!el;
    let imagesCount = 0;
    let imagesLoaded = true;
    let approxPages = 1;

    if (el) {
      const imgs = el.querySelectorAll('img');
      imagesCount = imgs.length;
      imgs.forEach((img) => {
        if (!img.complete || (img.naturalWidth === 0 && img.src)) {
          imagesLoaded = false;
        }
      });
      const height = el.scrollHeight;
      const pageHeightFactor = paperSize === 'F4' ? 1200 : 1050;
      approxPages = Math.max(1, Math.ceil(height / pageHeightFactor));
    }

    const isInIframe = window.self !== window.top;

    setVerification({
      isReady: containerFound && imagesLoaded,
      containerFound,
      imagesCount,
      imagesLoaded,
      approxPages,
      environment: isInIframe ? 'iframe' : 'standalone',
      lastChecked: new Date().toLocaleTimeString('id-ID'),
    });
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        runVerification();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeDoc, paperSize]);

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
    setPdfProgress(`Menyiapkan file PDF ${paperSize}...`);
    try {
      const cleanFilename = docInfo.filename.replace('.pdf', `_${paperSize}.pdf`);
      const ok = await generateAndDownloadPdf(element, {
        filename: cleanFilename,
        documentTitle: `${docInfo.title} (${paperSize})`,
        paperSize,
        onProgress: (p) => setPdfProgress(p),
      });
      if (ok) {
        showToast(`Dokumen ${docInfo.title} berhasil diunduh dalam format PDF (${paperSize})!`, 'success');
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
    showToast(`Membuka menu cetak ${docInfo.title} (${paperSize === 'F4' ? 'F4 / Folio 21x33cm' : 'A4 21x29.7cm'})...`, 'info');
    const ok = await printDocument('printable-document-page', {
      documentTitle: `${docInfo.title} - ${transaction.id} (${paperSize})`,
      isModal: true,
      paperSize,
    });
    if (!ok) {
      showToast('Menu cetak browser tidak tersedia di lingkungan ini. Dokumen dialihkan ke unduhan PDF siap cetak...', 'info');
      handleDownloadPdf();
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
                Format Standar {paperSize === 'F4' ? 'F4 / Folio (21 × 33 cm)' : 'A4 (21 × 29.7 cm)'} · Narrow Margin (1.27 cm) · {transaction.id}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Paper Size Switcher: A4 vs F4 (Folio 21x33 cm) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Pilih Ukuran Kertas A4 (21.0 × 29.7 cm)"
              >
                A4 (21×29.7)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-2.5 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  paperSize === 'F4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Pilih Ukuran Kertas F4 / Folio (21.0 × 33.0 cm) - Standar Sekolah & Instansi RI"
              >
                F4 (21×33 cm)
              </button>
            </div>

            {/* Dedicated Print Settings / Helper Toggle */}
            <button
              onClick={() => {
                setShowPrintSettings(prev => !prev);
                runVerification();
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showPrintSettings
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Buka panduan & verifikasi kesiapan render cetak browser"
            >
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Panduan & Pengaturan Cetak</span>
              <span className="sm:hidden">Pengaturan</span>
              {showPrintSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Primary Action: Direct PDF Download (.pdf) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title={`Unduh langsung file dokumen resmi dalam format .pdf ${paperSize}`}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{pdfProgress || 'Memproses...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Simpan PDF ({paperSize})</span>
                </>
              )}
            </button>

            {/* Secondary Action: Print via Printer Dialog */}
            <button
              onClick={handlePrint}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title={`Cetak dokumen ke printer (${paperSize})`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak ({paperSize})</span>
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
        <div className="print:hidden bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1 text-xs">
          <div className="flex flex-wrap gap-1">
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

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 pr-2">
            <span>Kertas Aktif:</span>
            <span className={`px-2 py-0.5 rounded font-bold text-white ${paperSize === 'F4' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              {paperSize === 'F4' ? 'F4 (21×33 cm)' : 'A4 (21×29.7 cm)'}
            </span>
          </div>
        </div>

        {/* Dedicated Print Settings & Render Verification Helper (Screen Only) */}
        {showPrintSettings && (
          <div className="print:hidden bg-slate-50 border-b border-indigo-100 p-4 sm:p-5 text-slate-800">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Helper Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Settings2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      Panduan & Pengaturan Cetak (Pilihan Kertas A4 / F4)
                      {verification?.isReady ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap Dicetak ({paperSize})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> Memeriksa Elemen...
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pilih ukuran kertas A4 atau F4 (Folio 21×33 cm) serta verifikasi kesiapan render dokumen {getDocInfo().title}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={runVerification}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Periksa ulang kesiapan render elemen dokumen"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Periksa Ulang</span>
                  </button>
                  <button
                    onClick={() => setShowPrintSettings(false)}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    Tutup Panduan
                  </button>
                </div>
              </div>

              {/* Dedicated Paper Size Selector Card */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Scroll className="w-4 h-4 text-indigo-600" />
                    Pilihan Ukuran Kertas Cetak & PDF:
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Lebar standar: 21,0 cm (210 mm)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Option A4 */}
                  <div
                    onClick={() => setPaperSize('A4')}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paperSize === 'A4'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${paperSize === 'A4' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                          {paperSize === 'A4' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                        </span>
                        Kertas A4 (21,0 × 29,7 cm)
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.5 rounded">
                        Standar ISO
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-4.5">
                      Ukuran internasional umum (210 × 297 mm). Cocok untuk printer kantor standar & arsip umum.
                    </p>
                  </div>

                  {/* Option F4 (Folio) */}
                  <div
                    onClick={() => setPaperSize('F4')}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paperSize === 'F4'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${paperSize === 'F4' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                          {paperSize === 'F4' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                        </span>
                        Kertas F4 / Folio (21,0 × 33,0 cm)
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                        Standar Sekolah RI
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-4.5">
                      Tinggi 33 cm (+3,3 cm dibanding A4). Ideal untuk Berita Acara & daftar belanja panjang agar muat rapi tanpa terpotong.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid: Status Checklist & Browser Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Box 1: Checklist Elemen DOM */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Checklist Render Dokumen ({paperSize})
                  </h5>
                  <ul className="space-y-1.5 text-slate-600 text-[11px]">
                    <li className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5">
                        <Check className={`w-3.5 h-3.5 ${verification?.containerFound ? 'text-emerald-600' : 'text-slate-300'}`} />
                        Target Kontainer Dokumen:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {verification?.containerFound ? '#printable-document-page (Siap)' : 'Tidak Ditemukan'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5">
                        <Check className={`w-3.5 h-3.5 ${verification?.imagesLoaded ? 'text-emerald-600' : 'text-amber-500'}`} />
                        Logo & Aset Visual:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {verification?.imagesLoaded ? `Semua Termuat (${verification.imagesCount} aset)` : 'Sedang Memuat...'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Ukuran Kertas Terpilih:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {paperSize === 'F4' ? 'F4 / Folio (210 × 330 mm)' : 'A4 Portrait (210 × 297 mm)'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Margin Lembar Dokumen:
                      </span>
                      <span className="font-semibold text-slate-800">
                        Narrow 12.7 mm (1.27 cm)
                      </span>
                    </li>
                    <li className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Estimasi Halaman:
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${paperSize === 'F4' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        ~{verification?.approxPages || 1} Halaman {paperSize}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Box 2: Pengaturan Menu Cetak Browser */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    Petunjuk Menu Cetak Browser ({paperSize})
                  </h5>
                  <ul className="space-y-1.5 text-slate-600 text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span><strong>Ukuran Kertas di Print Dialog:</strong> Pilih <strong>{paperSize === 'F4' ? 'Folio / F4 / Legal (210 × 330 mm)' : 'A4'}</strong>.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span><strong>Margin:</strong> Pilih <strong>Default</strong> atau <strong>Minimum</strong> (1.27 cm).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span><strong>Grafik Latar Belakang:</strong> <em>Centang</em> (Background graphics) agar garis kop & tabel tegas.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span><strong>Header & Footer:</strong> <em>Hilangkan centang</em> agar lembar bebas dari URL/tanggal browser.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Dedicated Action Section calling printDocument utility */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div className="text-[11px] text-indigo-900 font-medium flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Jalankan utilitas cetak terverifikasi untuk kertas <strong>{paperSize}</strong>:</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handlePrint}
                    disabled={isExportingPdf}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow active:scale-98"
                    title={`Mengeksekusi printDocument() untuk memunculkan menu cetak browser kertas ${paperSize}`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Dokumen ({paperSize})</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Alternatif unduh langsung file PDF (${paperSize})`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Simpan PDF ({paperSize})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paper Container (Printable Layout - A4: 297mm, F4: 330mm) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          <div
            id="printable-document-page"
            data-print-container="true"
            className={`bg-white shadow-xl w-full max-w-[210mm] ${
              paperSize === 'F4' ? 'min-h-[330mm]' : 'min-h-[297mm]'
            } p-[12.7mm] text-black border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0`}
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

      {/* Items Table matching mockup: No | Uraian Barang / Jasa | Vol | Satuan | Harga Final | Total Belanja | DPP | Pajak */}
      <table className="w-full text-[9pt] border-collapse border border-black my-2">
        <thead>
          <tr className="bg-slate-50 font-bold">
            <th className="border border-black py-2 px-1.5 w-8 text-center">No</th>
            <th className="border border-black py-2 px-2 text-left">Uraian Barang / Jasa</th>
            <th className="border border-black py-2 px-1 w-12 text-center bg-slate-100">Vol</th>
            <th className="border border-black py-2 px-2 w-16 text-left">Satuan</th>
            <th className="border border-black py-2 px-2 text-left w-24">Harga Final</th>
            <th className="border border-black py-2 px-2 text-left w-28">Total Belanja</th>
            <th className="border border-black py-2 px-2 text-left w-24">DPP</th>
            <th className="border border-black py-2 px-2.5 text-left w-32">Pajak</th>
          </tr>
        </thead>
        <tbody>
          {trx.items.map((item, idx) => {
            const hasPPN = (item.ppn || 0) > 0;
            const hasPPh23 = (item.pph23 || 0) > 0;

            let pphRateLabel = 'PPh 23 4%';
            if (item.pajak === 'PPH23_3' || item.pajak === 'PPH23_3_PPN') {
              pphRateLabel = 'PPh 23 3%';
            } else if (item.pajak === 'PPH23_4' || item.pajak === 'PPH23_4_PPN' || item.pajak === 'PPH23_PPN') {
              pphRateLabel = 'PPh 23 4%';
            }

            return (
              <tr key={item.id || idx}>
                <td className="border border-black py-2 px-1.5 text-center">{idx + 1}</td>
                <td className="border border-black py-2 px-2">{item.uraian}</td>
                <td className="border border-black py-2 px-1 text-center bg-slate-100/70">{item.volume}</td>
                <td className="border border-black py-2 px-2">{item.satuan}</td>
                <td className="border border-black py-2 px-2 text-left whitespace-nowrap">{formatRupiah(item.harga)}</td>
                <td className="border border-black py-2 px-2 text-left whitespace-nowrap font-medium">{formatRupiah(item.jumlah)}</td>
                <td className="border border-black py-2 px-2 text-left whitespace-nowrap text-slate-800">{formatRupiah(item.dpp)}</td>
                <td className="border border-black py-2 px-2.5 text-left align-top">
                  {hasPPN || hasPPh23 ? (
                    <div className="space-y-2 text-[8.5pt] leading-tight">
                      {hasPPN && (
                        <div>
                          <div className="font-semibold text-slate-800">PPn 11% :</div>
                          <div className="font-normal text-slate-900">{formatRupiah(item.ppn!)}</div>
                        </div>
                      )}
                      {hasPPh23 && (
                        <div>
                          <div className="font-semibold text-slate-800">{pphRateLabel} :</div>
                          <div className="font-normal text-slate-900">{formatRupiah(item.pph23!)}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="font-bold bg-slate-50">
            <td colSpan={5} className="border border-black py-2 px-2 text-right uppercase">
              Total Akumulasi
            </td>
            <td className="border border-black py-2 px-2 text-left font-bold whitespace-nowrap">
              {formatRupiah(trx.totalTransaksi)}
            </td>
            <td className="border border-black py-2 px-2 text-left font-bold whitespace-nowrap">
              {formatRupiah(trx.totalDPP)}
            </td>
            <td className="border border-black py-2 px-2.5 text-left font-bold align-top">
              {(trx.totalPPN || 0) > 0 || (trx.totalPPh23 || 0) > 0 ? (
                <div className="space-y-1.5 text-[8.5pt] leading-tight">
                  {(trx.totalPPN || 0) > 0 && (
                    <div>
                      <div className="font-semibold text-slate-800">PPn 11% :</div>
                      <div className="font-normal">{formatRupiah(trx.totalPPN || 0)}</div>
                    </div>
                  )}
                  {(trx.totalPPh23 || 0) > 0 && (
                    <div>
                      <div className="font-semibold text-slate-800">PPh 23 :</div>
                      <div className="font-normal">{formatRupiah(trx.totalPPh23 || 0)}</div>
                    </div>
                  )}
                </div>
              ) : (
                '-'
              )}
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
