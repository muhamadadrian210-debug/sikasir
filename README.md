# SiKasir — PWA Supermarket POS & Distributed Cybersecurity

A modern, high-performance Progressive Web Application (PWA) point-of-sale cashier system. Built on **Node.js, Express, MySQL, and Redis** with a robust row-level multitenant design and an advanced **11-Layer Cybersecurity Firewall** with automated hacker-frustration honeypot mechanisms.

---

## 🚀 Fitur Utama Aplikasi

- **Multi-Tenant (Row-Level Security)**: Setiap pemilik toko mendaftarkan tokonya sendiri secara terisolasi. Seluruh data kasir, produk, kategori, stok, riwayat transaksi, dan log audit diisolasi secara ketat berdasarkan `tenant_id`.
- **Kemampuan PWA Offline Kasir**:
  - Service Worker melakukan caching halaman katalog produk.
  - POS dapat tetap memuat item dan memindai barcode secara offline dari cache data terenkripsi lokal di browser.
- **Manajemen Barang & Penerimaan Log**: Pelacakan komprehensif log barang masuk yang meningkatkan stok katalog secara otomatis.
- **Margin & Laporan Penjualan**: Laporan grafis interaktif dengan Chart.js, analisis laba bersih, margin kotor, dan ekspor struk PDF.
- **Setup & Aksesibilitas Mudah**: Skema wizard instalasi awal (`/setup.html`) untuk inisialisasi administrator toko pertama.

---

## 🛡️ Arsitektur Keamanan Siber (11-Layer Firewall)

Aplikasi ini dilindungi oleh Firewall 11-Layer bercabang yang diisolasi ketat per toko:

- **Layer 1: Geofencing & IP Reputation** (2 Cabang, 2 Honeypot)
- **Layer 2: User-Agent & Bot Fingerprinting** (3 Cabang, 3 Honeypot)
- **Layer 3: Dynamic Rate Limiting & DDOS Tarpit** (4 Cabang, 4 Honeypot)
- **Layer 4: Protocol & Request Structure Integrity** (5 Cabang, 5 Honeypot)
- **Layer 5: Input Sanitization & XSS Prevention** (6 Cabang, 6 Honeypot)
- **Layer 6: Deep SQL Injection Defense** (7 Cabang, 7 Honeypot)
- **Layer 7: Cross-Site Request Forgery (CSRF) Shield** (8 Cabang, 8 Honeypot)
- **Layer 8: Session Security & Authentication Integrity** (9 Cabang, 9 Honeypot)
- **Layer 9: Parameter Tampering & IDOR Defense** (10 Cabang, 10 Honeypot)
- **Layer 10: API Abuse & Swagger/Introspection Block** (11 Cabang, 11 Honeypot)
- **Layer 11: Business Logic & Transaction Guard** (12 Cabang, 12 Honeypot)

### 🚨 Mekanisme Frustrasi Hacker & Fitur Kick Out
1. **Dynamic Honeypots**: Pengalihan transparan ke jebakan penyerang (.env palsu, SOAP fault, phpMyAdmin tiruan, dll.).
2. **Buffer-Bloat Tarpit Loop**: IP yang melanggar aturan akan terjebak dalam perulangan tak terbatas. Server mengalirkan sampah data hexadecimal (50KB/500ms) untuk melumpuhkan scanner otomatis penyerang karena memori yang crash (Out-Of-Memory).
3. **Auto-Escalation**: Setelah 3 kali percobaan serangan terdeteksi, IP secara otomatis diblacklist dan dikunci dalam Tarpit Loop.
4. **Interactive Kick Panel**: Melalui menu **Keamanan Siber**, Admin dapat memantau deteksi IP penyusup secara real-time dan mengeklik tombol **KICK & LOCK** untuk langsung mengusir dan memasukkan mereka ke ruang tarpit loop secara manual.
5. **Isolasi Log Siber**: Administrator Toko A **hanya** dapat melihat log keamanan dan mengusir penyusup dari tokonya sendiri. Log dan deteksi Toko B terisolasi secara total.

---

## ⚙️ Persyaratan Sistem & Dependensi

- **Node.js**: Versi `>=18.0.0`
- **MySQL Database**: Untuk penyimpanan data relasional persisten
- **Redis Cache (ioredis)**: Untuk penyimpanan cluster terdistribusi (blacklist IP, rate-limiting status, status toggle loop).
  - *Catatan*: Jika Redis offline, sistem secara otomatis beralih menggunakan in-memory cache cadangan agar server tidak crash.

---

## 🛠️ Langkah Instalasi

1. **Clone repositori dan install dependensi**:
   ```bash
   git clone <repo-url>
   cd SiKasir
   npm install
   ```

2. **Salin dan sesuaikan variabel lingkungan**:
   ```bash
   cp .env.example .env
   ```
   *Sesuaikan konfigurasi database MySQL (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) dan opsional Redis (`REDIS_URL`).*

3. **Jalankan inisialisasi database**:
   ```bash
   npm run db:init
   ```

4. **Jalankan server dalam mode pengembangan**:
   ```bash
   npm run dev
   ```
   *Buka browser di [http://localhost:3000](http://localhost:3000).*

---

## ⚙️ Skrip NPM yang Tersedia

- `npm start`: Menjalankan aplikasi di lingkungan produksi.
- `npm run dev`: Menjalankan aplikasi dengan live-reload nodemon.
- `npm run db:init`: Menyiapkan skema default basis data MySQL.
- `npm run db:reset`: Membersihkan dan me-reset seluruh tabel MySQL (HATI-HATI).
- `node server/scripts/run-migration.js`: Menjalankan migrasi tabel siber `cyber_firewall_logs`.
