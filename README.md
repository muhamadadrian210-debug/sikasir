# SiKasir

Aplikasi kasir supermarket & UMKM berbasis **PWA** (Progressive Web App) dengan Node.js + Express + MySQL. Mendukung multi-toko, multi-kasir, dan dapat diinstall sebagai aplikasi di HP maupun komputer.

> **Product by Sivilize Corp**

---

## Fitur Lengkap

### 🛒 Kasir (POS)
- Scan barcode produk via kamera HP/laptop (ZXing — akurat untuk EAN-13, EAN-8, Code 128, Code 39)
- Input barcode manual
- Keranjang belanja dengan tambah/kurang/hapus item
- Kalkulasi total dan kembalian otomatis
- Proses bayar dengan validasi stok real-time
- Cetak struk transaksi ke **PDF** (format thermal 72mm)
- Cache produk offline — daftar produk tetap bisa dibaca tanpa internet

### 📦 Manajemen Produk
- Tambah, edit, hapus produk
- Scan barcode untuk daftarkan produk baru
- Data produk: barcode, nama, harga beli, harga jual, stok, kategori
- Pencarian produk by nama atau barcode

### 📥 Barang Masuk
- Log penerimaan barang dengan deskripsi bebas
- Pilih produk katalog → stok otomatis bertambah
- Filter log by tanggal
- Ringkasan barang masuk hari ini

### 📊 Laporan & Margin
- Grafik omzet penjualan (harian / mingguan / bulanan)
- Laporan margin per produk (omzet, HPP, profit)
- Ringkasan total omzet, HPP, dan profit
- Daftar stok menipis (threshold bisa diatur)
- Export laporan ke **PDF**
- Export laporan ke **Excel (CSV)**

### 📋 Manajemen Stok
- Lihat stok semua produk
- Penyesuaian stok manual (delta +/-)

### 👥 Manajemen Kasir
- Tambah, edit, hapus akun kasir
- Role: **Admin** (akses penuh) dan **Kasir** (POS + riwayat transaksi sendiri)

### 🔍 Riwayat Transaksi
- Admin: lihat semua transaksi
- Kasir: hanya lihat transaksi milik sendiri
- Detail transaksi per item

### 📝 Log Audit
- Semua aksi admin (tambah/edit/hapus produk, user, kategori, dll.) tercatat otomatis
- Riwayat lengkap dengan timestamp, IP, dan detail aksi

### 🏪 Multi-Toko (Multi-Tenant)
- Setiap toko punya data **terpisah** — Toko A tidak bisa lihat data Toko B
- Setup pertama kali: isi nama toko + username + password admin
- Satu deployment bisa melayani banyak UMKM sekaligus

### 📲 PWA — Bisa Diinstall Sebagai Aplikasi
- Buka di browser → klik **"Install Aplikasi"** di sidebar
- Atau di browser: menu → "Add to Home Screen" / "Install App"
- Setelah install, berjalan seperti aplikasi native (fullscreen, tanpa address bar)
- Tersedia di Android, iOS (Safari), Windows, dan macOS

### 🔄 Mode Tampilan
- **Mode Kasir**: hanya tampil menu POS dan riwayat
- **Mode Admin**: tampil semua menu manajemen
- **Mode Keduanya**: akses penuh (khusus akun admin)
- Ganti mode kapan saja tanpa logout

---

## Keamanan — 9 Lapis Perlindungan

