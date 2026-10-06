import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Database,
  FileSpreadsheet,
  Store,
  Tag,
  Package,
  Building,
  FileText,
  Hash,
  UserCheck,
  History,
  HardDriveDownload,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'input-belanja'
  | 'database-transaksi'
  | 'laporan'
  | 'stores'
  | 'expense-types'
  | 'items'
  | 'school-profile'
  | 'school-letterhead'
  | 'sequences'
  | 'account'
  | 'audit-logs'
  | 'backup';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navSections = [
    {
      title: 'Menu Utama',
      items: [
        { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'input-belanja' as NavTab, label: 'Input Belanja', icon: ShoppingCart },
        { id: 'database-transaksi' as NavTab, label: 'Database Transaksi', icon: Database },
        { id: 'laporan' as NavTab, label: 'Laporan & Dokumen', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'Data Master',
      items: [
        { id: 'stores' as NavTab, label: 'Data Toko / CV', icon: Store },
        { id: 'expense-types' as NavTab, label: 'Jenis Belanja', icon: Tag },
        { id: 'items' as NavTab, label: 'Data Barang', icon: Package },
      ],
    },
    {
      title: 'Pengaturan & Sistem',
      items: [
        { id: 'school-profile' as NavTab, label: 'Profil Sekolah', icon: Building },
        { id: 'school-letterhead' as NavTab, label: 'Kop Surat (A4)', icon: FileText },
        { id: 'sequences' as NavTab, label: 'Penomoran Dokumen', icon: Hash },
        { id: 'account' as NavTab, label: 'Akun Pengguna', icon: UserCheck },
        { id: 'audit-logs' as NavTab, label: 'Audit Log', icon: History },
        { id: 'backup' as NavTab, label: 'Backup & Restore', icon: HardDriveDownload },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            SK
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wider uppercase">
              SIP-SEKOLAH
            </div>
            <div className="text-[10px] text-slate-400">
              Pengadaan & Administrasi
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.title}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="truncate font-medium text-slate-300">SDN Kaliboto Kidul 05</div>
        <div className="text-[10px] mt-0.5 text-slate-400">Tahun Anggaran 2026</div>
      </div>
    </aside>
  );
};
