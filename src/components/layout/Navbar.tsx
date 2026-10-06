import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { LogOut, User as UserIcon, Building2 } from 'lucide-react';

interface NavbarProps {
  currentTabName: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTabName }) => {
  const { user, logout } = useAuth();
  const { profile } = useSchool();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Single text element brand wordmark */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="truncate">
          <span className="text-sm font-bold tracking-tight text-slate-900 block truncate">
            {profile.namaSekolah || 'SD NEGERI KALIBOTO KIDUL 05'}
          </span>
          <span className="text-[11px] text-slate-500 block truncate font-medium">
            Sistem Administrasi & Pengadaan Barang
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation contextual title */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span>Aplikasi</span>
        <span aria-hidden="true">/</span>
        <span className="text-slate-900 font-semibold">{currentTabName}</span>
      </div>

      {/* Zone 3: Active User & Logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.fullName || 'Administrator'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono capitalize">
              {user?.role || 'admin'} · {user?.username}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Keluar dari Aplikasi"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden lg:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
};