| # | Lapisan | Implementasi |
|---|---------|-------------|
| 1 | **JWT (JSON Web Token)** | Semua endpoint API memerlukan token Bearer. Token berisi `id`, `username`, `role`, dan `tenant_id`. Expire 7 hari. |
| 2 | **CSRF Protection** | Token sekali pakai (one-time use) dari `GET /api/csrf-token`, wajib dikirim sebagai header `X-CSRF-Token` pada setiap mutasi (POST/PUT/PATCH/DELETE). |
| 3 | **Rate Limiting** | Maksimal **100 request/menit per IP** pada semua endpoint `/api`. Melampaui batas → HTTP 429 + temp ban 15 menit. |
| 4 | **Brute Force Login** | Maksimal **5 gagal login per IP** → IP diblokir **1 jam** + email alert otomatis (jika SMTP dikonfigurasi). |
| 5 | **IP Blacklist** | Setelah pelanggaran mencapai threshold (`BLACKLIST_VIOLATION_THRESHOLD`, default 10), IP masuk blacklist permanen (in-memory). |
| 6 | **Temp Ban** | Setelah rate limit tercapai, IP diblokir sementara 15 menit secara otomatis. |
| 7 | **Bot & Scanner Blocker** | Middleware menolak User-Agent alat scanner umum: `sqlmap`, `nikto`, `nessus`, `masscan`, `acunetix`, `burpsuite`, dll. |
| 8 | **Input Sanitization** | Semua input dibersihkan dari null byte, pola `<script>`, dan dibatasi panjangnya. Semua query SQL menggunakan **parameterized statements** (`?`) — anti SQL injection. |
| 9 | **Security Headers (Helmet)** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, **HSTS** aktif di production, `Referrer-Policy`, `Permissions-Policy`. CSP dapat diaktifkan per environment. |

### Tambahan:
- **Role-based access control**: kasir tidak bisa akses endpoint admin meskipun mengubah localStorage
- **Multi-tenant isolation**: semua query difilter by `tenant_id` — data antar toko tidak bisa bocor
- **Audit log**: semua aksi admin dicatat di database dengan timestamp dan IP
- **Body size limit**: `express.json({ limit: '5mb' })` — mencegah payload flooding

---

## Stack Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Backend | Node.js 18+, Express 4 |
| Database | MySQL 8+ |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 |
| PWA | Service Worker, Web App Manifest |
| Barcode | ZXing (@zxing/library 0.20) |
| PDF | jsPDF 2.5 |
| Chart | Chart.js 4.4 |
| Security | Helmet, express-rate-limit, validator |
| Email Alert | Nodemailer |

---

## Instalasi Lokal

### Prasyarat
- Node.js ≥ 18
- MySQL 8+ (atau XAMPP)

### Langkah

```bash
# 1. Clone repo
git clone https://github.com/efootball24122004-blip/sikasir.git
cd sikasir

# 2. Install dependencies
npm install

# 3. Salin dan isi konfigurasi
cp .env.example .env
# Edit .env: isi DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET

# 4. Import schema database
# Di MySQL client atau phpMyAdmin, jalankan: database/schema.sql

# 5. Jalankan server
npm start
```

Buka **http://localhost:3000** — akan muncul halaman **Setup Toko** untuk membuat akun admin pertama.

---

## Deploy ke Railway

