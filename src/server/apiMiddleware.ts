import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  readDB,
  writeDB,
  verifyLogin,
  updateCredentials,
  recordAuditLog,
  getAndIncrementSequences,
  markAsDeleted,
  unmarkDeleted,
} from './database.ts';
import { getInitialSeedData } from '../utils/seedData.ts';
import { Store, ExpenseType, ItemMaster, Transaction } from '../types/index.ts';

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse, next?: () => void) {
  const rawUrl = req.url || '';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  let pathname = parsedUrl.pathname;
  if (!pathname.startsWith('/api')) {
    pathname = `/api${pathname.startsWith('/') ? '' : '/'}${pathname}`;
  }

  // Only handle if it's an API route or if next isn't provided
  if (!rawUrl.startsWith('/api') && next && !rawUrl.startsWith('/api/')) {
    // Check if it's an API route mounted by express router
  }

  const method = req.method || 'GET';

  try {
    // 1. AUTH ROUTES
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = await parseJsonBody(req);
      if (!username || !password) {
        return sendJson(res, 400, { success: false, error: 'Username dan password wajib diisi' });
      }
      const result = verifyLogin(username, password);
      if (!result.success || !result.user) {
        return sendJson(res, 401, { success: false, error: result.error || 'Autentikasi gagal' });
      }
      const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      recordAuditLog(result.user.username, 'Login Pengguna', result.user.id, `User ${result.user.username} berhasil login`);
      return sendJson(res, 200, {
        success: true,
        token,
        user: {
          id: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          role: result.user.role,
        },
      });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const { username } = await parseJsonBody(req);
      if (username) {
        recordAuditLog(username, 'Logout Pengguna', username, `User ${username} logout dari sistem`);
      }
      return sendJson(res, 200, { success: true });
    }

    if (pathname === '/api/auth/change-credentials' && method === 'POST') {
      const { userId, currentPassword, newUsername, newPassword, currentUser } = await parseJsonBody(req);
      const result = updateCredentials(userId, currentPassword, newUsername, newPassword);
      if (!result.success) {
        return sendJson(res, 400, { success: false, error: result.error });
      }
      return sendJson(res, 200, {
        success: true,
        user: {
          id: result.updatedUser!.id,
          username: result.updatedUser!.username,
          fullName: result.updatedUser!.fullName,
          role: result.updatedUser!.role,
        },
      });
    }

    // 2. SCHOOL PROFILE & KOP SURAT
    if (pathname === '/api/school/profile') {
      const db = readDB();
      if (method === 'GET') {
        return sendJson(res, 200, db.school_profile);
      }
      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        db.school_profile = { ...db.school_profile, ...body, updatedAt: new Date().toISOString() };
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Ubah Profil Sekolah', 'PROFIL', `Profil sekolah diperbarui: ${db.school_profile.namaSekolah}`);
        return sendJson(res, 200, db.school_profile);
      }
    }

    if (pathname === '/api/school/letterhead') {
      const db = readDB();
      if (method === 'GET') {
        return sendJson(res, 200, db.school_letterhead);
      }
      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        db.school_letterhead = { ...db.school_letterhead, ...body, updatedAt: new Date().toISOString() };
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Ubah Kop Surat', 'LETTERHEAD', 'Format kop surat resmi diperbarui');
        return sendJson(res, 200, db.school_letterhead);
      }
    }

    // 3. DATA MASTER TOKO / CV
    if (pathname === '/api/stores') {
      const db = readDB();
      if (method === 'GET') {
        return sendJson(res, 200, db.stores);
      }
      if (method === 'POST') {
        const body = await parseJsonBody(req);
        const storeId = body.id || `store-${Date.now()}`;
        unmarkDeleted(storeId);
        const newStore: Store = {
          id: storeId,
          nomorUrut: (db.stores.length > 0 ? Math.max(...db.stores.map(s => s.nomorUrut || 0)) : 0) + 1,
          namaPemilik: body.namaPemilik || '',
          namaToko: body.namaToko || '',
          alamatToko: body.alamatToko || '',
          nomorTelepon: body.nomorTelepon || '',
          keterangan: body.keterangan || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.stores.push(newStore);
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Tambah Data Toko', newStore.id, `Toko ${newStore.namaToko} ditambahkan`);
        return sendJson(res, 201, newStore);
      }
    }

    if (pathname.startsWith('/api/stores/')) {
      const storeId = pathname.replace('/api/stores/', '');
      const db = readDB();
      const idx = db.stores.findIndex(s => s.id === storeId);

      if (method === 'DELETE') {
        markAsDeleted(storeId);
        if (idx !== -1) {
          const deleted = db.stores[idx];
          recordAuditLog('admin', 'Hapus Data Toko', storeId, `Toko ${deleted.namaToko} dihapus dari master`);
        }
        return sendJson(res, 200, { success: true });
      }

      if (idx === -1) return sendJson(res, 404, { error: 'Toko tidak ditemukan' });

      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        unmarkDeleted(storeId);
        db.stores[idx] = { ...db.stores[idx], ...body, updatedAt: new Date().toISOString() };
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Ubah Data Toko', storeId, `Data toko ${db.stores[idx].namaToko} diubah`);
        return sendJson(res, 200, db.stores[idx]);
      }
    }

    // 4. JENIS BELANJA
    if (pathname === '/api/expense-types') {
      const db = readDB();
      if (method === 'GET') {
        return sendJson(res, 200, db.expense_types);
      }
      if (method === 'POST') {
        const body = await parseJsonBody(req);
        const expId = body.id || `exp-${Date.now()}`;
        unmarkDeleted(expId);
        const newExp: ExpenseType = {
          id: expId,
          namaJenisBelanja: body.namaJenisBelanja || '',
          keterangan: body.keterangan || '',
          statusAktif: body.statusAktif ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.expense_types.push(newExp);
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Tambah Jenis Belanja', newExp.id, `Jenis belanja ${newExp.namaJenisBelanja} ditambahkan`);
        return sendJson(res, 201, newExp);
      }
    }

    if (pathname.startsWith('/api/expense-types/')) {
      const expId = pathname.replace('/api/expense-types/', '');
      const db = readDB();
      const idx = db.expense_types.findIndex(e => e.id === expId);

      if (method === 'DELETE') {
        markAsDeleted(expId);
        if (idx !== -1) {
          const deleted = db.expense_types[idx];
          recordAuditLog('admin', 'Hapus Jenis Belanja', expId, `Jenis belanja ${deleted.namaJenisBelanja} dihapus`);
        }
        return sendJson(res, 200, { success: true });
      }

      if (idx === -1) return sendJson(res, 404, { error: 'Jenis belanja tidak ditemukan' });

      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        unmarkDeleted(expId);
        db.expense_types[idx] = { ...db.expense_types[idx], ...body, updatedAt: new Date().toISOString() };
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Ubah Jenis Belanja', expId, `Jenis belanja ${db.expense_types[idx].namaJenisBelanja} diubah`);
        return sendJson(res, 200, db.expense_types[idx]);
      }
    }

    // 5. DATA MASTER BARANG
    if (pathname === '/api/items') {
      const db = readDB();
      if (method === 'GET') {
        return sendJson(res, 200, db.items);
      }
      if (method === 'POST') {
        const body = await parseJsonBody(req);
        const itemId = body.id || `itm-${Date.now()}`;
        unmarkDeleted(itemId);
        const newItem: ItemMaster = {
          id: itemId,
          kodeBarang: body.kodeBarang || `BRG-${Date.now().toString().slice(-4)}`,
          namaBarang: body.namaBarang || '',
          satuan: body.satuan || 'Buah',
          kategori: body.kategori || 'Umum',
          hargaDefault: Number(body.hargaDefault) || 0,
          statusAktif: body.statusAktif ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.items.push(newItem);
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Tambah Master Barang', newItem.id, `Barang ${newItem.namaBarang} (${newItem.kodeBarang}) ditambahkan`);
        return sendJson(res, 201, newItem);
      }
    }

    if (pathname.startsWith('/api/items/')) {
      const itmId = pathname.replace('/api/items/', '');
      const db = readDB();
      const idx = db.items.findIndex(i => i.id === itmId);

      if (method === 'DELETE') {
        markAsDeleted(itmId);
        if (idx !== -1) {
          const deleted = db.items[idx];
          recordAuditLog('admin', 'Hapus Master Barang', itmId, `Barang ${deleted.namaBarang} dihapus`);
        }
        return sendJson(res, 200, { success: true });
      }

      if (idx === -1) return sendJson(res, 404, { error: 'Barang tidak ditemukan' });

      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        unmarkDeleted(itmId);
        db.items[idx] = { ...db.items[idx], ...body, updatedAt: new Date().toISOString() };
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Ubah Master Barang', itmId, `Barang ${db.items[idx].namaBarang} diubah`);
        return sendJson(res, 200, db.items[idx]);
      }
    }

    // 6. TRANSAKSI BELANJA
    if (pathname === '/api/transactions') {
      const db = readDB();
      if (method === 'GET') {
        return sendJson(res, 200, db.transactions);
      }
      if (method === 'POST') {
        const body = await parseJsonBody(req);
        
        // Find monotonic sequence number strictly across existing transactions with TRX- pattern
        let maxSeq = 0;
        for (const t of db.transactions) {
          if (t.nomorUrut && t.nomorUrut > maxSeq && t.nomorUrut < 1000000) maxSeq = t.nomorUrut;
          const match = t.id?.match(/^TRX-\d+-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq && num < 1000000) maxSeq = num;
          }
        }
        if (db.deleted_ids && Array.isArray(db.deleted_ids)) {
          for (const delId of db.deleted_ids) {
            const match = delId?.match(/^TRX-\d+-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxSeq && num < 1000000) maxSeq = num;
            }
          }
        }
        if (db.document_sequences?.nextSeqSP && (db.document_sequences.nextSeqSP - 1) > maxSeq && (db.document_sequences.nextSeqSP - 1) < 1000000) {
          maxSeq = Math.max(maxSeq, db.document_sequences.nextSeqSP - 1);
        }
        const nextNum = Math.max(maxSeq, db.transactions.length) + 1;
        const currentYear = new Date().getFullYear();
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        const trxId = body.id || `TRX-${currentYear}${currentMonth}-${String(nextNum).padStart(4, '0')}`;

        // Ensure this ID is clean from deleted_ids
        unmarkDeleted(trxId);
        
        const newTrx: Transaction = {
          id: trxId,
          nomorUrut: body.nomorUrut || nextNum,
          tanggalTransaksi: body.tanggalTransaksi || new Date().toISOString().split('T')[0],
          storeId: body.storeId || '',
          storeNama: body.storeNama || '',
          storePemilik: body.storePemilik || '',
          storeAlamat: body.storeAlamat || '',
          storeTelepon: body.storeTelepon || '',
          expenseTypeId: body.expenseTypeId || '',
          expenseTypeName: body.expenseTypeName || '',
          nomorSP: body.nomorSP || '',
          tanggalSP: body.tanggalSP || body.tanggalTransaksi,
          nomorBAST: body.nomorBAST || '',
          tanggalBAST: body.tanggalBAST || body.tanggalTransaksi,
          nomorBAHPB: body.nomorBAHPB || '',
          tanggalBAHPB: body.tanggalBAHPB || body.tanggalTransaksi,
          nomorBAPB: body.nomorBAPB || '',
          tanggalBAPB: body.tanggalBAPB || body.tanggalTransaksi,
          items: body.items || [],
          totalTransaksi: Number(body.totalTransaksi) || 0,
          totalDPP: Number(body.totalDPP) || 0,
          totalPPN: Number(body.totalPPN) || 0,
          totalPPh23: Number(body.totalPPh23) || 0,
          totalPajak: Number(body.totalPajak) || 0,
          statusPajakSummary: body.statusPajakSummary || 'Tanpa Pajak',
          userPembuat: body.userPembuat || 'admin',
          timestamp: new Date().toISOString(),
          status: body.status || 'Selesai',
          catatan: body.catatan || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        db.transactions = [newTrx, ...db.transactions.filter(t => t.id !== trxId)];
        writeDB(db);
        recordAuditLog(newTrx.userPembuat, 'Membuat Transaksi', newTrx.id, `Transaksi belanja #${newTrx.nomorUrut} (${newTrx.storeNama}) senilai Rp ${newTrx.totalTransaksi.toLocaleString('id-ID')} disimpan`);
        return sendJson(res, 201, newTrx);
      }
    }

    if (pathname.startsWith('/api/transactions/')) {
      const remaining = pathname.replace('/api/transactions/', '');
      const db = readDB();

      if (remaining.endsWith('/duplicate') && method === 'POST') {
        const trxId = remaining.replace('/duplicate', '');
        const existing = db.transactions.find(t => t.id === trxId);
        if (!existing) return sendJson(res, 404, { error: 'Transaksi tidak ditemukan' });

        let maxSeq = 0;
        for (const t of db.transactions) {
          if (t.nomorUrut && t.nomorUrut > maxSeq && t.nomorUrut < 1000000) maxSeq = t.nomorUrut;
          const match = t.id?.match(/^TRX-\d+-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq && num < 1000000) maxSeq = num;
          }
        }
        if (db.deleted_ids && Array.isArray(db.deleted_ids)) {
          for (const delId of db.deleted_ids) {
            const match = delId?.match(/^TRX-\d+-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxSeq && num < 1000000) maxSeq = num;
            }
          }
        }
        const nextNum = Math.max(maxSeq, db.transactions.length) + 1;
        const newTrxId = `TRX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(nextNum).padStart(4, '0')}`;
        unmarkDeleted(newTrxId);

        const copy: Transaction = {
          ...existing,
          id: newTrxId,
          nomorUrut: nextNum,
          tanggalTransaksi: new Date().toISOString().split('T')[0],
          tanggalSP: new Date().toISOString().split('T')[0],
          tanggalBAST: new Date().toISOString().split('T')[0],
          tanggalBAHPB: new Date().toISOString().split('T')[0],
          tanggalBAPB: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          catatan: `(Duplikasi dari ${existing.id}) ${existing.catatan || ''}`.trim(),
        };
        db.transactions = [copy, ...db.transactions.filter(t => t.id !== newTrxId)];
        writeDB(db);
        recordAuditLog('admin', 'Duplikasi Transaksi', newTrxId, `Menduplikasi transaksi ${existing.id} menjadi ${newTrxId}`);
        return sendJson(res, 201, copy);
      }

      const trxId = remaining;

      if (method === 'DELETE') {
        const deleted = db.transactions.find(t => t.id === trxId);
        markAsDeleted(trxId);
        if (deleted) {
          recordAuditLog('admin', 'Hapus Transaksi', trxId, `Transaksi ${trxId} bernilai Rp ${deleted.totalTransaksi.toLocaleString('id-ID')} dihapus`);
        }
        return sendJson(res, 200, { success: true });
      }

      const idx = db.transactions.findIndex(t => t.id === trxId);
      if (idx === -1) return sendJson(res, 404, { error: 'Transaksi tidak ditemukan' });

      if (method === 'GET') {
        return sendJson(res, 200, db.transactions[idx]);
      }

      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        unmarkDeleted(trxId);
        db.transactions[idx] = {
          ...db.transactions[idx],
          ...body,
          updatedAt: new Date().toISOString(),
        };
        writeDB(db);
        recordAuditLog(body.operator || 'admin', 'Ubah Transaksi', trxId, `Transaksi ${trxId} (${db.transactions[idx].storeNama}) diperbarui`);
        return sendJson(res, 200, db.transactions[idx]);
      }
    }

    // 7. DOKUMEN SEQUENCES
    if (pathname === '/api/sequences') {
      const db = readDB();
      if (method === 'GET') {
        return sendJson(res, 200, db.document_sequences);
      }
      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        db.document_sequences = { ...db.document_sequences, ...body, updatedAt: new Date().toISOString() };
        writeDB(db);
        recordAuditLog('admin', 'Ubah Pengaturan Penomoran', 'SEQ', 'Format penomoran dokumen diubah');
        return sendJson(res, 200, db.document_sequences);
      }
    }

    if (pathname === '/api/sequences/generate-numbers' && method === 'POST') {
      const body = await parseJsonBody(req);
      const generated = getAndIncrementSequences(body.date);
      return sendJson(res, 200, generated);
    }

    // 8. AUDIT LOGS
    if (pathname === '/api/audit-logs' && method === 'GET') {
      const db = readDB();
      return sendJson(res, 200, db.audit_logs);
    }

    // 9. BACKUP & RESTORE
    if (pathname === '/api/backup/export' && method === 'GET') {
      const db = readDB();
      res.setHeader('Content-Disposition', `attachment; filename="backup_administrasi_sekolah_${new Date().toISOString().split('T')[0]}.json"`);
      return sendJson(res, 200, db);
    }

    if (pathname === '/api/backup/restore' && method === 'POST') {
      const newDb = await parseJsonBody(req);
      if (!newDb || !Array.isArray(newDb.stores) || !Array.isArray(newDb.transactions) || !newDb.school_profile) {
        return sendJson(res, 400, { success: false, error: 'Format data backup tidak valid' });
      }
      writeDB(newDb);
      recordAuditLog('admin', 'Restore Database', 'BACKUP', 'Database berhasil dipulihkan dari cadangan eksternal');
      return sendJson(res, 200, { success: true, message: 'Database berhasil dipulihkan' });
    }

    if (pathname === '/api/backup/reset' && method === 'POST') {
      const seed = getInitialSeedData();
      writeDB(seed);
      recordAuditLog('admin', 'Reset Database', 'RESET', 'Database dikembalikan ke pengaturan awal SD NEGERI KALIBOTO KIDUL 05');
      return sendJson(res, 200, { success: true, message: 'Database berhasil direset ke setelan awal' });
    }

    return sendJson(res, 404, { error: `Endpoint API ${pathname} tidak ditemukan` });
  } catch (err: any) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
}
