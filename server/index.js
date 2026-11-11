require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { securityHeaders, legacyXssProtectionHeader } = require('./middleware/securityHeaders');
const { botBlockMiddleware } = require('./middleware/botBlock');
const { ipBlacklistMiddleware } = require('./middleware/ipBlacklist');
const { tempBanMiddleware } = require('./middleware/tempBan');
const { apiLimiter } = require('./middleware/rateLimiter');
const { sanitizeBody } = require('./middleware/sanitize');
const { issueCsrf, csrfProtection } = require('./middleware/csrf');
const { cyberFirewallMiddleware } = require('./middleware/cyberFirewall');
const cybersecurityRoutes = require('./routes/cybersecurity');

const setupRoutes = require('./routes/setup');
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const transactionsRoutes = require('./routes/transactions');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');
const incomingRoutes = require('./routes/incoming');
const auditLogsRoutes = require('./routes/auditLogs');
const aiRoutes = require('./routes/ai');
const backupRoutes = require('./routes/backup');
const expensesRoutes = require('./routes/expenses');
const shiftsRoutes = require('./routes/shifts');

const cdsRoutes = require('./routes/cds');
const dineInRoutes = require('./routes/dineIn');
const licenseRoutes = require('./routes/license');
const ceoRoutes = require('./routes/ceo');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

app.use(securityHeaders());
app.use(legacyXssProtectionHeader());
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(ipBlacklistMiddleware);
app.use(botBlockMiddleware);
app.use(tempBanMiddleware);

app.use(express.json({ limit: '5mb' }));
app.use(cyberFirewallMiddleware); // Master 11-Layer Cybersecurity Firewall
app.use(sanitizeBody);

/** CSRF harus di luar rate limit & tetap sebelum csrfProtection untuk mutasi lain */
app.get('/api/csrf-token', issueCsrf);

/** Health check: berguna untuk debugging koneksi */
app.get('/api/health', async (req, res) => {
  try {
    const { pool } = require('./config/db');
    const [rows] = await pool.query('SELECT 1 AS alive');
    res.json({
      status: 'ok',
      db: 'connected',
      ping: rows[0]?.alive === 1 ? 'pong' : 'ok',
      time: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      message: err.message,
      time: new Date().toISOString()
    });
  }
});

/** Customer Display System (CDS): akses terbuka lokal per tenant */
app.use('/api/cds', cdsRoutes);

/** Dine-In & QR Table Integration: Ekosistem Sivilize Dine Lite (2-way sync) */
app.use('/api/dine-in', dineInRoutes);

/** License Activation: Aktivasi Kode Sewa Website Sivilize Ecosystem */
app.use('/api/license', licenseRoutes);

/** Radar CEO & Lisensi: Akses Khusus Founder PIN 241204 */
app.use('/api/ceo', ceoRoutes);

/** Setup admin pertama: tidak butuh auth */
app.use('/api/setup', setupRoutes);

/** Informasi Versi & Update Notifikasi Resmi SiKasir */
app.get('/api/app-version', (req, res) => {
  res.json({
    version: '3.10.1',
    versionCode: 401,
    releaseDate: '2026-11-11',
    title: 'SiKasir v3.10.1 Fitur Maintenance Mode & Universal Direct Bluetooth Printing',
    notes: 'Penambahan kontrol Mode Pemeliharaan Sistem (Major Update Lockdown) di panel CEO dan cetak printer Bluetooth langsung tanpa aplikasi tambahan.',
    features: [
      'Mode Pemeliharaan Sistem (Maintenance Mode) dengan layar pengunci otomatis saat update mayor berlangsung',
      'Kontrol penuh aktivasi dan penonaktifan maintenance dari CEO Panel',
      'Direct Web Bluetooth ESC/POS engine: cetak struk tanpa instal aplikasi pihak ketiga apa pun',
      'Akses penuh Enterprise 1 bulan gratis untuk seluruh mitra trial'
    ],
    apk_url: '/download/apk'
  });
});

