import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { profile } = useSchool();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username dan password wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(username, password);
      if (!res.success) {
        // Ekstrak string agar tidak jadi [object Object]
        const rawErr = res.error as any;
        const errDetail = typeof rawErr === 'object' && rawErr !== null
          ? (rawErr.message || JSON.stringify(rawErr)) 
          : rawErr;
        setErrorMessage(errDetail || 'Username atau password salah.');
      }
    } catch (err: any) {
      // PERBAIKAN 2: Pastikan menangkap string pesan eror
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan pada sistem autentikasi.';
      setErrorMessage(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Top Brand Banner */}
          <div className="bg-slate-900 p-8 text-center border-b border-slate-800 text-white relative">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white p-2 shadow-md flex items-center justify-center mb-4">
              {/* PERBAIKAN: Gunakan path relatif publik (/logo.jpg) atau SVG placeholder sebagai fallback */}
              <img
                 src={profile.logoUrl || '/logo.jpg'}
                 alt="Logo Sekolah"
                 className="w-full h-full object-contain"
                 onError={(e) => {
                 // Memakai SVG Data URL lokal langsung (tidak butuh koneksi internet ke website luar)
                 (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%234f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
                 }}
              />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">
              {profile.namaSekolah || 'SD NEGERI KALIBOTO KIDUL 05'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sistem Informasi Pengadaan & Administrasi Dokumen Belanja
            </p>
          </div>

          {/* Form Area */}
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-slate-900">Masuk ke Sistem</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Silakan masukkan kredensial operator atau bendahara sekolah.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Memproses Masuk...</span>
                  ) : (
                    <>
                      <span>Masuk Aplikasi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Helper Badge */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enkripsi SHA-256 Sesi Aman</span>
              </span>
              <span className="font-mono text-slate-600">admin / admin123</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Pemerintah Kabupaten Lumajang · Dinas Pendidikan dan Kebudayaan
        </div>
      </div>
    </div>
  );
};