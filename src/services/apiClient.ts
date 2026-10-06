import {
  SchoolProfile,
  SchoolLetterhead,
  Store,
  ExpenseType,
  ItemMaster,
  Transaction,
  DocumentSequenceConfig,
  AuditLog,
  User,
} from '../types';

const BASE_URL = '/api';

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
    return fetchJson(`${BASE_URL}/stores`);
  },

  async createStore(store: Partial<Store> & { operator?: string }): Promise<Store> {
    return fetchJson(`${BASE_URL}/stores`, {
      method: 'POST',
      body: JSON.stringify(store),
    });
  },

  async updateStore(id: string, store: Partial<Store> & { operator?: string }): Promise<Store> {
    return fetchJson(`${BASE_URL}/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(store),
    });
  },

  async deleteStore(id: string): Promise<{ success: boolean }> {
    return fetchJson(`${BASE_URL}/stores/${id}`, {
      method: 'DELETE',
    });
  },

  // Expense Types
  async getExpenseTypes(): Promise<ExpenseType[]> {
    return fetchJson(`${BASE_URL}/expense-types`);
  },

  async createExpenseType(exp: Partial<ExpenseType> & { operator?: string }): Promise<ExpenseType> {
    return fetchJson(`${BASE_URL}/expense-types`, {
      method: 'POST',
      body: JSON.stringify(exp),
    });
  },

  async updateExpenseType(id: string, exp: Partial<ExpenseType> & { operator?: string }): Promise<ExpenseType> {
    return fetchJson(`${BASE_URL}/expense-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exp),
    });
  },

  async deleteExpenseType(id: string): Promise<{ success: boolean }> {
    return fetchJson(`${BASE_URL}/expense-types/${id}`, {
      method: 'DELETE',
    });
  },

  // Items
  async getItems(): Promise<ItemMaster[]> {
    return fetchJson(`${BASE_URL}/items`);
  },

  async createItem(item: Partial<ItemMaster> & { operator?: string }): Promise<ItemMaster> {
    return fetchJson(`${BASE_URL}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async updateItem(id: string, item: Partial<ItemMaster> & { operator?: string }): Promise<ItemMaster> {
    return fetchJson(`${BASE_URL}/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  async deleteItem(id: string): Promise<{ success: boolean }> {
    return fetchJson(`${BASE_URL}/items/${id}`, {
      method: 'DELETE',
    });
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return fetchJson(`${BASE_URL}/transactions`);
  },

  async getTransaction(id: string): Promise<Transaction> {
    return fetchJson(`${BASE_URL}/transactions/${id}`);
  },

  async createTransaction(trx: Partial<Transaction>): Promise<Transaction> {
    return fetchJson(`${BASE_URL}/transactions`, {
      method: 'POST',
      body: JSON.stringify(trx),
    });
  },

  async updateTransaction(id: string, trx: Partial<Transaction> & { operator?: string }): Promise<Transaction> {
    return fetchJson(`${BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trx),
    });
  },

  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    return fetchJson(`${BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  async duplicateTransaction(id: string): Promise<Transaction> {
    return fetchJson(`${BASE_URL}/transactions/${id}/duplicate`, {
      method: 'POST',
    });
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
    return fetchJson(`${BASE_URL}/backup/restore`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    return fetchJson(`${BASE_URL}/backup/reset`, {
      method: 'POST',
    });
  },
};