1. Push kode ke GitHub
2. Buat project baru di [railway.app](https://railway.app)
3. Tambahkan service **MySQL**
4. Tambahkan service dari **GitHub Repository**
5. Set environment variables di service Node.js:

```
DB_HOST=mysql.railway.internal
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<dari Variables MySQL>
DB_NAME=railway
JWT_SECRET=<string acak panjang>
NODE_ENV=production
PORT=3000
```

6. Generate domain di Settings → Networking → Generate Domain
7. Buka URL → isi form Setup Toko

---

## Variabel Lingkungan

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `3000` | Port server |
| `DB_HOST` | `localhost` | Host MySQL |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_USER` | `root` | User MySQL |
| `DB_PASSWORD` | _(kosong)_ | Password MySQL |
| `DB_NAME` | `sikasir` | Nama database |
| `JWT_SECRET` | `dev-secret-change-me` | **Wajib diganti di production!** |
| `NODE_ENV` | `development` | Set `production` untuk HSTS aktif |
| `PUBLIC_REGISTER` | `true` | `false` = nonaktifkan registrasi publik |
| `RATE_LIMIT_MAX` | `100` | Maks request/menit per IP |
| `LOGIN_MAX_FAIL` | `5` | Maks gagal login sebelum lock |
| `LOGIN_LOCK_MS` | `3600000` | Durasi lock login (ms), default 1 jam |
| `BLACKLIST_VIOLATION_THRESHOLD` | `10` | Jumlah pelanggaran sebelum blacklist permanen |
| `TRUST_PROXY` | `1` | Jumlah proxy di depan server |
| `CORS_ORIGIN` | _(semua)_ | Origin yang diizinkan |
| `SMTP_HOST` | _(kosong)_ | Host SMTP untuk email alert |
| `SMTP_PORT` | _(kosong)_ | Port SMTP |
| `SMTP_USER` | _(kosong)_ | Username SMTP |
| `SMTP_PASS` | _(kosong)_ | Password SMTP |
| `ALERT_EMAIL` | _(kosong)_ | Email tujuan alert keamanan |

---

## Struktur Proyek

```
sikasir/
├── database/
│   ├── schema.sql                    # Schema lengkap (fresh install)
│   └── migration_multitenant.sql     # Migrasi multi-tenant
├── public/
│   ├── index.html                    # Halaman login
│   ├── app.html                      # Dashboard utama
│   ├── mode.html                     # Pilih mode (kasir/admin)
│   ├── setup.html                    # Setup toko pertama kali
│   ├── sw.js                         # Service Worker (PWA)
│   ├── manifest.json                 # Web App Manifest (PWA)
│   ├── css/app.css                   # Stylesheet
│   ├── js/
│   │   ├── api.js                    # HTTP client (JWT + CSRF)
│   │   ├── app.js                    # Logika dashboard utama
│   │   ├── login.js                  # Logika login/register
│   │   ├── mode.js                   # Logika pilih mode
│   │   └── scanner.js                # Barcode scanner (ZXing)
│   └── icons/logo.svg
├── server/
│   ├── index.js                      # Entry point Express
│   ├── config/db.js                  # Koneksi MySQL pool
│   ├── middleware/
│   │   ├── auth.js                   # JWT auth + requireRole + requireTenant
│   │   ├── botBlock.js               # Blokir scanner/bot
│   │   ├── csrf.js                   # CSRF token
│   │   ├── ipBlacklist.js            # IP blacklist
│   │   ├── rateLimiter.js            # Rate limiting
│   │   ├── sanitize.js               # Input sanitization
│   │   ├── securityHeaders.js        # Helmet headers
│   │   ├── tempBan.js                # Temp ban setelah rate limit
│   │   └── tenant.js                 # Helper tenant_id
│   ├── routes/
│   │   ├── auth.js                   # Login, register, /me
│   │   ├── setup.js                  # Setup toko pertama
│   │   ├── products.js               # CRUD produk
│   │   ├── categories.js             # CRUD kategori
│   │   ├── transactions.js           # Checkout, riwayat
│   │   ├── users.js                  # Manajemen kasir
│   │   ├── reports.js                # Laporan penjualan & margin
│   │   ├── incoming.js               # Log barang masuk
│   │   └── auditLogs.js              # Log audit admin
│   ├── lib/
│   │   ├── audit.js                  # Helper catat audit log
│   │   ├── csrfStore.js              # CSRF token store (in-memory)
│   │   ├── emailAlert.js             # Kirim email alert
│   │   ├── ipLists.js                # IP blacklist & violation counter
│   │   └── loginBrute.js             # Brute force protection
│   └── scripts/
│       └── init-db.js                # Seed data awal
├── .env.example
├── package.json
└── README.md
```

---

## Catatan Produksi

- **Blacklist IP, CSRF store, dan brute-force state** disimpan **in-memory** — hilang saat server restart. Untuk cluster/high availability, gunakan Redis.
- **Offline checkout** belum didukung penuh — hanya cache produk. Transaksi tetap butuh koneksi server.
- **CSP** dinonaktifkan secara default agar CDN aset berjalan. Aktifkan dan sesuaikan per environment untuk keamanan lebih ketat.
- Ganti `JWT_SECRET` dengan string acak panjang (minimal 32 karakter) sebelum deploy ke production.

---

## Lisensi

MIT License — © 2026 Sivilize Corp