/** Broadcast Pengumuman Berjalan Toko (Marquee Ticker) */
app.get('/api/broadcast/active', async (req, res) => {
  try {
    const { pool } = require('./config/db');
    const [rows] = await pool.execute('SELECT message, is_active FROM global_announcements WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      return res.json({ active: true, message: rows[0].message });
    }
    res.json({ active: false, message: '' });
  } catch {
    res.json({ active: false, message: '' });
  }
});

/** Mode Pemeliharaan Sistem (Maintenance Mode State & Middleware) */
let maintenanceCache = {
  is_active: false,
  title: 'Pemeliharaan Sistem Skala Besar (Major Update)',
  message: 'Kami sedang melakukan pembaruan inti pada server dan basis data SiKasir untuk menghadirkan performa yang lebih cepat dan aman.',
  estimated_finish: '15-30 Menit',
  last_checked: 0
};

async function getMaintenanceState() {
  const now = Date.now();
  if (now - maintenanceCache.last_checked < 4000) {
    return maintenanceCache;
  }
  try {
    const { pool } = require('./config/db');
    const [rows] = await pool.execute('SELECT is_active, title, message, estimated_finish FROM system_maintenance ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      maintenanceCache = {
        is_active: rows[0].is_active === 1,
        title: rows[0].title || 'Pemeliharaan Sistem Skala Besar (Major Update)',
        message: rows[0].message || 'Kami sedang melakukan pembaruan sistem.',
        estimated_finish: rows[0].estimated_finish || '15-30 Menit',
        last_checked: now
      };
    }
  } catch (err) {
    console.warn('[maintenance] Gagal membaca state dari DB:', err.message);
  }
  return maintenanceCache;
}

/** Endpoint publik status maintenance untuk PWA, webapp, dan APK */
app.get('/api/maintenance/status', async (req, res) => {
  const state = await getMaintenanceState();
  res.json({
    maintenance: state.is_active,
    title: state.title,
    message: state.message,
    estimated_finish: state.estimated_finish
  });
});

/** Middleware pengunci aplikasi saat maintenance aktif (kecuali route CEO, status, dan CSRF) */
app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  if (
    req.path.startsWith('/api/ceo') ||
    req.path === '/api/maintenance/status' ||
    req.path === '/api/app-version' ||
    req.path === '/api/csrf-token'
  ) {
    return next();
  }

  const state = await getMaintenanceState();
  if (state.is_active) {
    return res.status(503).json({
      error: 'Sistem sedang dalam pemeliharaan (Maintenance Mode). Sementara tidak dapat digunakan hingga pembaruan selesai.',
      maintenance: true,
      title: state.title,
      message: state.message,
      estimated_finish: state.estimated_finish
    });
  }
  next();
});

app.use('/api', apiLimiter);
app.use('/api', csrfProtection);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/incoming-goods', incomingRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/cybersecurity', cybersecurityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/shifts', shiftsRoutes);

/** Download File APK Android Resmi */
app.get('/download/apk', (req, res) => {
  const fs = require('fs');
  const candidates = [
    path.join(__dirname, '..', 'SiKasir-v3.9.0.apk'),
    path.join(__dirname, '..', 'public', 'downloads', 'sikasir-pos.apk'),
    path.join(__dirname, '..', 'SiKasir-v3.8.6.apk'),
    path.join(__dirname, '..', 'SiKasir-POS-Mobile.apk'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return res.download(c, 'SiKasir-POS-v3.9.0.apk');
    }
  }
  if (process.env.APK_DOWNLOAD_URL) {
    return res.redirect(process.env.APK_DOWNLOAD_URL);
  }
  res.status(404).send('File APK belum tersedia untuk diunduh saat ini.');
});

app.get('/ceo', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'ceo.html'));
});

app.use(express.static(path.join(__dirname, '..', 'public')));

/** Global error handler: tangkap error tak terduga agar tidak crash diam-diam */
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

let server;
if (require.main === module || !process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`SiKasir API http://localhost:${PORT}`);
  });
}

/** Tangkap unhandled rejection agar proses tidak mati diam-diam */
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  // Beri waktu log tertulis sebelum exit
  setTimeout(() => process.exit(1), 500);
});

module.exports = app;
