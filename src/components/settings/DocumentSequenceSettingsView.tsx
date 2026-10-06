import React, { useState, useEffect } from 'react';
import { DocumentSequenceConfig } from '../../types';
import { api } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { generateDocumentNumber } from '../../utils/numbering';
import { Hash, Save, RotateCcw, Info, CheckCircle2 } from 'lucide-react';

export const DocumentSequenceSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const [seqConfig, setSeqConfig] = useState<DocumentSequenceConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const data = await api.getSequences();
      setSeqConfig(data);
    } catch (err) {
      console.warn('Could not load sequence config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (field: keyof DocumentSequenceConfig, value: any) => {
    if (!seqConfig) return;
    setSeqConfig(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seqConfig) return;
    setIsSaving(true);
    try {
      await api.updateSequences(seqConfig);
      showToast('Konfigurasi penomoran surat resmi berhasil disimpan!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan konfigurasi penomoran', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCounters = () => {
    if (!seqConfig) return;
    setSeqConfig({
      ...seqConfig,
      nextSeqSP: 1,
      nextSeqBAST: 1,
      nextSeqBAHPB: 1,
      nextSeqBAPB: 1,
    });
    showToast('Nomor urut berhasil direset ke 1. Klik Simpan untuk menerapkan.', 'info');
  };

  if (isLoading || !seqConfig) {
    return <div className="p-8 text-center text-slate-500">Memuat konfigurasi penomoran...</div>;
  }

  // Previews
  const previewSP = generateDocumentNumber(seqConfig.formatSP, seqConfig.nextSeqSP, 'SP', seqConfig.kodeSekolah);
  const previewBAST = generateDocumentNumber(seqConfig.formatBAST, seqConfig.nextSeqBAST, 'BAST', seqConfig.kodeSekolah);
  const previewBAHPB = generateDocumentNumber(seqConfig.formatBAHPB, seqConfig.nextSeqBAHPB, 'BAHPB', seqConfig.kodeSekolah);
  const previewBAPB = generateDocumentNumber(seqConfig.formatBAPB, seqConfig.nextSeqBAPB, 'BAPB', seqConfig.kodeSekolah);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Format Penomoran Dokumen Berita Acara</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi pola penomoran Surat Pesanan (SP), BAST, BAHPB, dan BAPB otomatis.
            </p>
          </div>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-inner border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            <span>Pratinjau Hasil Penomoran Surat Berikutnya</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Tahun {seqConfig.tahun}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] font-sans">Surat Pesanan (SP):</span>
            <span className="font-bold text-emerald-400 text-sm">{previewSP}</span>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] font-sans">BAST:</span>
            <span className="font-bold text-emerald-400 text-sm">{previewBAST}</span>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] font-sans">BAHPB:</span>
            <span className="font-bold text-emerald-400 text-sm">{previewBAHPB}</span>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] font-sans">BAPB:</span>
            <span className="font-bold text-emerald-400 text-sm">{previewBAPB}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Konfigurasi Pola Format Nomor
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Singkatan Sekolah
              </label>
              <input
                type="text"
                required
                value={seqConfig.kodeSekolah}
                onChange={(e) => handleChange('kodeSekolah', e.target.value.toUpperCase())}
                placeholder="Contoh: SDN-KK05"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Anggaran Berjalan
              </label>
              <input
                type="number"
                required
                value={seqConfig.tahun}
                onChange={(e) => handleChange('tahun', parseInt(e.target.value) || 2026)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            Variabel token yang dapat digunakan:
            <code className="text-indigo-600 mx-1 font-mono">{'{nomor}'}</code> (nomor urut 001),
            <code className="text-indigo-600 mx-1 font-mono">{'{kode_dok}'}</code> (SP / BAST),
            <code className="text-indigo-600 mx-1 font-mono">{'{kode_sekolah}'}</code> (SDN-KK05),
            <code className="text-indigo-600 mx-1 font-mono">{'{romawi}'}</code> (Bulan I-XII),
            <code className="text-indigo-600 mx-1 font-mono">{'{tahun}'}</code> (2026).
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Format Surat Pesanan (SP)
              </label>
              <input
                type="text"
                required
                value={seqConfig.formatSP}
                onChange={(e) => handleChange('formatSP', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Berita Acara Serah Terima (BAST)
              </label>
              <input
                type="text"
                required
                value={seqConfig.formatBAST}
                onChange={(e) => handleChange('formatBAST', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Hasil Pemeriksaan Barang (BAHPB)
              </label>
              <input
                type="text"
                required
                value={seqConfig.formatBAHPB}
                onChange={(e) => handleChange('formatBAHPB', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Penerimaan Barang (BAPB)
              </label>
              <input
                type="text"
                required
                value={seqConfig.formatBAPB}
                onChange={(e) => handleChange('formatBAPB', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Counter controls */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Nomor Urut Berjalan Saat Ini
            </h2>
            <button
              type="button"
              onClick={handleResetCounters}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Urutan ke 1</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Urutan SP</label>
              <input
                type="number"
                min="1"
                value={seqConfig.nextSeqSP}
                onChange={(e) => handleChange('nextSeqSP', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-mono text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Urutan BAST</label>
              <input
                type="number"
                min="1"
                value={seqConfig.nextSeqBAST}
                onChange={(e) => handleChange('nextSeqBAST', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-mono text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Urutan BAHPB</label>
              <input
                type="number"
                min="1"
                value={seqConfig.nextSeqBAHPB}
                onChange={(e) => handleChange('nextSeqBAHPB', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-mono text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Urutan BAPB</label>
              <input
                type="number"
                min="1"
                value={seqConfig.nextSeqBAPB}
                onChange={(e) => handleChange('nextSeqBAPB', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-mono text-slate-900 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi Penomoran'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
