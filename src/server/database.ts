import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSchema, User, Store, ExpenseType, ItemMaster, Transaction, SchoolProfile, SchoolLetterhead, DocumentSequenceConfig, AuditLog } from '../types/index.ts';
import { getInitialSeedData } from '../utils/seedData';
import { generateDocumentNumber } from '../utils/numbering';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'school_database.json');

function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = getInitialSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

export function readDB(): DatabaseSchema {
  ensureDbFile();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    console.error('Error reading database file, repairing with seed:', err);
    const seed = getInitialSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

export function writeDB(db: DatabaseSchema): void {
  ensureDbFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function recordAuditLog(user: string, aktivitas: string, idData: string, keterangan: string): void {
  const db = readDB();
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user: user || 'admin',
    aktivitas,
    waktu: new Date().toISOString(),
    idData,
    keterangan,
  };
  db.audit_logs.unshift(log);
  if (db.audit_logs.length > 500) {
    db.audit_logs = db.audit_logs.slice(0, 500);
  }
  writeDB(db);
}

export function hashWithSalt(password: string, salt: string): string {
  return crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

export function verifyLogin(username: string, passwordPlain: string): { success: boolean; user?: User; error?: string } {
  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return { success: false, error: 'Username atau password salah!' };
  }
  const calcHash = hashWithSalt(passwordPlain, user.salt);
  if (calcHash !== user.passwordHash) {
    return { success: false, error: 'Username atau password salah!' };
  }
  return { success: true, user };
}

export function updateCredentials(
  userId: string,
  currentPassword: string,
  newUsername?: string,
  newPassword?: string
): { success: boolean; error?: string; updatedUser?: User } {
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return { success: false, error: 'User tidak ditemukan' };
  }
  const user = db.users[userIndex];
  const curHash = hashWithSalt(currentPassword, user.salt);
  if (curHash !== user.passwordHash) {
    return { success: false, error: 'Password saat ini tidak sesuai' };
  }

  if (newUsername && newUsername.trim() !== '') {
    const existing = db.users.find(u => u.username.toLowerCase() === newUsername.trim().toLowerCase() && u.id !== userId);
    if (existing) {
      return { success: false, error: 'Username baru sudah digunakan' };
    }
    user.username = newUsername.trim();
  }

  if (newPassword && newPassword.trim() !== '') {
    if (newPassword.length < 5) {
      return { success: false, error: 'Password minimal 5 karakter' };
    }
    const newSalt = crypto.randomBytes(16).toString('hex');
    user.salt = newSalt;
    user.passwordHash = hashWithSalt(newPassword, newSalt);
  }

  user.updatedAt = new Date().toISOString();
  db.users[userIndex] = user;
  writeDB(db);
  recordAuditLog(user.username, 'Ubah Kredensial Akun', user.id, 'Username atau password akun berhasil diperbarui');
  return { success: true, updatedUser: user };
}

// Next sequence generator
export function getAndIncrementSequences(dateStr?: string): {
  nomorSP: string;
  nomorBAST: string;
  nomorBAHPB: string;
  nomorBAPB: string;
} {
  const db = readDB();
  const seq = db.document_sequences;
  const currentYear = new Date(dateStr || Date.now()).getFullYear();

  // Reset check if year changed
  if (seq.tahun !== currentYear) {
    seq.tahun = currentYear;
    seq.nextSeqSP = 1;
    seq.nextSeqBAST = 1;
    seq.nextSeqBAHPB = 1;
    seq.nextSeqBAPB = 1;
  }

  const nomorSP = generateDocumentNumber(seq.formatSP, seq.nextSeqSP, 'SP', seq.kodeSekolah, dateStr);
  const nomorBAST = generateDocumentNumber(seq.formatBAST, seq.nextSeqBAST, 'BAST', seq.kodeSekolah, dateStr);
  const nomorBAHPB = generateDocumentNumber(seq.formatBAHPB, seq.nextSeqBAHPB, 'BAHPB', seq.kodeSekolah, dateStr);
  const nomorBAPB = generateDocumentNumber(seq.formatBAPB, seq.nextSeqBAPB, 'BAPB', seq.kodeSekolah, dateStr);

  seq.nextSeqSP += 1;
  seq.nextSeqBAST += 1;
  seq.nextSeqBAHPB += 1;
  seq.nextSeqBAPB += 1;
  seq.updatedAt = new Date().toISOString();

  writeDB(db);
  return { nomorSP, nomorBAST, nomorBAHPB, nomorBAPB };
}
