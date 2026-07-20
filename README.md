<div align="center">
  <img src="public/icons/logo.svg" alt="SiKasir Logo" width="120" height="120">
  <h1>SiKasir</h1>
  <p><b>Sistem Point of Sales Cerdas Masa Depan</b></p>
</div>

---

## 🚀 Apa itu SiKasir?

**SiKasir** adalah sistem *Point of Sales* (POS) dan manajemen inventaris digital tingkat lanjut yang dirancang khusus untuk mempercepat, mempermudah, dan mengotomatisasi proses bisnis ritel modern. Dibekali dengan fitur **AI Assistant**, SiKasir tidak hanya mencatat transaksi, tetapi juga mampu diajak berkomunikasi untuk mengatur dan mengaudit stok secara instan, cerdas, dan efisien.

---

## 🏢 Bagian dari Sivilize Corp Indonesia

SiKasir bukanlah produk mandiri yang berdiri sendiri, melainkan sebuah mahakarya teknologi yang terintegrasi di dalam ekosistem **Sivilize Corp Indonesia**. Kami membangun teknologi untuk memberikan keunggulan kompetitif bagi setiap ekosistem bisnis yang mempercayakan operasionalnya kepada kami.

---

## 📖 Latar Belakang, Visi & Misi

### Latar Belakang
Diciptakan dari kesadaran akan lambatnya proses pencatatan stok dan kasir konvensional yang memicu tingginya *human error*. Bisnis ritel membutuhkan solusi yang bukan sekadar "pencatat", tapi juga "asisten" yang bisa diajak bekerja serba cepat—bahkan bisa dioperasikan hanya dengan obrolan (*AI-driven*).

### Visi
Menjadi pilar utama dalam transformasi dan digitalisasi ritel modern di Indonesia, menghadirkan standar teknologi kelas dunia (Silicon Valley) ke setiap lini bisnis lokal.

### Misi
- Menyediakan sistem POS dan stok yang memiliki tingkat keamanan tinggi (*cyber-security ready*).
- Memberantas inefisiensi operasional toko lewat otomatisasi AI.
- Menghadirkan antarmuka pengguna yang premium, estetik, namun sangat mudah dipahami oleh kasir manapun.

---

## 📖 Panduan Lengkap Penggunaan Aplikasi

Berikut adalah panduan lengkap cara mengoperasikan sistem **SiKasir**, baik untuk kebutuhan administrasi (Admin) maupun operasional kasir harian (POS).

---

### 🔑 1. Panduan Login, Pendaftaran, & Setup Awal

#### A. Setup Awal (Instalasi Baru)
Jika aplikasi baru saja dipasang dan database masih kosong:
1. Akses halaman awal aplikasi. Sistem akan mendeteksi database kosong dan otomatis mengarahkan Anda ke halaman **`/setup.html`**.
2. Daftarkan nama toko Anda, pilih jenis industri toko, serta buat akun **Super Admin** pertama.

#### B. Registrasi Toko Baru (Tenant Baru)
Jika fitur registrasi publik aktif (`PUBLIC_REGISTER=true` di file `.env`):
1. Buka halaman utama login, pilih tab **Daftar**.
2. Masukkan **Nama Toko** Anda dan pilih **Kategori Toko** (misalnya: *Apotek / Toko Obat*, *Toko Pakaian*, *Minimarket*, dll.).
3. Isi username dan password untuk akun Admin toko Anda, lalu tekan **Daftar Toko**.
4. Sistem akan otomatis membuat database tenant terisolasi untuk toko Anda.

#### C. Melakukan Login & Memilih Mode
1. Masuk ke halaman login, masukkan username dan password akun Anda, lalu klik **Masuk**.
2. Setelah login berhasil, Anda akan diarahkan ke halaman **`/mode.html`** untuk memilih mode operasional:
   - **Kasir**: Hanya membuka halaman kasir POS untuk transaksi harian.
   - **Admin**: Hanya membuka halaman dashboard panel admin untuk pengelolaan data produk, laporan keuangan, dan akun karyawan.
   - **Keduanya (Full Access)**: Membuka dashboard admin lengkap dengan tombol kasir POS di sidebar (khusus akun ber-role Admin).
3. Anda dapat berganti mode kapan saja dengan menekan tombol **Ganti Mode** di bagian bawah sidebar tanpa harus melakukan logout.

---

### 📦 2. Panduan Manajemen Produk & Input Stok Barang

SiKasir mendukung pengelolaan stok yang dinamis berdasarkan jenis industri toko Anda. Ikuti langkah berikut untuk memasukkan barang/stok baru:

1. Buka dashboard utama, pilih menu **Produk & Barang** (Nama menu akan otomatis menyesuaikan jenis toko, misal: *Obat & Produk* untuk Apotek).
2. Klik tombol **Tambah Produk**.
3. Pilih salah satu dari 3 metode input yang paling mudah bagi Anda:
   - **📷 Scan Barcode**: Menggunakan kamera HP/Tablet untuk memindai kode barcode produk secara langsung. Setelah terpindai, isi data sisa form.
   - **✨ AI Assistant (Rekomendasi)**: Cukup ketik detail produk dengan kalimat sehari-hari.
     * *Contoh*: `"Paracetamol tablet isi 10, harga beli 8000, jual 12000, stok 150"`
     * AI akan mengekstrak informasi tersebut secara instan dan mengisi form secara otomatis. Periksa kembali lalu simpan.
   - **⌨️ Input Manual**: Ketik data produk secara manual pada form yang tersedia (Barcode, Nama Produk, Harga Beli, Harga Jual, dan Jumlah Stok Awal).

