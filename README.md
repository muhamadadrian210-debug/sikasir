# SiKasir

Aplikasi kasir supermarket berbasis **PWA** (Node.js + Express + MySQL) dengan role Admin & Kasir.

## Dokumentasi

| File | Isi |
|------|-----|
| **[TECH_NOTES.md](TECH_NOTES.md)** | Catatan teknis (transaksi/stok, offline, barang masuk, lapisan keamanan, variabel lingkungan, watermark) |
| **[.env.example](.env.example)** | Contoh konfigurasi server, database, SMTP alert, rate limit |
| **`database/schema.sql`** | Skema basis data lengkap (instal baru) |
| **`database/migration_security_incoming.sql`** | Migrasi jika DB sudah ada sebelum penambahan audit & barang masuk |

## Menjalankan cepat

1. **MySQL**: impor `database/schema.sql` (atau jalankan migrasi di atas jika basis data sudah ada).
2. Salin `.env.example` ke `.env` dan sesuaikan `DB_*`, **`JWT_SECRET`**.
3. Di folder proyek:

```bash
npm install
npm run db:init
npm start
```

4. Buka **http://localhost:3000** — tab **Masuk** atau **Daftar** (akun baru = role kasir). Setelah login/daftar, pilih **mode**: Kasir, Admin, atau Keduanya (untuk akun admin). Default admin setelah `db:init`: **`admin` / `admin123`** (ganti segera).

Untuk menutup pendaftaran publik, set di `.env`: `PUBLIC_REGISTER=false`.

**CSRF / “Gagal mengambil CSRF token”:** buka aplikasi lewat **http://localhost:PORT** (server harus jalan dengan `npm start`). Jangan membuka `index.html` langsung dari Explorer (`file://`). Endpoint token tidak lagi dihitung ketat oleh rate limit.

## Struktur ringkas

- `server/` — API Express (JWT, CSRF, rate limit, audit, dll.)
- `public/` — Frontend PWA (`index.html`, `app.html`, `js/`, `css/`, `manifest.json`, `sw.js`)

Detail perilaku keamanan dan batasan offline ada di **[TECH_NOTES.md](TECH_NOTES.md)**.
