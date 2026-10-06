import React, { useState } from 'react';
import { ExpenseType } from '../../types';
import { api } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';
import { Tag, Plus, Edit2, Trash2, X, Save, CheckCircle, XCircle } from 'lucide-react';

interface ExpenseTypesViewProps {
  expenseTypes: ExpenseType[];
  onRefresh: () => void;
}

export const ExpenseTypesView: React.FC<ExpenseTypesViewProps> = ({ expenseTypes, onRefresh }) => {
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<ExpenseType | null>(null);
  const [formData, setFormData] = useState({
    namaJenisBelanja: '',
    keterangan: '',
    statusAktif: true,
  });

  const [deleteTarget, setDeleteTarget] = useState<ExpenseType | null>(null);

  const handleOpenAdd = () => {
    setEditingExp(null);
    setFormData({
      namaJenisBelanja: '',
      keterangan: '',
      statusAktif: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: ExpenseType) => {
    setEditingExp(exp);
    setFormData({
      namaJenisBelanja: exp.namaJenisBelanja,
      keterangan: exp.keterangan,
      statusAktif: exp.statusAktif,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaJenisBelanja.trim()) {
      showToast('Nama jenis belanja wajib diisi', 'error');
      return;
    }

    try {
      if (editingExp) {
        await api.updateExpenseType(editingExp.id, formData);
        showToast('Jenis belanja berhasil diperbarui', 'success');
      } else {
        await api.createExpenseType(formData);
        showToast('Jenis belanja berhasil ditambahkan', 'success');
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan jenis belanja', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteExpenseType(deleteTarget.id);
      showToast(`Jenis belanja ${deleteTarget.namaJenisBelanja} dihapus`, 'success');
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus jenis belanja', 'error');
    }
  };

  const handleToggleStatus = async (exp: ExpenseType) => {
    try {
      await api.updateExpenseType(exp.id, { statusAktif: !exp.statusAktif });
      showToast(`Status "${exp.namaJenisBelanja}" diubah menjadi ${!exp.statusAktif ? 'Aktif' : 'Nonaktif'}`, 'info');
      onRefresh();
    } catch (err: any) {
      showToast('Gagal mengubah status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Data Master Jenis Belanja</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Klasifikasi pos belanja sekolah untuk pengelompokan transaksi dan rekapitulasi laporan.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jenis Belanja</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Jenis Belanja</th>
                <th className="py-3 px-4">Keterangan / Peruntukan</th>
                <th className="py-3 px-4 text-center w-28">Status</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseTypes.map((exp, idx) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-center text-slate-500 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {exp.namaJenisBelanja}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {exp.keterangan || '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(exp)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        exp.statusAktif
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {exp.statusAktif ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-400" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(exp)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingExp ? 'Edit Jenis Belanja' : 'Tambah Jenis Belanja Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jenis Belanja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Belanja Alat Tulis Kantor (ATK)"
                  value={formData.namaJenisBelanja}
                  onChange={(e) => setFormData({ ...formData, namaJenisBelanja: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Pos Anggaran
                </label>
                <textarea
                  rows={3}
                  placeholder="Rincian pos kebutuhan belanja ini..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="statusAktif"
                  checked={formData.statusAktif}
                  onChange={(e) => setFormData({ ...formData, statusAktif: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="statusAktif" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Status Aktif (dapat dipilih pada transaksi belanja)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Jenis Belanja?"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.namaJenisBelanja}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
