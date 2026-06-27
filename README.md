# SiKasir

SiKasir adalah aplikasi kasir web/PWA untuk toko, warung, minimarket, apotek, dan UMKM. Aplikasi ini mendukung penjualan, scan barcode, stok, barang masuk, laporan keuntungan, akun kasir, riwayat transaksi, dan panel keamanan toko untuk admin.

## Fitur Utama

- Kasir/POS untuk melayani pembeli dan mencetak struk PDF.
- Scan barcode dari kamera atau input manual.
- Manajemen produk, kategori, harga beli, harga jual, stok, dan data tambahan sesuai jenis toko.
- Barang masuk untuk mencatat penerimaan barang dan menambah stok otomatis.
- Laporan penjualan, modal barang, dan untung per barang.
- Riwayat transaksi untuk admin dan kasir.
- Manajemen akun kasir oleh admin.
- PWA, bisa dipasang seperti aplikasi dan menyimpan katalog produk untuk mode offline.
- Multi toko: data produk, transaksi, stok, pengguna, log audit, dan keamanan dipisahkan per toko.
- Keamanan toko: admin bisa melihat akses mencurigakan khusus tokonya dan langsung memblokir alamat penyusup dari web/apk.

## Keamanan Toko

Menu **Keamanan Toko** hanya muncul untuk admin. Panel ini dibuat untuk bahasa yang mudah dipahami:

- **Ringkasan**: total kejadian, jumlah alamat mencurigakan, dan status toko.
- **Akses mencurigakan**: daftar alamat yang mencoba tindakan berbahaya.
- **Blokir akses**: admin bisa langsung memblokir alamat yang mencurigakan.
- **Catatan kejadian**: riwayat percobaan pembobolan atau akses berbahaya.
- **Blokir otomatis**: sistem bisa menahan akses yang berulang kali mencurigakan.
- **Tes admin**: tombol tes untuk memastikan dashboard keamanan berjalan.

Setiap toko memakai `tenant_id`, jadi admin Toko A hanya bisa melihat dan memblokir data keamanan milik Toko A. Admin Toko B tidak bisa melihat data keamanan Toko A, dan sebaliknya.

## Teknologi

- Node.js dan Express untuk backend.
- MySQL untuk database utama.
- Redis opsional untuk penyimpanan status keamanan/rate limit yang lebih cepat.
- JWT untuk login.
- Service Worker dan manifest PWA untuk mode aplikasi.
- Chart.js untuk grafik laporan.
- jsPDF untuk struk dan laporan PDF.
- ZXing untuk scan barcode.

## Persyaratan

- Node.js `>=18`
- MySQL
- Redis opsional

## Instalasi

1. Install dependency:

   ```bash
   npm install
   ```

2. Salin konfigurasi environment:

   ```bash
   cp .env.example .env
   ```

3. Isi `.env` sesuai database:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=sikasir
   JWT_SECRET=ganti-dengan-secret-kuat
   REDIS_URL=
   ```

4. Siapkan database:

   ```bash
   npm run db:init
   ```

5. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

6. Buka:

   ```text
   http://localhost:3000
   ```

## Skrip

- `npm start`: menjalankan server.
- `npm run dev`: menjalankan server untuk pengembangan.
- `npm run db:init`: membuat/memperbarui schema database.
- `npm run db:reset`: mengosongkan dan membuat ulang database.
- `node server/scripts/run-migration.js`: menjalankan migrasi tabel keamanan jika diperlukan.

## Alur Penggunaan

1. Daftarkan toko dan akun admin dari halaman awal.
2. Admin memilih mode kasir, admin, atau keduanya.
3. Admin mengisi produk, kategori, dan stok awal.
4. Kasir melayani transaksi dari menu Kasir.
5. Admin melihat laporan, barang masuk, riwayat, akun kasir, log audit, dan keamanan toko.

## Catatan Multi Toko

Semua data penting dipisahkan berdasarkan `tenant_id`. Query produk, transaksi, stok, pengguna, barang masuk, audit, dan keamanan memakai tenant dari token login. Ini menjaga agar satu toko tidak bisa membaca atau mengubah data toko lain.
