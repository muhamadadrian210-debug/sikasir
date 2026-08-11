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

/** Health check — berguna untuk debugging koneksi */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/** Setup admin pertama — tidak butuh auth */
app.use('/api/setup', setupRoutes);

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

app.use(express.static(path.join(__dirname, '..', 'public')));

/** Global error handler — tangkap error tak terduga agar tidak crash diam-diam */
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
