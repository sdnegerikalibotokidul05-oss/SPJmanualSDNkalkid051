import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { ToastProvider, useToast } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { InputBelanjaView } from './components/transactions/InputBelanjaView';
import { DatabaseTransaksiView } from './components/transactions/DatabaseTransaksiView';
import { ReportsView } from './components/reports/ReportsView';
import { StoresView } from './components/master/StoresView';
import { ExpenseTypesView } from './components/master/ExpenseTypesView';
import { ItemsView } from './components/master/ItemsView';
import { SchoolProfileView } from './components/school/SchoolProfileView';
import { LetterheadSettingsView } from './components/school/LetterheadSettingsView';
import { DocumentSequenceSettingsView } from './components/settings/DocumentSequenceSettingsView';
import { AccountSettingsView } from './components/settings/AccountSettingsView';
import { AuditLogsView } from './components/logs/AuditLogsView';
import { BackupRestoreView } from './components/backup/BackupRestoreView';
import { DocumentGeneratorModal } from './components/documents/DocumentGeneratorModal';
import { api } from './services/apiClient';
import { Transaction, Store, ExpenseType, ItemMaster } from './types';
import { Building2 } from 'lucide-react';

const TAB_TITLES: Record<NavTab, string> = {
  dashboard: 'Dashboard Utama',
  'input-belanja': 'Input Belanja Sekolah',
  'database-transaksi': 'Database Transaksi',
  laporan: 'Laporan & Dokumen',
  stores: 'Data Master Toko & CV',
  'expense-types': 'Data Jenis Belanja',
  items: 'Data Master Barang',
  'school-profile': 'Profil Sekolah',
  'school-letterhead': 'Kop Surat (A4)',
  sequences: 'Penomoran Dokumen',
  account: 'Akun Pengguna',
  'audit-logs': 'Audit Log Aktivitas',
  backup: 'Backup & Restore',
};

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshSchoolData } = useSchool();
  const { showToast } = useToast();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [itemsMaster, setItemsMaster] = useState<ItemMaster[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Editing state for input belanja
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Document modal state
  const [activeDocTrx, setActiveDocTrx] = useState<Transaction | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const fetchAppData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingData(true);
    try {
      const [trxData, storeData, expData, itmData] = await Promise.all([
        api.getTransactions(),
        api.getStores(),
        api.getExpenseTypes(),
        api.getItems(),
      ]);
      setTransactions(trxData || []);
      setStores(storeData || []);
      setExpenseTypes(expData || []);
      setItemsMaster(itmData || []);
    } catch (err: any) {
      console.warn('Error fetching app data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);

  // Open Document Modal for given transaction
  const handleOpenDocuments = (trx: Transaction) => {
    setActiveDocTrx(trx);
    setIsDocModalOpen(true);
  };

  // Handle Edit Transaction action
  const handleEditTransaction = (trx: Transaction) => {
    setEditingTransaction(trx);
    setCurrentTab('input-belanja');
  };

  // When new transaction is saved
  const handleTransactionSuccess = (savedTrx: Transaction, openDocModal?: boolean) => {
    fetchAppData();
    setEditingTransaction(null);
    if (openDocModal) {
      setActiveDocTrx(savedTrx);
      setIsDocModalOpen(true);
    } else {
      setCurrentTab('database-transaksi');
    }
  };

  const handleRefreshAll = () => {
    fetchAppData();
    refreshSchoolData();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center animate-pulse mb-3">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <p className="text-xs text-slate-400 font-medium">Memuat Sistem Administrasi Sekolah...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex bg-slate-100/70 text-slate-800">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'input-belanja' && currentTab !== 'input-belanja') {
            setEditingTransaction(null);
          }
          setCurrentTab(tab);
        }}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar currentTabName={TAB_TITLES[currentTab]} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              stores={stores}
              expenseTypes={expenseTypes}
              onNavigate={(tab) => {
                if (tab === 'input-belanja') setEditingTransaction(null);
                setCurrentTab(tab);
              }}
              onViewTransaction={handleOpenDocuments}
            />
          )}

          {currentTab === 'input-belanja' && (
            <InputBelanjaView
              stores={stores}
              expenseTypes={expenseTypes}
              itemsMaster={itemsMaster}
              editingTransaction={editingTransaction}
              onSuccess={handleTransactionSuccess}
              onCancel={() => {
                setEditingTransaction(null);
                setCurrentTab('database-transaksi');
              }}
            />
          )}

          {currentTab === 'database-transaksi' && (
            <DatabaseTransaksiView
              transactions={transactions}
              stores={stores}
              expenseTypes={expenseTypes}
              onRefresh={fetchAppData}
              onEdit={handleEditTransaction}
              onOpenDocuments={handleOpenDocuments}
            />
          )}

          {currentTab === 'laporan' && (
            <ReportsView
              transactions={transactions}
              stores={stores}
              expenseTypes={expenseTypes}
            />
          )}

          {currentTab === 'stores' && (
            <StoresView
              stores={stores}
              onRefresh={fetchAppData}
            />
          )}

          {currentTab === 'expense-types' && (
            <ExpenseTypesView
              expenseTypes={expenseTypes}
              onRefresh={fetchAppData}
            />
          )}

          {currentTab === 'items' && (
            <ItemsView
              items={itemsMaster}
              onRefresh={fetchAppData}
            />
          )}

          {currentTab === 'school-profile' && (
            <SchoolProfileView />
          )}

          {currentTab === 'school-letterhead' && (
            <LetterheadSettingsView />
          )}

          {currentTab === 'sequences' && (
            <DocumentSequenceSettingsView />
          )}

          {currentTab === 'account' && (
            <AccountSettingsView />
          )}

          {currentTab === 'audit-logs' && (
            <AuditLogsView />
          )}

          {currentTab === 'backup' && (
            <BackupRestoreView onRefreshAll={handleRefreshAll} />
          )}
        </main>
      </div>

      {/* Official Document Generator Modal (SP, BAST, BAHPB, BAPB, Rekap) */}
      <DocumentGeneratorModal
        transaction={activeDocTrx}
        isOpen={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          setActiveDocTrx(null);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </SchoolProvider>
    </AuthProvider>
  );
}
