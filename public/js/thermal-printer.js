/**
 * SiKasir Direct Web Bluetooth Thermal Printer Engine (ESC/POS)
 * Zero third-party APK/app needed. Connects directly from browser/PWA to Bluetooth Thermal Printers.
 * Product by Sivilize Corp.
 */

class ThermalBluetoothPrinter {
  constructor() {
    this.device = null;
    this.characteristic = null;
    this.isConnecting = false;
    this.printerWidth = 32; // Default 58mm = 32 chars, 80mm = 48 chars
    this.listeners = [];
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  isConnected() {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  getDeviceName() {
    return this.device ? (this.device.name || 'Thermal Printer') : null;
  }

  onStatusChange(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
  }

  notifyStatus() {
    const status = {
      connected: this.isConnected(),
      name: this.getDeviceName(),
    };
    this.listeners.forEach((fn) => {
      try { fn(status); } catch (e) { console.error(e); }
    });
  }

  async connect() {
    if (!this.isSupported()) {
      throw new Error('Browser ini belum mendukung Web Bluetooth API. Gunakan Google Chrome atau Microsoft Edge.');
    }

    if (this.isConnected()) {
      return this.device;
    }

    this.isConnecting = true;
    try {
      // Daftar UUID umum untuk printer thermal Bluetooth (ESC/POS)
      const optionalServices = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard 18f0 service
        '0000ff00-0000-1000-8000-00805f9b34fb', // FF00 common thermal
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Pos-58 common
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
        '0000ae00-0000-1000-8000-00805f9b34fb',
        '0000af00-0000-1000-8000-00805f9b34fb'
      ];

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices
      });

      this.device = device;
      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
        this.notifyStatus();
      });

      const server = await device.gatt.connect();

      // Cari service dan characteristic yang memiliki akses Write / WriteWithoutResponse
      let targetCharacteristic = null;
      for (const serviceUuid of optionalServices) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              targetCharacteristic = c;
              break;
            }
          }
        } catch {
          // Lewati service jika printer tidak memilikinya
        }
        if (targetCharacteristic) break;
      }

      // Fallback jika tidak cocok dengan UUID di atas: scan seluruh primary services
      if (!targetCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const s of services) {
            try {
              const chars = await s.getCharacteristics();
              for (const c of chars) {
                if (c.properties.write || c.properties.writeWithoutResponse) {
                  targetCharacteristic = c;
                  break;
                }
              }
            } catch {}
            if (targetCharacteristic) break;
          }
        } catch {}
      }

      if (!targetCharacteristic) {
        throw new Error('Printer Bluetooth terhubung, namun port tulis ESC/POS tidak ditemukan.');
      }

      this.characteristic = targetCharacteristic;
      localStorage.setItem('sikasir_bt_last_name', device.name || 'Thermal Printer');
      this.notifyStatus();
      return device;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.notifyStatus();
  }

  /**
   * Helper format baris struk: rata kiri dan rata kanan dengan spasi pengisi
   */
  formatRow(left, right, width = 32) {
    const l = String(left || '');
    const r = String(right || '');
    const spacesNeeded = width - l.length - r.length;
    if (spacesNeeded <= 0) {
      return l + '\n' + ' '.repeat(Math.max(0, width - r.length)) + r;
    }
    return l + ' '.repeat(spacesNeeded) + r;
  }

  formatCenter(text, width = 32) {
    const s = String(text || '').trim();
    if (s.length >= width) return s;
    const pad = Math.floor((width - s.length) / 2);
    return ' '.repeat(pad) + s;
  }

  formatDivider(char = '-', width = 32) {
    return char.repeat(width);
  }

  /**
   * Bangun byte ESC/POS dari objek struk transaksi
   */
  buildEscPosBytes(rec) {
    const width = this.printerWidth || 32;
    const encoder = new TextEncoder();
    const parts = [];

    const pushRaw = (bytes) => parts.push(new Uint8Array(bytes));
    const pushText = (str) => parts.push(encoder.encode(str + '\n'));

    // ESC @ : Inisialisasi printer
    pushRaw([0x1B, 0x40]);

    // Rata Tengah (ESC a 1)
    pushRaw([0x1B, 0x61, 0x01]);

    // Ukuran Font Besar / Tebal untuk Nama Toko (GS ! 0x11 = Double Height & Width, ESC E 1 = Bold)
    pushRaw([0x1B, 0x45, 0x01]); // Bold on
    pushRaw([0x1D, 0x21, 0x11]); // Double size
    const storeName = rec.store_name || (typeof getStoreDisplayName === 'function' ? getStoreDisplayName() : 'SIKASIR STORE');
    pushText(storeName);

    // Kembalikan ukuran font normal
    pushRaw([0x1D, 0x21, 0x00]);
    pushRaw([0x1B, 0x45, 0x00]); // Bold off

    pushText('Struk Pembelian Resmi');
    const dateStr = new Date(rec.time || Date.now()).toLocaleString('id-ID');
    pushText(`No: #${rec.id} | ${dateStr}`);
    const cashierName = rec.kasir || (typeof user !== 'undefined' && user ? user.username : 'Kasir');
    pushText(`Kasir: ${cashierName}`);

    // Garis Pemisah
    pushRaw([0x1B, 0x61, 0x00]); // Rata Kiri
    pushText(this.formatDivider('-', width));

    // Metadata Transaksi (Nomor Meja, Pembayaran, dll)
    if (rec.metadata) {
      if (rec.metadata.table_number || rec.metadata.table) {
        pushText(this.formatRow('Nomor Meja:', String(rec.metadata.table_number || rec.metadata.table), width));
      }
      if (rec.metadata.payment_method) {
        let pm = String(rec.metadata.payment_method).toUpperCase();
        if (rec.metadata.qris_ref) pm += ` (${rec.metadata.qris_ref})`;
        pushText(this.formatRow('Metode Bayar:', pm, width));
      }
      if (rec.metadata.nopol) {
        pushText(this.formatRow('No. Plat:', String(rec.metadata.nopol), width));
      }
      if (rec.metadata.kapster) {
        pushText(this.formatRow('Stylist/Kapster:', String(rec.metadata.kapster), width));
      }
      pushText(this.formatDivider('-', width));
    }

    // Rincian Produk / Barang
    const items = rec.items || [];
    items.forEach((item) => {
      pushText(item.name);
      const calcStr = `${item.qty} x ${typeof money === 'function' ? money(item.sale_price) : item.sale_price}`;
      const subtotalStr = typeof money === 'function' ? money(item.qty * item.sale_price) : String(item.qty * item.sale_price);
      pushText(this.formatRow(calcStr, subtotalStr, width));
    });

    // Garis Pemisah
    pushText(this.formatDivider('-', width));

    // Ringkasan Pembayaran
    const formatMoney = (val) => (typeof money === 'function' ? money(val) : String(val));
    pushText(this.formatRow('Subtotal', formatMoney(rec.total), width));

    // Total Tebal
    pushRaw([0x1B, 0x45, 0x01]); // Bold on
    pushText(this.formatRow('TOTAL', formatMoney(rec.total), width));
    pushRaw([0x1B, 0x45, 0x00]); // Bold off

    pushText(this.formatRow('Tunai / Bayar', formatMoney(rec.paid), width));
    pushText(this.formatRow('Kembalian', formatMoney(rec.change), width));

    // Garis Pemisah Akhir
    pushText(this.formatDivider('=', width));

    // Footer Ucapan Terima Kasih (Rata Tengah)
    pushRaw([0x1B, 0x61, 0x01]);
    pushText('Terima kasih atas kunjungan Anda!');
    pushText('Barang yang dibeli tidak dapat ditukar');
    pushText('SiKasir by Sivilize Corp');

    // Feed baris kosong 4 baris agar kertas keluar sempurna
    pushText('\n\n\n');

    // Potong kertas otomatis (GS V 66 0) jika printer mendukung autocutter
    pushRaw([0x1D, 0x56, 0x42, 0x00]);

    // Gabungkan seluruh buffer Uint8Array
    let totalLen = parts.reduce((acc, p) => acc + p.length, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
      combined.set(p, offset);
      offset += p.length;
    }
    return combined;
  }

  /**
   * Kirim data biner ESC/POS dalam potongan kecil (chunks) agar buffer BLE tidak overflow
   */
  async sendBytes(bytes) {
    if (!this.isConnected()) {
      throw new Error('Printer Bluetooth belum terhubung.');
    }

    const chunkSize = 100; // 100 bytes per paket BLE
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.slice(i, i + chunkSize);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(slice);
      } else {
        await this.characteristic.writeValue(slice);
      }
      // Delay 20ms antara chunk untuk stabilitas printer thermal
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  /**
   * Cetak struk langsung via Bluetooth
   */
  async printReceipt(rec) {
    const bytes = this.buildEscPosBytes(rec);
    await this.sendBytes(bytes);
    return true;
  }

  /**
   * Test print struk sederhana untuk verifikasi koneksi
   */
  async printTest() {
    const testRec = {
      id: 'TEST-001',
      time: Date.now(),
      store_name: typeof getStoreDisplayName === 'function' ? getStoreDisplayName() : 'SIKASIR PRINTER TEST',
      kasir: 'Administrator',
      items: [
        { name: 'Kertas Thermal 58mm/80mm', qty: 1, sale_price: 0 },
        { name: 'Direct Bluetooth ESC/POS', qty: 1, sale_price: 0 },
      ],
      total: 0,
      paid: 0,
      change: 0,
      metadata: {
        payment_method: 'BLUETOOTH DIRECT',
      }
    };
    return await this.printReceipt(testRec);
  }
}

// Instance global thermal printer
window.thermalPrinter = new ThermalBluetoothPrinter();

