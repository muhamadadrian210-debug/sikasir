<div align="center">
  <img src="public/icons/logo.svg" alt="SiKasir Logo" width="120" height="120">
  <h1>SiKasir</h1>
  <p><b>Sistem Point of Sales Cerdas Masa Depan (Super POS App)</b></p>
</div>

---

## 🚀 Apa itu SiKasir?

**SiKasir** adalah sistem *Point of Sales* (POS) dan manajemen inventaris digital tingkat lanjut yang dirancang khusus untuk mempercepat, mempermudah, dan mengotomatisasi proses bisnis ritel modern. SiKasir adalah sebuah **Universal POS** yang secara otomatis beradaptasi dengan lebih dari 30 tipe bisnis, mulai dari F&B, Ritel, Jasa, Otomotif, hingga Klinik Kesehatan. Dibekali dengan fitur **AI Assistant**, SiKasir tidak hanya mencatat transaksi, tetapi juga mampu diajak berkomunikasi untuk mengatur dan mengaudit stok secara instan, cerdas, dan efisien.

---

## 🌟 Kenapa SiKasir Berbeda dari POS Lainnya? (Key Differentiators)

Di pasaran, ada banyak sekali aplikasi kasir. Namun, SiKasir lahir dari pemikiran teknis tingkat tinggi (Silicon Valley Standard) untuk mengatasi masalah yang tidak bisa diselesaikan oleh POS biasa. Berikut adalah keunggulan mutlak SiKasir:

1. **🤖 AI-Powered Input (Asisten AI Cerdas)**
   POS biasa memaksa Anda mengetik manual berpuluh-puluh form. SiKasir memiliki kolom AI di mana Anda cukup mengetik bahasa sehari-hari: *"Kopi Susu ukuran Large harga 25ribu stok 100"*. AI akan langsung mengekstrak, mengenali varian, dan menyimpan data secara otomatis.
2. **🧬 Universal Business Adaptability (Bunglon UI/UX)**
   Aplikasi kasir lain biasanya "memaksa" tampilan restoran dipakai di toko baju. SiKasir berbeda! Saat Anda mendaftar sebagai **Apotek**, sistem akan memunculkan fitur *Tanggal Kedaluwarsa (Expired Date)*. Saat mendaftar sebagai **Bengkel**, form *Nama Mekanik* akan otomatis muncul saat checkout. Saat menjadi **Cafe**, fitur *Layar Dapur (KDS)* dan *Pajak PB1* otomatis aktif. Aplikasi yang beradaptasi dengan Anda, bukan sebaliknya.
3. **🏢 Multi-Outlet Corporate Integration (Lintas Industri)**
   Jika Anda memiliki 1 Minimarket dan 1 Cafe, POS lain akan memisahkannya. SiKasir memungkinkan 1 *Owner* (Company ID) menghubungkan kedua bisnis beda tipe tersebut. Anda bisa **memindahkan stok** dari Minimarket ke Cafe secara otomatis, dan melihat **Dashboard Laporan Gabungan** dari keduanya.
4. **💬 Penagihan Hutang via WhatsApp (1-Klik)**
   Manajemen hutang pelanggan (KASBON) bukan sekadar catatan. SiKasir memiliki tombol **Follow Up WA** yang otomatis melompat ke WhatsApp pelanggan, lengkap dengan draf pesan otomatis berisi sisa hutang yang harus dilunasi.
5. **🛡️ Active Cybersecurity Defense**
   POS biasa hanya berfungsi sebagai laci uang digital. SiKasir dirancang layaknya brankas bank digital. Dilengkapi dengan pendeteksi **Brute Force**, **IP Blacklisting**, dan **Log Audit** untuk mencatat siapa saja yang menghapus produk atau memanipulasi harga.

---

## 🛠️ Bedah Fitur Secara Mendalam (Deep Dive)

Berikut adalah penjelasan rinci dari setiap modul dan fitur kelas *Enterprise* yang tertanam di dalam SiKasir:

### 1. Modul Dinamis & Matriks Varian
* **Harga Grosir (Wholesale):** Anda dapat mengatur batas minimal pembelian. Misalnya, "Harga satuan Rp 10.000, jika beli di atas 10 pcs harga otomatis menjadi Rp 8.000". Fitur ini krusial untuk Toko Bangunan dan Distributor.
* **Matriks Varian Berlapis:** Sangat berguna untuk Fashion (Ukuran: M/L/XL, Warna: Merah/Hitam) atau F&B (Gula: Normal/Less, Ukuran: Reg/Large). Harga akan otomatis menyesuaikan setiap kombinasi varian.
* **Timbangan Barcode (Scale Barcode):** Mendukung pemindaian barcode yang dicetak oleh timbangan digital (misal di Supermarket/Toko Buah) yang menyimpan data harga langsung di dalam string barcode-nya.

