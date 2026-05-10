# Catatan teknis SiKasir

## Transaksi database & stok

Saat kasir menekan **Proses bayar**, server menjalankan **satu transaksi SQL** (`BEGIN` … `COMMIT`): menyimpan header transaksi dan tiap item, lalu **mengurangi stok** produk per baris. Jika ada kegagalan (misalnya stok tidak cukup), seluruh operasi **dibatalkan** (`ROLLBACK`) agar penjualan dan stok tidak bertentangan.

## Offline kasir vs online backend

- **Daftar produk** dapat di-cache di browser / Service Worker agar nama dan harga masih bisa dibaca tanpa jaringan.
- **Checkout** tetap memerlukan server: tanpa API, transaksi tidak tercatat dan stok pusat tidak bisa diperbarui secara konsisten.
- Untuk antre transaksi offline lalu sinkron otomatis diperlukan tambahan (IndexedDB + antrian + konflik stok); belum termasuk implementasi penuh di rilis ini.

## Edit kasir (`prompt`)

Form edit akun kasir memakai **`prompt()`** bawaan browser agar cepat tanpa modal baru. Keterbatasannya: tampilan kurang seragam dengan dashboard; bisa diganti modal HTML jika UX diprioritaskan.

## Pendaftaran di halaman awal

- Tab **Daftar** membuat akun baru dengan role **kasir** (POS + riwayat).
- Nonaktifkan dengan **`PUBLIC_REGISTER=false`** di `.env` agar hanya admin yang bisa menambah akun dari dashboard.

## Pilih mode setelah login

- Halaman **`/mode.html`** muncul setelah login/daftar: **Kasir** (POS), **Admin** (kelola tanpa menu POS di sidebar), atau **Keduanya** (akses penuh — hanya untuk akun admin).
- Hak akses API tetap mengikuti role di database (kasir tidak bisa memanggil endpoint admin meskipun mengubah localStorage).
- Tombol **Ganti mode** di sidebar membuka kembali pemilihan mode tanpa logout.

## Barang masuk (log penerimaan)

- Menu **Barang Masuk** mencatat deskripsi bebas (contoh: *Rokok filter 1 slof*) beserta tanggal, jumlah, dan satuan opsional.
- Jika **produk katalog** dipilih, **stok produk bertambah** otomatis sesuai jumlah entri.
- **Menghapus entri log** tidak mengembalikan stok secara otomatis (harus penyesuaian manual di **Manajemen Stok** jika diperlukan).

## Ringkasan fitur keamanan

| Lapisan | Implementasi ringkas |
|--------|----------------------|
| **Security headers** | `helmet`: `noSniff`, anti-frame (`frameguard`), **HSTS** aktif jika `NODE_ENV=production`. Header **`X-XSS-Protection: 1; mode=block`** ditambahkan manual (kompatibilitas browser lama). CSP dinonaktifkan agar CDN aset tetap jalan — bisa diperketat per lingkungan. |
| **Rate limiting** | **100 permintaan/menit per IP** pada prefix `/api`. Melampaui → HTTP 429 + **blokir sementara 15 menit** pada IP tersebut. |
| **Brute force login** | **Maks. 5 gagal login** per IP → blokir **1 jam** + **email alert** (jika SMTP di `.env` diisi). |
| **JWT** | Semua endpoint API selain login & CSRF membutuhkan header `Authorization: Bearer …` melalui middleware auth. |
| **Input sanitization** | Middleware membersihkan string (null byte, panjang, pola `<script>`). Query SQL memakai **parameter terikat** (`?`) untuk mitigasi SQL injection. |
| **CSRF** | Token **sekali pakai** dari `GET /api/csrf-token`, dikirim sebagai header **`X-CSRF-Token`** pada `POST`/`PUT`/`PATCH`/`DELETE`. |
| **Batas ukuran body** | **`express.json({ limit: '5mb' })`**. |
| **Bot / scanner** | Middleware menolak pola **User-Agent** umum alat scanner (mis. sqlmap, nikto). |
| **Blacklist IP** | Setelah **pelanggaran** (rate limit, dll.) mencapai ambang (`BLACKLIST_VIOLATION_THRESHOLD`, default **10**), IP bisa masuk **blacklist permanen** (in-memory; gunakan Redis di produksi). |
| **Audit log** | Aksi admin yang mengubah data (pengguna, produk, kategori, barang masuk, dll.) dicatat di tabel **`audit_logs`**; menu **Log Audit** menampilkan riwayat. |

### Variabel lingkungan relevan

Lihat `.env.example`: `JWT_SECRET`, `SMTP_*`, `ALERT_EMAIL`, `BLACKLIST_VIOLATION_THRESHOLD`, `RATE_LIMIT_MAX`, `LOGIN_MAX_FAIL`, `LOGIN_LOCK_MS`, `TRUST_PROXY`, `CORS_ORIGIN`, `NODE_ENV`.

### Watermark

Teks **Product by Sivilize Corp** ditampilkan di footer halaman web dan di bagian bawah **struk PDF** serta **export laporan PDF**.

---

**Catatan produksi:** blacklist, CSRF store, dan brute-force state disimpan **di memori proses**; setelah restart server data tersebut hilang — untuk cluster/high availability gunakan penyimpanan terpusat (Redis).
