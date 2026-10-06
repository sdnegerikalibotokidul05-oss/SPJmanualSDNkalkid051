import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useToast } from '../common/Toast';
import { SchoolLetterhead } from '../../types';
import { OfficialLetterhead } from '../documents/OfficialLetterhead';
import { FileText, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const LetterheadSettingsView: React.FC = () => {
  const { letterhead, profile, updateLetterhead, isLoading } = useSchool();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<SchoolLetterhead>({ ...letterhead });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setFormData({ ...letterhead });
  }, [letterhead]);

  const handleChange = (field: keyof SchoolLetterhead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateLetterhead(formData);
      showToast('Format Kop Surat A4 berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengaturan kop surat', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Text length warnings for standard A4 printable width without wrapping
  const baris1Warning = (formData.pemerintahDaerah || '').length > 40;
  const baris2Warning = (formData.dinasTerkait || '').length > 42;
  const baris3Warning = (formData.namaUnitSekolah || '').length > 35;

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Memuat konfigurasi kop surat...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Pengaturan Kop Surat Resmi (A4)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Standar baku A4 (21 x 29,7 cm), Margin Narrow (1,27 cm), Font Arial Rasio 18pt : 18pt : 24pt (3 : 3 : 4).
            </p>
          </div>
        </div>
      </div>

      {/* Live A4 Interactive Preview */}
      <div className="bg-slate-800 p-6 rounded-xl shadow-inner border border-slate-700">
        <div className="flex items-center justify-between mb-3 text-slate-300">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Pratinjau Langsung Kop Surat (Standar A4 Narrow Margin)</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            A4 210 x 297 mm · Margin 12.7 mm · Arial
          </div>
        </div>

        {/* Paper Simulation */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-4xl mx-auto border border-slate-200">
          <div className="text-[10px] font-mono text-slate-400 border-b border-dashed border-slate-300 pb-1 mb-4 flex justify-between">
            <span>[Batas Atas Margin Sempit 1,27 cm]</span>
            <span>Arial 18pt : 18pt : 24pt</span>
          </div>

          <OfficialLetterhead letterhead={formData} profile={profile} />

          <div className="mt-8 pt-4 border-t border-dashed border-slate-200 text-center text-[11px] text-slate-400 italic">
            (Area konten naskah Surat Pesanan, BAST, BAHPB, dan BAPB akan tercetak di bawah garis kop ini)
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Inputs */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Konfigurasi Teks Kepala Surat
          </h2>

          {/* Baris 1 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Baris 1 (Pemerintah Daerah) <span className="font-mono text-indigo-600 font-bold">[18 pt · Bold]</span>
              </label>
              <span className="text-[11px] text-slate-400">Rasio 3</span>
            </div>
            <input
              type="text"
              required
              value={formData.pemerintahDaerah}
              onChange={(e) => handleChange('pemerintahDaerah', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase font-bold text-slate-900"
            />
            {baris1Warning && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Peringatan: Teks melebihi 40 karakter, berisiko terpotong pada cetakan A4.</span>
              </div>
            )}
          </div>

          {/* Baris 2 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Baris 2 (Instansi / Dinas Terkait) <span className="font-mono text-indigo-600 font-bold">[18 pt · Bold]</span>
              </label>
              <span className="text-[11px] text-slate-400">Rasio 3</span>
            </div>
            <input
              type="text"
              required
              value={formData.dinasTerkait}
              onChange={(e) => handleChange('dinasTerkait', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase font-bold text-slate-900"
            />
            {baris2Warning && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Peringatan: Teks melebihi 42 karakter, disarankan disingkat agar tidak keluar batas.</span>
              </div>
            )}
          </div>

          {/* Baris 3 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Baris 3 (Nama Unit Sekolah) <span className="font-mono text-indigo-600 font-bold">[24 pt · Bold]</span>
              </label>
              <span className="text-[11px] text-slate-400">Rasio 4</span>
            </div>
            <input
              type="text"
              required
              value={formData.namaUnitSekolah}
              onChange={(e) => handleChange('namaUnitSekolah', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase font-bold text-slate-900 text-sm"
            />
            {baris3Warning && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Peringatan: Teks nama sekolah panjang pada 24pt, pastikan tetap dalam satu baris.</span>
              </div>
            )}
          </div>

          {/* Sublines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Baris Alamat & Kode Pos (Font Arial ~10 pt)
              </label>
              <input
                type="text"
                value={formData.alamatBaris}
                onChange={(e) => handleChange('alamatBaris', e.target.value)}
                placeholder="Dusun, Desa, Kecamatan, Kabupaten, Kode Pos"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Baris Kontak / Email / Web (Font Arial ~9.5 pt)
              </label>
              <input
                type="text"
                value={formData.kontakBaris}
                onChange={(e) => handleChange('kontakBaris', e.target.value)}
                placeholder="Telepon, Email, Website resmi"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Dimension Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lebar Logo (cm) [Standar: 2 cm]
              </label>
              <input
                type="number"
                step="0.1"
                min="1.5"
                max="3.5"
                value={formData.logoWidthCm}
                onChange={(e) => handleChange('logoWidthCm', parseFloat(e.target.value) || 2)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tinggi Logo (cm) [Standar: 3 cm]
              </label>
              <input
                type="number"
                step="0.1"
                min="2.0"
                max="4.0"
                value={formData.logoHeightCm}
                onChange={(e) => handleChange('logoHeightCm', parseFloat(e.target.value) || 3)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Font Kop
              </label>
              <input
                type="text"
                disabled
                value="Arial (Standar Baku)"
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan Kop...' : 'Simpan Format Kop Surat'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