### 2. Modul Kasir Khusus F&B (Food & Beverage)
Jika toko Anda terdaftar sebagai *Cafe*, *Restoran*, *Warteg*, atau *Bakery*, fitur khusus ini akan otomatis menyala:
* **Kitchen Display System (KDS):** Pesanan kasir tidak perlu diteriakkan atau diprint kertas struk. Dapur akan memiliki layar sendiri yang menampilkan pesanan secara *real-time*. Koki bisa menekan tombol "SIAP" agar pelayan tahu pesanan telah matang.
* **Split Bill (Pisah Tagihan):** Memudahkan rombongan tamu yang ingin membayar tagihannya masing-masing. Total pesanan bisa dipecah menjadi beberapa bon dalam hitungan detik.
* **Pajak Restoran PB1:** Perhitungan pajak pembangunan daerah (PB1) otomatis diterapkan di akhir tagihan.

### 3. Modul Kasbon & Keuangan Terpadu
* **Kasbon Global Berbasis Limit:** Setiap Pelanggan (Customer) memiliki profil dan *Limit Hutang*. Saat pelanggan *checkout* menggunakan opsi Kasbon, saldo hutang mereka akan bertambah. 
* **Saling Mengurangi Limit Lintas Cabang:** Karena sistem terintegrasi, jika pelanggan VIP menghabiskan limit hutang di cabang A (misal Minimarket), maka sisa jatah hutangnya di cabang B (Cafe) akan ikut menyusut!
* **Retur Barang & Pengembalian Dana (Refund):** Jika terjadi salah input atau pembatalan, Admin dapat melakukan Retur. Sistem akan membatalkan nilai transaksi dan mengembalikan stok barang ke dalam rak secara otomatis tanpa selisih data.

### 4. Modul Multi-Outlet (Grup Perusahaan)
* **Dashboard Konsolidasi:** Tuas (Toggle) khusus bagi Pemilik/Admin untuk beralih antara melihat laporan "Toko Ini Saja" atau "Keseluruhan Grup Perusahaan". Data Omzet, Total Produk, dan Barang Kritis akan langsung dijumlahkan menjadi 1 laporan raksasa.
* **Alat Mutasi Stok:** Transfer stok barang yang menganggur di satu toko ke toko Anda yang lain. Mengurangi *dead stock* (barang mati) dan memperlancar likuiditas barang fisik Anda.

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
- Menyediakan sistem POS dan stok yang fleksibel untuk segala jenis bisnis (F&B, Retail, Otomotif, Jasa).
- Menghadirkan solusi ekosistem terintegrasi (Corporate Integration) bagi pemilik yang memiliki banyak jenis toko.
- Memberantas inefisiensi operasional toko lewat otomatisasi AI.
- Menghadirkan antarmuka pengguna (UI/UX) yang premium, elegan (*Dark Mode*), dan sangat mudah dipahami oleh kasir manapun.

---

## 📖 Panduan Lengkap Penggunaan Aplikasi

Berikut adalah ringkasan cara mengoperasikan sistem **SiKasir**, baik untuk kebutuhan administrasi (Admin) maupun operasional kasir harian (POS).

### 🔑 1. Pendaftaran & Setup Toko Awal
1. Akses halaman login dan tekan tombol **Buat Toko Baru**.
2. Masukkan **Nama Toko** Anda dan tekan **Pilih Tipe Toko**.
3. Di dalam *Bottom Sheet Modal*, toko telah terkelompok rapi (misal: *F&B, Retail, Kesehatan, Otomotif, Jasa*). Terdapat 30+ pilihan tipe toko yang spesifik di Indonesia.
4. Isi data pemilik (Admin) dan masukkan kata sandi. 
5. UI & UX serta fitur-fitur di dalam aplikasi akan **Otomatis Beradaptasi** sesuai dengan kategori usaha Anda!

### 📦 2. Cara Cerdas Memasukkan Barang
1. Masuk ke halaman Kasir atau Admin, buka pendaftaran produk.
2. Manfaatkan **AI Assistant**: Cukup ketik deskripsi produk di dalam form AI, seperti *"Oli Yamalube 800ml harga beli 35000 harga jual 45000 stok 20"*, dan AI akan mengisikan datanya secara ajaib.
3. Sesuaikan atribut dinamis: Jika Anda Apotek, wajib isi *Expired Date*. Jika Anda Bengkel, tidak perlu mengisi apa-apa.

### 🛒 3. Transaksi Cepat & Bebas Hambatan (Checkout)
1. Scan barcode produk atau sentuh kotak produk di halaman layar POS.
2. Atur kuantitas (jika mencapai batas kuantitas Grosir, harga otomatis turun).
3. Jika antrian terhambat pelanggan yang mengambil dompet, cukup klik **Hold Bill** untuk meminggirkan tagihannya dan layani pelanggan berikutnya.
4. Pilih metode pembayaran (CASH, QRIS, KASBON). Apabila toko Anda adalah Bengkel atau Jasa Salon, sistem akan otomatis meminta input **Nama Mekanik/Stylist** sebelum mencetak struk.
5. Transaksi selesai dan tersimpan dengan arsitektur tahan kegagalan (Single Database Transaction).

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
