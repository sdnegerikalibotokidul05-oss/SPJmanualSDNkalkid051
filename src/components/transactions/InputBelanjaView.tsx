import React, { useState, useEffect } from 'react';
import { Store, ExpenseType, ItemMaster, Transaction, TransactionItem, TaxType } from '../../types';
import { api } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { calculateItemAmounts, calculateTransactionSummary, TAX_OPTIONS, getTaxLabel } from '../../utils/taxCalculator';
import { formatRupiah, terbilangRupiah } from '../../utils/numbering';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  FileText,
  RotateCcw,
  Sparkles,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building,
  User,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface InputBelanjaViewProps {
  stores: Store[];
  expenseTypes: ExpenseType[];
  itemsMaster: ItemMaster[];
  editingTransaction?: Transaction | null;
  onSuccess: (savedTrx: Transaction, openDocModal?: boolean) => void;
  onCancel?: () => void;
}

export const InputBelanjaView: React.FC<InputBelanjaViewProps> = ({
  stores,
  expenseTypes,
  itemsMaster,
  editingTransaction,
  onSuccess,
  onCancel,
}) => {
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  // Transaction form state
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState<string>('');
  const [tanggalTransaksi, setTanggalTransaksi] = useState<string>(todayStr);

  // Document numbers & dates
  const [nomorSP, setNomorSP] = useState<string>('');
  const [tanggalSP, setTanggalSP] = useState<string>(todayStr);
  const [nomorBAST, setNomorBAST] = useState<string>('');
  const [tanggalBAST, setTanggalBAST] = useState<string>(todayStr);
  const [nomorBAHPB, setNomorBAHPB] = useState<string>('');
  const [tanggalBAHPB, setTanggalBAHPB] = useState<string>(todayStr);
  const [nomorBAPB, setNomorBAPB] = useState<string>('');
  const [tanggalBAPB, setTanggalBAPB] = useState<string>(todayStr);

  const [catatan, setCatatan] = useState<string>('');
  const [statusTrx, setStatusTrx] = useState<'Selesai' | 'Draf'>('Selesai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingNumbers, setIsGeneratingNumbers] = useState(false);
  const [showTaxGuide, setShowTaxGuide] = useState(false);

  // Dynamic Items Rows
  const [items, setItems] = useState<TransactionItem[]>([
    {
      id: `row-${Date.now()}-1`,
      no: 1,
      uraian: '',
      satuan: 'Buah',
      volume: 1,
      harga: 0,
      pajak: 'NON',
      jumlah: 0,
      dpp: 0,
      ppn: 0,
      pph23: 0,
      nilaiPajak: 0,
    },
  ]);

  // Selected Store Object
  const selectedStore = stores.find(s => s.id === selectedStoreId);

  // Initialize if editing
  useEffect(() => {
    if (editingTransaction) {
      setSelectedStoreId(editingTransaction.storeId || '');
      setSelectedExpenseTypeId(editingTransaction.expenseTypeId || '');
      setTanggalTransaksi(editingTransaction.tanggalTransaksi || todayStr);
      setNomorSP(editingTransaction.nomorSP || '');
      setTanggalSP(editingTransaction.tanggalSP || todayStr);
      setNomorBAST(editingTransaction.nomorBAST || '');
      setTanggalBAST(editingTransaction.tanggalBAST || todayStr);
      setNomorBAHPB(editingTransaction.nomorBAHPB || '');
      setTanggalBAHPB(editingTransaction.tanggalBAHPB || todayStr);
      setNomorBAPB(editingTransaction.nomorBAPB || '');
      setTanggalBAPB(editingTransaction.tanggalBAPB || todayStr);
      setCatatan(editingTransaction.catatan || '');
      setStatusTrx(editingTransaction.status === 'Draf' ? 'Draf' : 'Selesai');

      if (editingTransaction.items && editingTransaction.items.length > 0) {
        setItems(editingTransaction.items.map((it, idx) => ({ ...it, no: idx + 1 })));
      }
    } else if (stores.length > 0 && !selectedStoreId) {
      // Default to first store
      setSelectedStoreId(stores[0].id);
      if (expenseTypes.length > 0) {
        setSelectedExpenseTypeId(expenseTypes[0].id);
      }
      handleGenerateNumbers(todayStr);
    }
  }, [editingTransaction, stores, expenseTypes]);

  // Auto-generate document numbers from server sequence
  const handleGenerateNumbers = async (dateParam?: string) => {
    setIsGeneratingNumbers(true);
    try {
      const generated = await api.generateDocNumbers(dateParam || tanggalTransaksi);
      setNomorSP(generated.nomorSP);
      setNomorBAST(generated.nomorBAST);
      setNomorBAHPB(generated.nomorBAHPB);
      setNomorBAPB(generated.nomorBAPB);
      showToast('Nomor dokumen resmi berhasil digenerate otomatis!', 'info');
    } catch (err: any) {
      console.warn('Could not auto-generate numbers from server:', err);
    } finally {
      setIsGeneratingNumbers(false);
    }
  };

  // Row Manipulation
  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length + 1}`,
        no: prev.length + 1,
        uraian: '',
        satuan: 'Buah',
        volume: 1,
        harga: 0,
        pajak: 'NON',
        jumlah: 0,
        dpp: 0,
        ppn: 0,
        pph23: 0,
        nilaiPajak: 0,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      showToast('Minimal harus ada 1 baris barang', 'info');
      return;
    }
    const updated = items.filter((_, i) => i !== index).map((row, idx) => ({ ...row, no: idx + 1 }));
    setItems(updated);
  };

  const handleRowChange = (index: number, field: keyof TransactionItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'volume' || field === 'harga' || field === 'pajak') {
        const vol = field === 'volume' ? Number(value) : target.volume;
        const prc = field === 'harga' ? Number(value) : target.harga;
        const pjk = field === 'pajak' ? (value as TaxType) : target.pajak;

        const calcs = calculateItemAmounts(vol, prc, pjk);
        target.jumlah = calcs.jumlah;
        target.dpp = calcs.dpp;
        target.ppn = calcs.ppn;
        target.pph23 = calcs.pph23;
        target.nilaiPajak = calcs.nilaiPajak;
      }

      updated[index] = target;
      return updated;
    });
  };

  // Quick Select from Master Catalog
  const handleSelectMasterItem = (index: number, itemId: string) => {
    const found = itemsMaster.find(i => i.id === itemId);
    if (!found) return;

    setItems(prev => {
      const updated = [...prev];
      const target = {
        ...updated[index],
        uraian: found.namaBarang,
        satuan: found.satuan,
        harga: found.hargaDefault,
      };
      const calcs = calculateItemAmounts(target.volume, target.harga, target.pajak);
      target.jumlah = calcs.jumlah;
      target.dpp = calcs.dpp;
      target.ppn = calcs.ppn;
      target.pph23 = calcs.pph23;
      target.nilaiPajak = calcs.nilaiPajak;
      updated[index] = target;
      return updated;
    });
  };
 
  // Quick bulk apply tax to all item rows
  const handleApplyTaxToAll = (taxType: TaxType) => {
    setItems(prev =>
      prev.map(item => {
        const calcs = calculateItemAmounts(item.volume, item.harga, taxType);
        return {
          ...item,
          pajak: taxType,
          jumlah: calcs.jumlah,
          dpp: calcs.dpp,
          ppn: calcs.ppn,
          pph23: calcs.pph23,
          nilaiPajak: calcs.nilaiPajak,
        };
      })
    );
    showToast(`Opsi pajak "${getTaxLabel(taxType)}" berhasil diterapkan ke semua baris`, 'info');
  };

  // Summary Calculations
  const summary = calculateTransactionSummary(items);

  const handleSubmit = async (openDocModalAfter: boolean = false) => {
    if (!selectedStoreId) {
      showToast('Silakan pilih toko / rekanan penyedia', 'error');
      return;
    }
    if (!selectedExpenseTypeId) {
      showToast('Silakan pilih jenis belanja', 'error');
      return;
    }
    if (items.some(it => !it.uraian.trim())) {
      showToast('Uraian barang pada setiap baris tidak boleh kosong', 'error');
      return;
    }
    if (items.some(it => it.volume <= 0 || it.harga < 0)) {
      showToast('Volume dan harga barang harus bernilai positif', 'error');
      return;
    }

    const selectedExpense = expenseTypes.find(e => e.id === selectedExpenseTypeId);

    const payload: Partial<Transaction> = {
      tanggalTransaksi,
      storeId: selectedStoreId,
      storeNama: selectedStore?.namaToko || '',
      storePemilik: selectedStore?.namaPemilik || '',
      storeAlamat: selectedStore?.alamatToko || '',
      storeTelepon: selectedStore?.nomorTelepon || '',
      expenseTypeId: selectedExpenseTypeId,
      expenseTypeName: selectedExpense?.namaJenisBelanja || 'Belanja Operasional',
      nomorSP,
      tanggalSP,
      nomorBAST,
      tanggalBAST,
      nomorBAHPB,
      tanggalBAHPB,
      nomorBAPB,
      tanggalBAPB,
      items,
      totalTransaksi: summary.totalTransaksi,
      totalDPP: summary.totalDPP,
      totalPPN: summary.totalPPN,
      totalPPh23: summary.totalPPh23,
      totalPajak: summary.totalPajak,
      statusPajakSummary: summary.statusPajakSummary,
      status: statusTrx,
      catatan,
    };

    setIsSubmitting(true);
    try {
      let saved: Transaction;
      if (editingTransaction) {
        saved = await api.updateTransaction(editingTransaction.id, payload);
        showToast('Transaksi belanja berhasil diperbarui!', 'success');
      } else {
        saved = await api.createTransaction(payload);
        showToast('Transaksi belanja baru berhasil disimpan ke database!', 'success');
      }
      onSuccess(saved, openDocModalAfter);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan transaksi belanja', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              {editingTransaction ? `Edit Transaksi Belanja (${editingTransaction.id})` : 'Formulir Input Belanja Sekolah'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Input data pengadaan, penomoran berita acara, dan rincian barang belanja sekolah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
          )}
          <button
            type="button"
            onClick={() => handleGenerateNumbers()}
            disabled={isGeneratingNumbers}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingNumbers ? 'Men-generate...' : 'Generate Nomor Otomatis'}</span>
          </button>
        </div>
      </div>

      {/* Bagian 1: Informasi Transaksi & Toko (Section 7) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>1. Informasi Rekanan & Jenis Belanja</span>
          </h2>
          <span className="text-[11px] text-slate-400">Data Toko & Alamat Terisi Otomatis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Toko Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Toko / CV Rekanan <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
            >
              <option value="">-- Pilih Toko Rekanan --</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.namaToko} ({s.namaPemilik})
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Belanja */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jenis Belanja <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedExpenseTypeId}
              onChange={(e) => setSelectedExpenseTypeId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
            >
              <option value="">-- Pilih Jenis Belanja --</option>
              {expenseTypes.map(e => (
                <option key={e.id} value={e.id}>
                  {e.namaJenisBelanja}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Transaksi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={tanggalTransaksi}
                onChange={(e) => {
                  setTanggalTransaksi(e.target.value);
                  setTanggalSP(e.target.value);
                  setTanggalBAST(e.target.value);
                  setTanggalBAHPB(e.target.value);
                  setTanggalBAPB(e.target.value);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Info Toko Terpilih (Auto-filled) */}
        {selectedStore && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Pemilik Toko (Otomatis)</span>
                <span className="font-semibold text-slate-900">{selectedStore.namaPemilik}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Alamat Toko (Otomatis)</span>
                <span className="font-semibold text-slate-900">{selectedStore.alamatToko}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Telepon Rekanan</span>
                <span className="font-mono text-slate-900">{selectedStore.nomorTelepon || '-'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bagian 2: Penomoran Dokumen Berita Acara (Section 7) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>2. Nomor & Tanggal Dokumen Berita Acara</span>
          </h2>
          <span className="text-[11px] text-slate-400">Digunakan pada cetak SP, BAST, BAHPB, BAPB</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Surat Pesanan (SP) */}
          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
            <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
              <span>Surat Pesanan (SP)</span>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Nomor SP</label>
              <input
                type="text"
                value={nomorSP}
                onChange={(e) => setNomorSP(e.target.value)}
                placeholder="001/SP/..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Tanggal SP</label>
              <input
                type="date"
                value={tanggalSP}
                onChange={(e) => setTanggalSP(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-slate-800"
              />
            </div>
          </div>

          {/* BAST */}
          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
            <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
              <span>Berita Acara Serah Terima (BAST)</span>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Nomor BAST</label>
              <input
                type="text"
                value={nomorBAST}
                onChange={(e) => setNomorBAST(e.target.value)}
                placeholder="001/BAST/..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Tanggal BAST</label>
              <input
                type="date"
                value={tanggalBAST}
                onChange={(e) => setTanggalBAST(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-slate-800"
              />
            </div>
          </div>

          {/* BAHPB */}
          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
            <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
              <span>Hasil Pemeriksaan Barang (BAHPB)</span>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Nomor BAHPB</label>
              <input
                type="text"
                value={nomorBAHPB}
                onChange={(e) => setNomorBAHPB(e.target.value)}
                placeholder="001/BAHPB/..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Tanggal BAHPB</label>
              <input
                type="date"
                value={tanggalBAHPB}
                onChange={(e) => setTanggalBAHPB(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-slate-800"
              />
            </div>
          </div>

          {/* BAPB */}
          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
            <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
              <span>Penerimaan Barang (BAPB)</span>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Nomor BAPB</label>
              <input
                type="text"
                value={nomorBAPB}
                onChange={(e) => setNomorBAPB(e.target.value)}
                placeholder="001/BAPB/..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Tanggal BAPB</label>
              <input
                type="date"
                value={tanggalBAPB}
                onChange={(e) => setTanggalBAPB(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 3: Tabel Detail Barang & Perhitungan Pajak (Section 8 & 9) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
              <span>3. Detail Rincian Barang Belanja (Tabel Dinamis)</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Harga barang adalah <strong>HARGA FINAL</strong>. Pajak dihitung dari DPP sesuai ketentuan Pemerintah RI dan tidak menambah total transaksi.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick bulk apply tax to all rows */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Terapkan ke semua:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyTaxToAll(e.target.value as TaxType);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-800 font-medium cursor-pointer focus:outline-hidden"
              >
                <option value="" disabled>Pilih Opsi Pajak...</option>
                <option value="NON">Tanpa Pajak</option>
                <option value="PPN_11">PPN 11%</option>
                <option value="PPH23_4">PPh 23 4% (Non-NPWP)</option>
                <option value="PPH23_3">PPh 23 3%</option>
                <optgroup label="PPh 23 + PPN">
                  <option value="PPH23_3_PPN">PPh 23 3% + PPN 11%</option>
                  <option value="PPH23_4_PPN">PPh 23 4% + PPN 11%</option>
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowTaxGuide(prev => !prev)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Panduan Ketentuan Pajak RI"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Info Pajak RI</span>
              {showTaxGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Baris</span>
            </button>
          </div>
        </div>

        {/* Collapsible Tax Guidance Banner */}
        {showTaxGuide && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-[11px] uppercase tracking-wider">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Dasar Perhitungan Pajak Pemerintah Republik Indonesia (UU HPP & UU PPh Pasal 23)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-slate-800 block">1. Tanpa Pajak</span>
                <span className="text-slate-600">Bukan objek pajak / barang kebutuhan pokok bebas pajak. DPP = Total Nilai Belanja.</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-indigo-800 block">2. PPN 11% (UU HPP No. 7/2021)</span>
                <span className="text-slate-600">Harga final sudah termasuk PPN 11%. Rumus: <code>DPP = Harga / 1,11</code>, <code>PPN = 11% × DPP</code>.</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-amber-800 block">3. PPh 23 4% (Non-NPWP)</span>
                <span className="text-slate-600">Jasa/sewa bagi rekanan tanpa NPWP (tarif 2% dinaikkan 100% = 4%). <code>DPP = Harga</code>, <code>PPh 23 = 4% × DPP</code>.</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-amber-800 block">4. PPh 23 3%</span>
                <span className="text-slate-600">Jasa dengan ketentuan tarif khusus 3%. <code>DPP = Harga</code>, <code>PPh 23 = 3% × DPP</code>.</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-purple-800 block">5. PPh 23 (3%) + PPN (11%)</span>
                <span className="text-slate-600">Kombinasi PPN 11% & PPh 23 3%. DPP dihitung dari harga: <code>DPP = Harga / 1,11</code>, PPN = 11% × DPP, PPh 23 = 3% × DPP.</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="font-bold text-purple-800 block">6. PPh 23 (4%) + PPN (11%)</span>
                <span className="text-slate-600">Kombinasi PPN 11% & PPh 23 4% non-NPWP. <code>DPP = Harga / 1,11</code>, PPN = 11% × DPP, PPh 23 = 4% × DPP dari DPP.</span>
              </div>
            </div>
            <div className="text-[10px] text-indigo-700 italic border-t border-indigo-200/60 pt-1.5">
              * Catatan Bendahara: Total belanja tetap <strong>Volume × Harga Final</strong>. Pajak tidak menambahkan total nilai akhir belanja.
            </div>
          </div>
        )}

        {/* Dynamic Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3 min-w-[240px]">Uraian Barang / Jasa</th>
                <th className="py-2.5 px-3 w-28">Pilih Master</th>
                <th className="py-2.5 px-3 w-24">Satuan</th>
                <th className="py-2.5 px-3 w-20 text-right">Volume</th>
                <th className="py-2.5 px-3 w-32 text-right">Harga Final (Rp)</th>
                <th className="py-2.5 px-3 w-36">Status Pajak</th>
                <th className="py-2.5 px-3 w-32 text-right">Jumlah Total</th>
                <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2 px-3 text-center text-slate-500 font-mono">
                    {index + 1}
                  </td>

                  {/* Uraian */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      required
                      placeholder="Nama barang / jasa..."
                      value={row.uraian}
                      onChange={(e) => handleRowChange(index, 'uraian', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                    />
                  </td>

                  {/* Quick Select Master */}
                  <td className="py-2 px-3">
                    <select
                      onChange={(e) => handleSelectMasterItem(index, e.target.value)}
                      defaultValue=""
                      className="w-full px-1.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded text-slate-600"
                    >
                      <option value="" disabled>
                        Pilih Master...
                      </option>
                      {itemsMaster.map(im => (
                        <option key={im.id} value={im.id}>
                          {im.namaBarang}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Satuan */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      required
                      placeholder="Satuan"
                      value={row.satuan}
                      onChange={(e) => handleRowChange(index, 'satuan', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800"
                    />
                  </td>

                  {/* Volume */}
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={row.volume}
                      onChange={(e) => handleRowChange(index, 'volume', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-right font-mono text-slate-900"
                    />
                  </td>

                  {/* Harga Final */}
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      required
                      value={row.harga}
                      onChange={(e) => handleRowChange(index, 'harga', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-right font-mono text-slate-900 font-semibold"
                    />
                  </td>

                  {/* Status Pajak */}
                  <td className="py-2 px-3">
                    <select
                      value={row.pajak}
                      onChange={(e) => handleRowChange(index, 'pajak', e.target.value as TaxType)}
                      className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="NON">Tanpa Pajak</option>
                      <option value="PPN_11">PPN 11%</option>
                      <option value="PPH23_4">PPh 23 4% (Non-NPWP)</option>
                      <option value="PPH23_3">PPh 23 3%</option>
                      <optgroup label="PPh 23 + PPN (Pilih Tarif PPh 23)">
                        <option value="PPH23_3_PPN">PPh 23 (3%) + PPN 11%</option>
                        <option value="PPH23_4_PPN">PPh 23 (4%) + PPN 11%</option>
                      </optgroup>
                    </select>

                    {/* Breakdown Helper Badges */}
                    {row.pajak === 'NON' && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        DPP: {formatRupiah(row.dpp)} · Bebas Pajak
                      </div>
                    )}
                    {row.pajak === 'PPN_11' && (
                      <div className="text-[10px] text-indigo-600 mt-0.5 font-medium">
                        DPP: {formatRupiah(row.dpp)} · PPN 11%: {formatRupiah(row.ppn)}
                      </div>
                    )}
                    {row.pajak === 'PPH23_4' && (
                      <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                        DPP: {formatRupiah(row.dpp)} · PPh 23 (4%): {formatRupiah(row.pph23)}
                      </div>
                    )}
                    {row.pajak === 'PPH23_3' && (
                      <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                        DPP: {formatRupiah(row.dpp)} · PPh 23 (3%): {formatRupiah(row.pph23)}
                      </div>
                    )}
                    {row.pajak === 'PPH23_3_PPN' && (
                      <div className="text-[10px] text-purple-700 mt-0.5 font-medium">
                        DPP: {formatRupiah(row.dpp)} · PPN 11%: {formatRupiah(row.ppn)} · PPh 23 (3%): {formatRupiah(row.pph23)}
                      </div>
                    )}
                    {(row.pajak === 'PPH23_4_PPN' || row.pajak === 'PPH23_PPN') && (
                      <div className="text-[10px] text-purple-700 mt-0.5 font-medium">
                        DPP: {formatRupiah(row.dpp)} · PPN 11%: {formatRupiah(row.ppn)} · PPh 23 (4%): {formatRupiah(row.pph23)}
                      </div>
                    )}
                  </td>

                  {/* Jumlah (Volume * Harga) */}
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatRupiah(row.jumlah)}
                  </td>

                  {/* Delete Button */}
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Hapus Baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Card (Strict Section 9 Adherence & Government Regulations) */}
        <div className="mt-4 p-5 bg-slate-900 text-white rounded-xl shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
              Total Nilai Belanja (Volume × Harga Final)
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight mt-1 text-white tabular-nums">
              {formatRupiah(summary.totalTransaksi)}
            </div>
            <div className="text-xs text-slate-300 mt-1 italic">
              "Terbilang: {terbilangRupiah(summary.totalTransaksi)}"
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6 space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Status Pengenaan Pajak:</span>
              <span className="font-semibold text-white">{summary.statusPajakSummary}</span>
            </div>
            <div className="flex justify-between">
              <span>Dasar Pengenaan Pajak (DPP):</span>
              <span className="font-mono text-white tabular-nums">{formatRupiah(summary.totalDPP)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t border-slate-800 text-white">
              <span>Pajak (PPN & PPh 23):</span>
              <span className="font-mono text-emerald-400 tabular-nums">{formatRupiah(summary.totalPajak)}</span>
            </div>
            {(summary.totalPPN > 0 || summary.totalPPh23 > 0) && (
              <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                <span>Rincian Komponen:</span>
                <span className="font-mono">
                  {summary.totalPPN > 0 && `PPN: ${formatRupiah(summary.totalPPN)}`}
                  {summary.totalPPN > 0 && summary.totalPPh23 > 0 && ' · '}
                  {summary.totalPPh23 > 0 && `PPh 23: ${formatRupiah(summary.totalPPh23)}`}
                </span>
              </div>
            )}
            <div className="text-[10px] text-slate-400 pt-1">
              * Ketentuan Pemerintah: Pajak dihitung dari DPP dan tidak menambahkan total nilai akhir belanja.
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 4: Catatan & Status */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pengadaan / Peruntukan
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Belanja alat tulis dan perlengkapan ujian semester ganjil tahun 2026..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Transaksi
            </label>
            <select
              value={statusTrx}
              onChange={(e) => setStatusTrx(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
            >
              <option value="Selesai">Selesai (Siap Cetak Dokumen)</option>
              <option value="Draf">Draf (Masih dalam proses)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi Belanja'}</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <FileText className="w-4 h-4" />
            <span>Simpan & Buka Dokumen Berita Acara</span>
          </button>
        </div>
      </div>
    </div>
  );
};
