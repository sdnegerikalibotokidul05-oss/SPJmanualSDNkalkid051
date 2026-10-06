import React, { useState } from 'react';
import { api } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  HardDriveDownload,
  Upload,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ShieldCheck,
} from 'lucide-react';

interface BackupRestoreViewProps {
  onRefreshAll: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ onRefreshAll }) => {
  const { showToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Handle Export / Download JSON
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_sip_sekolah_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Cadangan database berhasil diunduh!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor cadangan database', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Import / Restore JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validation
        if (!parsed || !Array.isArray(parsed.stores) || !Array.isArray(parsed.transactions) || !parsed.school_profile) {
          showToast('File JSON bukan cadangan database yang valid untuk aplikasi ini', 'error');
          return;
        }

        setIsRestoring(true);
        const res = await api.restoreBackup(parsed);
        if (res.success) {
          showToast('Database berhasil dipulihkan dari file cadangan!', 'success');
          onRefreshAll();
        }
      } catch (err: any) {
        showToast(err.message || 'Format file JSON rusak atau tidak terbaca', 'error');
      } finally {
        setIsRestoring(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Handle Reset to Default Seeds
  const handleResetToDefault = async () => {
    setIsResetModalOpen(false);
    try {
      const res = await api.resetDatabase();
      if (res.success) {
        showToast('Database berhasil direset ke pengaturan awal SD Negeri Kaliboto Kidul 05!', 'success');
        onRefreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mereset database', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HardDriveDownload className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Cadangan & Pemulihan Database (Backup & Restore)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ekspor seluruh data relasional ke file JSON mandiri dan pulihkan data kapan saja tanpa ketergantungan browser.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Ekspor Database */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Ekspor Cadangan Database (JSON)</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Unduh salinan lengkap database sekolah mencakup: profil sekolah, kop surat, data toko/CV, data barang, jenis belanja, seluruh transaksi belanja, dan audit log.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
            >
              <FileJson className="w-4 h-4" />
              <span>{isExporting ? 'Mengekspor Data...' : 'Unduh File Cadangan (.JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Impor / Pulihkan Database */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Pulihkan Database (Restore)</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Unggah file JSON cadangan yang telah diekspor sebelumnya. Sistem akan memvalidasi struktur tabel relasional sebelum memulihkan data secara aman.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs">
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Memulihkan Data...' : 'Pilih File Cadangan (.JSON)'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone: Factory Reset */}
      <div className="bg-rose-50/60 p-6 rounded-xl border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Setel Ulang ke Pengaturan Awal (Factory Reset)</span>
          </div>
          <p className="text-xs text-rose-700 mt-1 leading-relaxed max-w-xl">
            Kembalikan database ke konfigurasi bawaan <strong>SD NEGERI KALIBOTO KIDUL 05</strong> beserta data toko master dan akun default.
          </p>
        </div>

        <button
          onClick={() => setIsResetModalOpen(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset ke Setelan Awal</span>
        </button>
      </div>

      {/* Reset Confirmation */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Database ke Pengaturan Awal?"
        message="PERINGATAN: Tindakan ini akan mengembalikan profil sekolah, akun admin, toko master, dan data transaksi ke setelan awal default SD Negeri Kaliboto Kidul 05. Pastikan Anda telah mengunduh cadangan JSON terlebih dahulu."
        confirmLabel="Ya, Reset Database"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleResetToDefault}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
