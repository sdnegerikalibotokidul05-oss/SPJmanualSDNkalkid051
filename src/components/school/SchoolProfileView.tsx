import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useToast } from '../common/Toast';
import { SchoolProfile } from '../../types';
import { Building2, Save, Upload, Trash2, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';

// Client-side image compressor to ensure fast upload, light storage, and crisp rendering
function compressImage(file: File, maxDimension = 500, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SchoolProfileView: React.FC = () => {
  const { profile, updateProfile, isLoading } = useSchool();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<SchoolProfile>({ ...profile });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Sync state if profile changes
  React.useEffect(() => {
    setFormData({ ...profile });
  }, [profile]);

  const handleChange = (field: keyof SchoolProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa format gambar (PNG/JPG)', 'error');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const optimizedBase64 = await compressImage(file, 500, 0.85);
      setFormData(prev => ({ ...prev, logoUrl: optimizedBase64 }));
      // Immediately save to database and local cache so user never loses it
      await updateProfile({ logoUrl: optimizedBase64 });
      showToast('Logo berhasil diupload dan disimpan ke database!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses gambar logo', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setIsUploadingLogo(true);
      setFormData(prev => ({ ...prev, logoUrl: '' }));
      await updateProfile({ logoUrl: '' });
      showToast('Logo dihapus dan perubahan telah disimpan.', 'info');
    } catch (err: any) {
      showToast('Gagal menghapus logo', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleResetDefaultLogo = async () => {
    try {
      setIsUploadingLogo(true);
      const defaultEmblem = '/logo.jpg';
      setFormData(prev => ({
        ...prev,
        logoUrl: defaultEmblem,
      }));
      await updateProfile({ logoUrl: defaultEmblem });
      showToast('Logo dikembalikan ke emblem standar dan disimpan.', 'info');
    } catch (err: any) {
      showToast('Gagal mereset logo', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      showToast('Profil sekolah dan logo berhasil disimpan ke database!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan profil sekolah', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Memuat data profil sekolah...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Pengaturan Profil Sekolah</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Data profil digunakan secara otomatis pada seluruh naskah surat dan dokumen berita acara.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Logo Resmi Sekolah
            </h2>
            {formData.logoUrl && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Logo Aktif & Tersimpan</span>
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-28 h-36 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center relative shadow-xs">
              {isUploadingLogo ? (
                <div className="flex flex-col items-center justify-center gap-2 text-indigo-600">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-[10px] font-medium text-slate-500">Menyimpan...</span>
                </div>
              ) : formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Preview Logo"
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs text-slate-400 text-center">Belum ada logo</span>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="text-xs text-slate-600 leading-relaxed">
                Pilih berkas lambang sekolah atau dinas pendidikan (PNG transparan atau JPG). Logo akan otomatis dioptimasi dan disimpan secara permanen ke database sistem.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingLogo ? 'Memproses...' : 'Upload Logo Baru'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingLogo}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                {formData.logoUrl && (
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={handleRemoveLogo}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Logo</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isUploadingLogo}
                  onClick={handleResetDefaultLogo}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gunakan Emblem Standar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Identitas Sekolah */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
            Identitas Lembaga & Kontak
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Sekolah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.namaSekolah}
                onChange={(e) => handleChange('namaSekolah', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Sekolah (Jalan / Dusun / RT-RW) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.alamatSekolah}
                onChange={(e) => handleChange('alamatSekolah', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Desa / Kelurahan
              </label>
              <input
                type="text"
                value={formData.desaKelurahan}
                onChange={(e) => handleChange('desaKelurahan', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kecamatan
              </label>
              <input
                type="text"
                value={formData.kecamatan}
                onChange={(e) => handleChange('kecamatan', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kabupaten / Kota
              </label>
              <input
                type="text"
                value={formData.kabupatenKota}
                onChange={(e) => handleChange('kabupatenKota', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Provinsi
              </label>
              <input
                type="text"
                value={formData.provinsi}
                onChange={(e) => handleChange('provinsi', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Pos
              </label>
              <input
                type="text"
                value={formData.kodePos}
                onChange={(e) => handleChange('kodePos', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={formData.nomorTelepon}
                onChange={(e) => handleChange('nomorTelepon', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Sekolah
              </label>
              <input
                type="email"
                value={formData.emailSekolah}
                onChange={(e) => handleChange('emailSekolah', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Pejabat Sekolah (Penandatangan Dokumen) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
            Pejabat Penandatangan Dokumen Pengadaan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kepala Sekolah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.namaKepalaSekolah}
                onChange={(e) => handleChange('namaKepalaSekolah', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={formData.nipKepalaSekolah}
                onChange={(e) => handleChange('nipKepalaSekolah', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pengurus Barang <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.namaPengurusBarang}
                onChange={(e) => handleChange('namaPengurusBarang', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Pengurus Barang
              </label>
              <input
                type="text"
                value={formData.nipPengurusBarang}
                onChange={(e) => handleChange('nipPengurusBarang', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan ke Database...' : 'Simpan Perubahan Profil'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
