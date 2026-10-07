# Panduan Deploy Web App ke Vercel

Aplikasi **Sistem Administrasi Sekolah & Pengadaan Barang** ini telah dikonfigurasi penuh agar dapat dideploy langsung ke **Vercel** dengan arsitektur Fullstack (Frontend Vite + Serverless API Functions).

---

## 📁 Berkas Konfigurasi yang Telah Disediakan

1. **`vercel.json`**  
   - Menentukan framework: `vite`
   - Perintah build: `vite build`
   - Direktori output: `dist`
   - Serverless Functions API di `/api/**/*.ts` (dengan memori 1024 MB dan inklusi data `data/**`)
   - Rewrite rules untuk routing API (`/api/*`) dan Single Page Application (`index.html`)

2. **`/api/index.ts` & `/api/[...route].ts`**  
   - Serverless Function handler untuk menangani seluruh endpoint API (`/api/auth/*`, `/api/transactions/*`, `/api/school/*`, dll.) secara otomatis di infrastruktur Vercel.

3. **`data/school_database.json` & In-Memory Fallback**  
   - Dilengkapi fallback cerdas yang menyimpan data ke `/tmp` dan memori serverless Vercel, serta fitur backup/restore JSON langsung dari aplikasi.

---

## 🚀 Langkah-Langkah Deploy ke Vercel

### Opsi A: Deploy via GitHub (Paling Direkomendasikan)

1. **Push Proyek ke Repository GitHub Anda:**
   ```bash
   git add .
   git commit -m "Siap deploy ke Vercel"
   git push origin main
   ```

2. **Buka Dashboard Vercel:**
   - Kunjungi [vercel.com](https://vercel.com) dan login/daftar akun.
   - Klik tombol **"Add New..."** -> **"Project"**.
   - Pilih repository GitHub proyek ini, lalu klik **"Import"**.

3. **Pengaturan Project di Vercel (Configure Project):**
   - **Framework Preset**: Pilih **Vite** (biasanya terdeteksi otomatis).
   - **Root Directory**: Biarkan `./` (default).
   - **Build Command**: `npm run build` (atau biarkan default).
   - **Output Directory**: `dist` (biarkan default).
   - **Install Command**: `npm install` (biarkan default).

4. **Environment Variables (Opsional):**
   - Jika menggunakan fitur AI Studio/Gemini, tambahkan `GEMINI_API_KEY` pada menu *Environment Variables*.
   - Jika tidak, Anda bisa langsung klik **Deploy**.

5. **Klik "Deploy":**
   - Tunggu proses build selesai (~1 menit).
   - Aplikasi Anda siap diakses di URL subdomain Vercel (misal: `https://nama-aplikasi-anda.vercel.app`).

---

### Opsi B: Deploy via Vercel CLI (Dari Terminal Komputer)

Jika Anda memiliki Node.js di komputer:

1. **Install Vercel CLI secara global:**
   ```bash
   npm install -g vercel
   ```

2. **Login ke akun Vercel:**
   ```bash
   vercel login
   ```

3. **Jalankan perintah deploy:**
   ```bash
   vercel
   ```
   - Ikuti pertanyaan di terminal (tekan Enter untuk opsi default).

4. **Deploy ke Production:**
   ```bash
   vercel --prod
   ```

---

## 💡 Tips & Catatan Penting

- **Fitur Ekspor & Backup**: Karena Vercel menggunakan arsitektur *Serverless*, disarankan untuk sesekali memanfaatkan menu **Pengaturan > Backup & Restore** di dalam aplikasi untuk mendownload salinan berkas database `.json` sebagai arsip cadangan.
- **Pencetakan Dokumen**: Semua fitur cetak format **F4 (21 x 33 cm)** dan **A4**, serta ekspor PDF resmi, berfungsi normal di domain Vercel.
