import {
  SchoolProfile,
  SchoolLetterhead,
  Store,
  ExpenseType,
  ItemMaster,
  Transaction,
  DocumentSequenceConfig,
  AuditLog,
} from '../types';

const BASE_URL = '/api';

const DELETED_IDS_KEY = 'school_db_deleted_ids';
const LOCAL_TRX_KEY = 'school_db_transactions';
const LOCAL_STORES_KEY = 'school_db_stores';
const LOCAL_ITEMS_KEY = 'school_db_items';
const LOCAL_EXP_KEY = 'school_db_expense_types';

function getDeletedIds(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DELETED_IDS_KEY) : null;
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addDeletedId(id: string): void {
  try {
    if (typeof window === 'undefined') return;
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function removeDeletedId(id: string): void {
  try {
    if (typeof window === 'undefined') return;
    const set = getDeletedIds();
    set.delete(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function getLocalData<T>(key: string): T[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; token: string; user: any }> {
    return fetchJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(username?: string): Promise<{ success: boolean }> {
    return fetchJson(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async changeCredentials(
    userId: string,
    currentPassword: string,
    newUsername?: string,
    newPassword?: string,
    currentUser?: string
  ): Promise<{ success: boolean; user: any }> {
    return fetchJson(`${BASE_URL}/auth/change-credentials`, {
      method: 'POST',
      body: JSON.stringify({ userId, currentPassword, newUsername, newPassword, currentUser }),
    });
  },

  // School Profile & Kop Surat
  async getSchoolProfile(): Promise<SchoolProfile> {
    return fetchJson(`${BASE_URL}/school/profile`);
  },

  async updateSchoolProfile(profile: Partial<SchoolProfile> & { operator?: string }): Promise<SchoolProfile> {
    return fetchJson(`${BASE_URL}/school/profile`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  async getSchoolLetterhead(): Promise<SchoolLetterhead> {
    return fetchJson(`${BASE_URL}/school/letterhead`);
  },

  async updateSchoolLetterhead(letterhead: Partial<SchoolLetterhead> & { operator?: string }): Promise<SchoolLetterhead> {
    return fetchJson(`${BASE_URL}/school/letterhead`, {
      method: 'PUT',
      body: JSON.stringify(letterhead),
    });
  },

  // Stores
  async getStores(): Promise<Store[]> {
    const deletedSet = getDeletedIds();
    const local = (getLocalData<Store>(LOCAL_STORES_KEY) || []).filter(s => !deletedSet.has(s.id));
    try {
      const serverData = await fetchJson<Store[]>(`${BASE_URL}/stores`);
      if (Array.isArray(serverData)) {
        const filteredServer = serverData.filter(s => !deletedSet.has(s.id));
        const serverIds = new Set(filteredServer.map(s => s.id));
        const merged = [...filteredServer, ...local.filter(s => !serverIds.has(s.id))];
        setLocalData(LOCAL_STORES_KEY, merged);
        return merged;
      }
    } catch (err) {
      console.warn('Gagal ambil data toko dari server, menggunakan cache lokal:', err);
    }
    return local;
  },

  async createStore(store: Partial<Store> & { operator?: string }): Promise<Store> {
    const local = getLocalData<Store>(LOCAL_STORES_KEY) || [];
    try {
      const res = await fetchJson<Store>(`${BASE_URL}/stores`, {
        method: 'POST',
        body: JSON.stringify(store),
      });
      if (res?.id) {
        removeDeletedId(res.id);
        const updated = [...local.filter(s => s.id !== res.id), res];
        setLocalData(LOCAL_STORES_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server createStore failed, saving locally:', err);
    }
    const fallbackId = store.id || `store-${Date.now()}`;
    removeDeletedId(fallbackId);
    const fallback: Store = {
      ...(store as Store),
      id: fallbackId,
      nomorUrut: (local.length > 0 ? Math.max(...local.map(s => s.nomorUrut || 0)) : 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...local.filter(s => s.id !== fallbackId), fallback];
    setLocalData(LOCAL_STORES_KEY, updated);
    return fallback;
  },

  async updateStore(id: string, store: Partial<Store> & { operator?: string }): Promise<Store> {
    removeDeletedId(id);
    const local = getLocalData<Store>(LOCAL_STORES_KEY) || [];
    try {
      const res = await fetchJson<Store>(`${BASE_URL}/stores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(store),
      });
      if (res?.id) {
        const updated = local.map(s => (s.id === id ? res : s));
        setLocalData(LOCAL_STORES_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server updateStore failed, updating locally:', err);
    }
    const updated = local.map(s => (s.id === id ? { ...s, ...store, updatedAt: new Date().toISOString() } : s));
    setLocalData(LOCAL_STORES_KEY, updated);
    return updated.find(s => s.id === id) as Store;
  },

  async deleteStore(id: string): Promise<{ success: boolean }> {
    addDeletedId(id);
    const local = getLocalData<Store>(LOCAL_STORES_KEY) || [];
    setLocalData(LOCAL_STORES_KEY, local.filter(s => s.id !== id));
    try {
      await fetchJson(`${BASE_URL}/stores/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Server deleteStore failed, deleted locally:', err);
    }
    return { success: true };
  },

  // Expense Types
  async getExpenseTypes(): Promise<ExpenseType[]> {
    const deletedSet = getDeletedIds();
    const local = (getLocalData<ExpenseType>(LOCAL_EXP_KEY) || []).filter(e => !deletedSet.has(e.id));
    try {
      const serverData = await fetchJson<ExpenseType[]>(`${BASE_URL}/expense-types`);
      if (Array.isArray(serverData)) {
        const filteredServer = serverData.filter(e => !deletedSet.has(e.id));
        const serverIds = new Set(filteredServer.map(e => e.id));
        const merged = [...filteredServer, ...local.filter(e => !serverIds.has(e.id))];
        setLocalData(LOCAL_EXP_KEY, merged);
        return merged;
      }
    } catch (err) {
      console.warn('Gagal ambil jenis belanja dari server, menggunakan cache lokal:', err);
    }
    return local;
  },

  async createExpenseType(exp: Partial<ExpenseType> & { operator?: string }): Promise<ExpenseType> {
    const local = getLocalData<ExpenseType>(LOCAL_EXP_KEY) || [];
    try {
      const res = await fetchJson<ExpenseType>(`${BASE_URL}/expense-types`, {
        method: 'POST',
        body: JSON.stringify(exp),
      });
      if (res?.id) {
        removeDeletedId(res.id);
        const updated = [...local.filter(e => e.id !== res.id), res];
        setLocalData(LOCAL_EXP_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server createExpenseType failed, saving locally:', err);
    }
    const fallbackId = exp.id || `exp-${Date.now()}`;
    removeDeletedId(fallbackId);
    const fallback: ExpenseType = {
      ...(exp as ExpenseType),
      id: fallbackId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...local.filter(e => e.id !== fallbackId), fallback];
    setLocalData(LOCAL_EXP_KEY, updated);
    return fallback;
  },

  async updateExpenseType(id: string, exp: Partial<ExpenseType> & { operator?: string }): Promise<ExpenseType> {
    removeDeletedId(id);
    const local = getLocalData<ExpenseType>(LOCAL_EXP_KEY) || [];
    try {
      const res = await fetchJson<ExpenseType>(`${BASE_URL}/expense-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(exp),
      });
      if (res?.id) {
        const updated = local.map(e => (e.id === id ? res : e));
        setLocalData(LOCAL_EXP_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server updateExpenseType failed, updating locally:', err);
    }
    const updated = local.map(e => (e.id === id ? { ...e, ...exp, updatedAt: new Date().toISOString() } : e));
    setLocalData(LOCAL_EXP_KEY, updated);
    return updated.find(e => e.id === id) as ExpenseType;
  },

  async deleteExpenseType(id: string): Promise<{ success: boolean }> {
    addDeletedId(id);
    const local = getLocalData<ExpenseType>(LOCAL_EXP_KEY) || [];
    setLocalData(LOCAL_EXP_KEY, local.filter(e => e.id !== id));
    try {
      await fetchJson(`${BASE_URL}/expense-types/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Server deleteExpenseType failed, deleted locally:', err);
    }
    return { success: true };
  },

  // Items
  async getItems(): Promise<ItemMaster[]> {
    const deletedSet = getDeletedIds();
    const local = (getLocalData<ItemMaster>(LOCAL_ITEMS_KEY) || []).filter(i => !deletedSet.has(i.id));
    try {
      const serverData = await fetchJson<ItemMaster[]>(`${BASE_URL}/items`);
      if (Array.isArray(serverData)) {
        const filteredServer = serverData.filter(i => !deletedSet.has(i.id));
        const serverIds = new Set(filteredServer.map(i => i.id));
        const merged = [...filteredServer, ...local.filter(i => !serverIds.has(i.id))];
        setLocalData(LOCAL_ITEMS_KEY, merged);
        return merged;
      }
    } catch (err) {
      console.warn('Gagal ambil data barang dari server, menggunakan cache lokal:', err);
    }
    return local;
  },

  async createItem(item: Partial<ItemMaster> & { operator?: string }): Promise<ItemMaster> {
    const local = getLocalData<ItemMaster>(LOCAL_ITEMS_KEY) || [];
    try {
      const res = await fetchJson<ItemMaster>(`${BASE_URL}/items`, {
        method: 'POST',
        body: JSON.stringify(item),
      });
      if (res?.id) {
        removeDeletedId(res.id);
        const updated = [...local.filter(i => i.id !== res.id), res];
        setLocalData(LOCAL_ITEMS_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server createItem failed, saving locally:', err);
    }
    const fallbackId = item.id || `itm-${Date.now()}`;
    removeDeletedId(fallbackId);
    const fallback: ItemMaster = {
      ...(item as ItemMaster),
      id: fallbackId,
      kodeBarang: item.kodeBarang || `BRG-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...local.filter(i => i.id !== fallbackId), fallback];
    setLocalData(LOCAL_ITEMS_KEY, updated);
    return fallback;
  },

  async updateItem(id: string, item: Partial<ItemMaster> & { operator?: string }): Promise<ItemMaster> {
    removeDeletedId(id);
    const local = getLocalData<ItemMaster>(LOCAL_ITEMS_KEY) || [];
    try {
      const res = await fetchJson<ItemMaster>(`${BASE_URL}/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(item),
      });
      if (res?.id) {
        const updated = local.map(i => (i.id === id ? res : i));
        setLocalData(LOCAL_ITEMS_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server updateItem failed, updating locally:', err);
    }
    const updated = local.map(i => (i.id === id ? { ...i, ...item, updatedAt: new Date().toISOString() } : i));
    setLocalData(LOCAL_ITEMS_KEY, updated);
    return updated.find(i => i.id === id) as ItemMaster;
  },

  async deleteItem(id: string): Promise<{ success: boolean }> {
    addDeletedId(id);
    const local = getLocalData<ItemMaster>(LOCAL_ITEMS_KEY) || [];
    setLocalData(LOCAL_ITEMS_KEY, local.filter(i => i.id !== id));
    try {
      await fetchJson(`${BASE_URL}/items/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Server deleteItem failed, deleted locally:', err);
    }
    return { success: true };
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const deletedSet = getDeletedIds();
    const local = (getLocalData<Transaction>(LOCAL_TRX_KEY) || []).filter(t => !deletedSet.has(t.id));
    try {
      const serverData = await fetchJson<Transaction[]>(`${BASE_URL}/transactions`);
      if (Array.isArray(serverData)) {
        const filteredServer = serverData.filter(t => !deletedSet.has(t.id));
        const serverIds = new Set(filteredServer.map(t => t.id));
        const merged = [
          ...filteredServer,
          ...local.filter(t => !serverIds.has(t.id)),
        ];
        // Sort descending by date and sequence
        merged.sort((a, b) => {
          if (b.tanggalTransaksi !== a.tanggalTransaksi) {
            return b.tanggalTransaksi.localeCompare(a.tanggalTransaksi);
          }
          return (b.nomorUrut || 0) - (a.nomorUrut || 0);
        });
        setLocalData(LOCAL_TRX_KEY, merged);
        return merged;
      }
    } catch (err) {
      console.warn('Gagal ambil transaksi dari server, menggunakan cache lokal:', err);
    }
    return local;
  },

  async getTransaction(id: string): Promise<Transaction> {
    const deletedSet = getDeletedIds();
    if (deletedSet.has(id)) {
      throw new Error('Transaksi tidak ditemukan (telah dihapus)');
    }
    try {
      const serverTrx = await fetchJson<Transaction>(`${BASE_URL}/transactions/${id}`);
      if (serverTrx) return serverTrx;
    } catch {
      // ignore
    }
    const local = getLocalData<Transaction>(LOCAL_TRX_KEY);
    const found = local?.find(t => t.id === id);
    if (found && !deletedSet.has(found.id)) return found;
    throw new Error('Transaksi tidak ditemukan');
  },

  async createTransaction(trx: Partial<Transaction>): Promise<Transaction> {
    const local = getLocalData<Transaction>(LOCAL_TRX_KEY) || [];
    try {
      const res = await fetchJson<Transaction>(`${BASE_URL}/transactions`, {
        method: 'POST',
        body: JSON.stringify(trx),
      });
      if (res?.id) {
        removeDeletedId(res.id);
        const updated = [res, ...local.filter(t => t.id !== res.id)];
        setLocalData(LOCAL_TRX_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server createTransaction failed, saving locally:', err);
    }
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const fallbackId = trx.id || `TRX-${currentYear}${currentMonth}-${String(local.length + 1).padStart(4, '0')}`;
    removeDeletedId(fallbackId);
    const fallback: Transaction = {
      ...(trx as Transaction),
      id: fallbackId,
      nomorUrut: local.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [fallback, ...local.filter(t => t.id !== fallbackId)];
    setLocalData(LOCAL_TRX_KEY, updated);
    return fallback;
  },

  async updateTransaction(id: string, trx: Partial<Transaction> & { operator?: string }): Promise<Transaction> {
    removeDeletedId(id);
    const local = getLocalData<Transaction>(LOCAL_TRX_KEY) || [];
    try {
      const res = await fetchJson<Transaction>(`${BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(trx),
      });
      if (res?.id) {
        const updated = local.map(t => (t.id === id ? res : t));
        setLocalData(LOCAL_TRX_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server updateTransaction failed, updating locally:', err);
    }
    const updated = local.map(t => (t.id === id ? { ...t, ...trx, updatedAt: new Date().toISOString() } : t));
    setLocalData(LOCAL_TRX_KEY, updated);
    return updated.find(t => t.id === id) as Transaction;
  },

  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    addDeletedId(id);
    const local = getLocalData<Transaction>(LOCAL_TRX_KEY) || [];
    setLocalData(LOCAL_TRX_KEY, local.filter(t => t.id !== id));
    try {
      await fetchJson(`${BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Server deleteTransaction failed, deleted locally:', err);
    }
    return { success: true };
  },

  async duplicateTransaction(id: string): Promise<Transaction> {
    const local = getLocalData<Transaction>(LOCAL_TRX_KEY) || [];
    try {
      const res = await fetchJson<Transaction>(`${BASE_URL}/transactions/${id}/duplicate`, {
        method: 'POST',
      });
      if (res?.id) {
        removeDeletedId(res.id);
        const updated = [res, ...local];
        setLocalData(LOCAL_TRX_KEY, updated);
        return res;
      }
    } catch (err) {
      console.warn('Server duplicateTransaction failed:', err);
    }
    const original = local.find(t => t.id === id);
    if (!original) throw new Error('Transaksi untuk diduplikasi tidak ditemukan');
    const newId = `TRX-${Date.now()}`;
    removeDeletedId(newId);
    const copy: Transaction = {
      ...original,
      id: newId,
      nomorUrut: local.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      catatan: `(Duplikasi dari ${original.id}) ${original.catatan || ''}`.trim(),
    };
    const updated = [copy, ...local];
    setLocalData(LOCAL_TRX_KEY, updated);
    return copy;
  },

  // Sequences
  async getSequences(): Promise<DocumentSequenceConfig> {
    return fetchJson(`${BASE_URL}/sequences`);
  },

  async updateSequences(seq: Partial<DocumentSequenceConfig>): Promise<DocumentSequenceConfig> {
    return fetchJson(`${BASE_URL}/sequences`, {
      method: 'PUT',
      body: JSON.stringify(seq),
    });
  },

  async generateDocNumbers(date?: string): Promise<{
    nomorSP: string;
    nomorBAST: string;
    nomorBAHPB: string;
    nomorBAPB: string;
  }> {
    return fetchJson(`${BASE_URL}/sequences/generate-numbers`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return fetchJson(`${BASE_URL}/audit-logs`);
  },

  // Backup & Restore
  async exportBackup(): Promise<any> {
    return fetchJson(`${BASE_URL}/backup/export`);
  },

  async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DELETED_IDS_KEY);
      if (Array.isArray(data.transactions)) setLocalData(LOCAL_TRX_KEY, data.transactions);
      if (Array.isArray(data.stores)) setLocalData(LOCAL_STORES_KEY, data.stores);
      if (Array.isArray(data.items)) setLocalData(LOCAL_ITEMS_KEY, data.items);
      if (Array.isArray(data.expense_types)) setLocalData(LOCAL_EXP_KEY, data.expense_types);
    }
    return fetchJson(`${BASE_URL}/backup/restore`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DELETED_IDS_KEY);
      localStorage.removeItem(LOCAL_TRX_KEY);
      localStorage.removeItem(LOCAL_STORES_KEY);
      localStorage.removeItem(LOCAL_ITEMS_KEY);
      localStorage.removeItem(LOCAL_EXP_KEY);
    }
    return fetchJson(`${BASE_URL}/backup/reset`, {
      method: 'POST',
    });
  },
};
