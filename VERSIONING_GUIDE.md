# 📌 PANDUAN STANDAR PENOMORAN VERSI (SEMANTIC VERSIONING / SEMVER)

Gunakan rumus dan panduan ini sebagai contekan resmi setiap kali Anda melakukan update, perbaikan bug, penambahan fitur, atau maintenance besar pada aplikasi **SiKasir**.

---

## 🔢 Rumus Dasar: `MAJOR . MINOR . PATCH`
Contoh: **`3 . 0 . 0`** atau **`3 . 1 . 4`**

```
   3   .   1   .   4
   │       │       └── PATCH : Bug Fix / Perbaikan Error / Maintenance Kecil
   │       └────────── MINOR : Penambahan Fitur Baru (Kompatibel)
   └────────────────── MAJOR : Perombakan Total / Ganti Mesin / Rilis Generasi Baru
```

---

## 📋 Tabel Keputusan Kenaikan Versi (Kapan Harus Naik?)

| Jenis Pekerjaan yang Dilakukan | Angka yang Dinaikkan | Contoh Sebelum $\rightarrow$ Sesudah |
| :--- | :---: | :---: |
| **Maintenance Ringan / Bug Fix** <br>• Perbaiki bug tombol tidak merespons <br>• Perbaiki salah hitung kembalian / margin <br>• Perbaiki salah ketik (typo) / ganti warna CSS <br>• Optimasi performa database/API tanpa ubah fitur | **PATCH** <br>*(Angka ke-3)* | `3.0.0` $\rightarrow$ **`3.0.1`** <br>`3.0.1` $\rightarrow$ **`3.0.2`** |
| **Penambahan Fitur Baru** <br>• Tambah fitur baru (misal: Diskon Member, Fitur Kasir Baru) <br>• Tambah integrasi pembayaran baru (misal: EDC BCA/QRIS) <br>• Tambah halaman/tab laporan baru <br>*(Fitur bertambah, tapi mesin & database lama tetap jalan)* | **MINOR** <br>*(Angka ke-2, patch reset ke 0)* | `3.0.2` $\rightarrow$ **`3.1.0`** <br>`3.1.0` $\rightarrow$ **`3.2.0`** |
| **Perombakan Raksasa / Ganti Mesin** <br>• Ganti mesin/bahasa (seperti ganti React Native ke Flutter) <br>• Perombakan total struktur database yang merusak format lama <br>• Redesign total dari awal (Generasi Baru Aplikasi) | **MAJOR** <br>*(Angka ke-1, minor & patch reset ke 0)* | `2.0.0` $\rightarrow$ **`3.0.0`** <br>`3.2.5` $\rightarrow$ **`4.0.0`** |

---

## 🎯 4 File yang Harus Diupdate Saat Ganti Nomor Versi:

Saat Anda memutuskan menaikkan nomor versi (misal ke `3.0.1` atau `3.1.0`), ubah 4 file ini:

1. **`package.json`** (Root Proyek):
   ```json
   "version": "3.0.1"
   ```

2. **`mobile_flutter/pubspec.yaml`** (Aplikasi Mobile Flutter):
   ```yaml
   version: 3.0.1+301
   ```
   *(Catatan: Angka setelah tanda `+` adalah `build number` untuk Android/Play Store, harus selalu naik terus 300, 301, 302, dst).*

3. **`public/index.html` & `public/app.html`** (Web Kasir):
   Ubah badge teks versi:
   ```html
   <span>v3.0.1</span>
   ```

4. **`README.md`** (Dokumentasi):
   Ubah judul versi di bagian atas.

---

## 💡 Contoh Skenario Harian (Study Case):

1. **Hari Senin:** Anda memperbaiki bug scanner barcode yang lambat di Android 14.  
   👉 **Versi naik jadi:** `3.0.1` (Patch).

2. **Hari Rabu:** Anda menambahkan fitur "Cetak Barcode Label ke Kertas Stiker".  
   👉 **Versi naik jadi:** `3.1.0` (Minor).

3. **Hari Jumat:** Ada typo tulisan "Total Bayar" di struk, Anda perbaiki.  
   👉 **Versi naik jadi:** `3.1.1` (Patch).

4. **Tahun Depan:** Anda merombak arsitektur ke Microservices + Multi-Region Cloud.  
   👉 **Versi naik jadi:** `4.0.0` (Major).