#### 🏷️ Kolom Informasi Tambahan Otomatis (Sesuai Kategori Toko):
Formulir akan menyesuaikan jenis toko Anda secara dinamis untuk pencatatan yang presisi:
* **Apotek / Makanan / Kosmetik**: Wajib mengisi **Nomor Batch** dan **Tanggal Kadaluarsa** (sistem otomatis memberi peringatan warna merah mencolok jika barang mendekati/melewati tanggal kadaluarsa).
* **Pakaian / Fashion**: Mengisi pilihan **Ukuran (Size)** dan **Warna**.
* **Elektronik / Otomotif / Peralatan Rumah Tangga**: Mengisi detail **Merek (Brand)** dan **Masa Garansi**.
* **Bangunan / Kelontong / Minimarket**: Mengisi **Lokasi Rak / Aisle** untuk mempermudah pencarian fisik barang di toko.

---

### 📥 3. Panduan Log Barang Masuk (Restock Pasokan)

Untuk menambah stok barang yang sudah terdaftar di katalog tanpa harus mengedit produk satu per satu:
1. Masuk ke menu **Barang Masuk** (atau *Obat Masuk*/*Barang Masuk* sesuai tipe toko).
2. Tuliskan deskripsi pasokan barang yang datang di kolom deskripsi (misal: *"Indomie Goreng 5 dus"* atau *"Rokok Filter 2 slof"*).
3. Pilih produk katalog yang sesuai agar sistem mengenali produk tersebut.
4. Masukkan jumlah kuantitas barang masuk.
5. Klik **Simpan/Tambah Entri**. Stok produk pada katalog Anda akan otomatis bertambah secara real-time.

---

### 🛒 4. Panduan Transaksi Kasir POS (Point of Sales)

1. Pilih mode **Kasir** dari menu utama.
2. Di halaman kasir:
   - **Pencarian Cepat**: Scan barcode barang menggunakan barcode scanner fisik / kamera HP, atau ketik nama barang di kolom pencarian.
   - **Pilih Barang**: Klik produk yang muncul untuk memasukkannya ke keranjang belanja.
   - **Atur Jumlah**: Klik tombol `+` atau `-` untuk menyesuaikan kuantitas beli pelanggan.
3. Klik tombol **Proses Bayar** di bawah keranjang belanja.
4. Masukkan jumlah uang tunai yang diberikan oleh pelanggan. Sistem akan menampilkan nominal kembalian secara otomatis.
5. Tekan **Konfirmasi Bayar**.
   * *Catatan Teknis*: Proses pembayaran dilindungi oleh *Single Database Transaction*. Jika terjadi kegagalan jaringan atau stok tiba-tiba habis, transaksi otomatis dibatalkan (*rollback*) agar data keuangan dan fisik tidak selisih.
6. Struk belanja PDF premium siap dicetak atau disimpan sebagai arsip digital.

---

### 🛡️ 5. Fitur Keamanan & Log Audit Sistem (Cybersecurity Ready)

SiKasir dirancang dengan pertahanan siber tingkat tinggi untuk melindungi data bisnis Anda dari penyusup:
* **Anti Brute Force**: Jika terjadi 5 kali gagal login berturut-turut pada IP yang sama, sistem akan memblokir IP tersebut selama 1 jam dan mengirimkan notifikasi peringatan email ke administrator.
* **IP Auto Blacklist**: IP yang melakukan aktivitas mencurigakan berulang kali akan otomatis masuk daftar hitam (*permanent block*).
* **Log Audit Admin**: Setiap perubahan data penting (seperti menghapus produk, mengedit harga, menambah kasir) akan dicatat lengkap beserta timestamp dan IP pelaksana di menu **Log Audit** untuk pelacakan internal.

---

## 👑 Profil Kepemimpinan

SiKasir dibangun dan dikelola di bawah pengawasan ketat dan arahan dari:

- **Nama**: Muhamad Adrian
- **Jabatan**: Direktur Utama (PT Sivilize Corp Indonesia)
- **Email Resmi**: muhamadadrian210@gmail.com
- **WhatsApp**: 0813 3821 9957

*Kami selalu terbuka untuk mendiskusikan peluang kerja sama bisnis tingkat tinggi maupun pengadaan enterprise.*

---

## 📄 Lisensi Penggunaan

**Hak Cipta Dilindungi (All Rights Reserved)**
Hak Cipta © 2026 SiKasir - Muhamad Adrian (PT Sivilize Corp Indonesia).

Perangkat lunak ini adalah **PROPERTI INTELEKTUAL MUTLAK** milik Sivilize Corp. 
- 🚫 **DILARANG KERAS** menyalin, menggandakan, atau menggunakan *source code* ini untuk tujuan komersial di luar izin tertulis.
- 🚫 **DILARANG KERAS** melakukan rekayasa balik (*reverse engineering*) atau mendistribusikan ulang produk ini secara sepihak.

Segala bentuk pelanggaran Hak Cipta akan ditindak tegas sesuai dengan hukum kekayaan intelektual yang berlaku di Republik Indonesia maupun hukum internasional.

> *"Membangun peradaban dimulai dari sistem komputasi yang presisi."* - **Sivilize Corp**
