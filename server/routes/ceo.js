const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');

const router = express.Router();
const CEO_PIN = '2421204';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * Middleware untuk memvalidasi akses CEO
 * Mendukung header 'x-ceo-pin', query '?pin=', atau Bearer token CEO
 */
function ceoAuthMiddleware(req, res, next) {
  const pinHeader = req.headers['x-ceo-pin'];
  const pinQuery = req.query.pin;
  const authHeader = req.headers.authorization;

  if (pinHeader === CEO_PIN || pinQuery === CEO_PIN) {
    return next();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.is_ceo === true) {
        return next();
      }
    } catch {
      // Token tidak valid, lanjutkan ke penolakan
    }
  }

  return res.status(401).json({
    error: 'Akses CEO ditolak. PIN salah atau tidak ada otorisasi.',
  });
}

/**
 * POST /api/ceo/login
 * Validasi PIN 2421204 dan keluarkan session token CEO
 */
router.post('/login', (req, res) => {
  const { pin } = req.body || {};
  if (String(pin).trim() !== CEO_PIN) {
    return res.status(401).json({
      success: false,
      error: 'PIN CEO tidak valid. Akses ditolak.',
    });
  }

  const token = jwt.sign(
    { role: 'ceo', is_ceo: true, login_at: new Date().toISOString() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Otorisasi Radar CEO Berhasil',
    token,
  });
});

/**
 * GET /api/ceo/tenants
 * Mengambil radar semua toko, status langganan, dan sisa masa aktif
 */
router.get('/tenants', ceoAuthMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        t.id, 
        t.name, 
        t.slug, 
        t.subscription_start, 
        t.subscription_until, 
        t.license_code, 
        t.status,
        t.created_at,
        DATEDIFF(t.subscription_until, NOW()) AS days_remaining,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS total_users,
        (SELECT COUNT(*) FROM transactions tr WHERE tr.tenant_id = t.id) AS total_transactions,
        (SELECT COALESCE(SUM(tr.total), 0) FROM transactions tr WHERE tr.tenant_id = t.id) AS total_omset
      FROM tenants t
      ORDER BY 
        CASE 
          WHEN t.subscription_until IS NULL THEN 3
          WHEN DATEDIFF(t.subscription_until, NOW()) < 0 THEN 2
          WHEN DATEDIFF(t.subscription_until, NOW()) <= 7 THEN 0
          ELSE 1
        END ASC,
        t.id ASC
    `);

    const summary = {
      total_stores: rows.length,
      active_stores: 0,
      near_expiry_stores: 0,
      expired_stores: 0,
    };

    const enhancedRows = rows.map((r) => {
      const days = r.days_remaining !== null ? Number(r.days_remaining) : null;
      let badge = 'active';
      let badgeLabel = 'Aktif';

      if (days === null) {
        badge = 'unknown';
        badgeLabel = 'Belum Diatur';
      } else if (days < 0) {
        badge = 'expired';
        badgeLabel = 'Kadaluarsa';
        summary.expired_stores += 1;
      } else if (days <= 7) {
        badge = 'warning';
        badgeLabel = `Segera Habis (${days} Hari)`;
        summary.near_expiry_stores += 1;
      } else {
        badge = 'active';
        badgeLabel = `${days} Hari Aktif`;
        summary.active_stores += 1;
      }

      return {
        ...r,
        days_remaining: days,
        badge,
        badgeLabel,
      };
    });

    res.json({
      success: true,
      summary,
      tenants: enhancedRows,
    });
  } catch (err) {
    console.error('[ceo-radar] Error fetch tenants:', err);
    res.status(500).json({ error: 'Gagal mengambil data radar toko: ' + err.message });
  }
});

/**
 * POST /api/ceo/tenants/:id/extend
 * Perpanjang masa aktif langganan toko tertentu (tambah hari atau ubah tanggal)
 */
router.post('/tenants/:id/extend', ceoAuthMiddleware, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    const { days, until_date, notes } = req.body || {};

    const [tenants] = await pool.execute('SELECT id, name, subscription_until FROM tenants WHERE id = ?', [tenantId]);
    if (tenants.length === 0) {
      return res.status(404).json({ error: 'Toko tidak ditemukan' });
    }

    const t = tenants[0];
    let query = '';
    let params = [];

    if (until_date) {
      query = 'UPDATE tenants SET subscription_until = ?, status = \'active\' WHERE id = ?';
      params = [until_date, tenantId];
    } else {
      const addDays = parseInt(days || 30, 10);
      query = `
        UPDATE tenants 
        SET 
          subscription_until = CASE 
            WHEN subscription_until IS NULL OR subscription_until < NOW() 
              THEN DATE_ADD(NOW(), INTERVAL ? DAY)
            ELSE DATE_ADD(subscription_until, INTERVAL ? DAY)
          END,
          status = 'active'
        WHERE id = ?
      `;
      params = [addDays, addDays, tenantId];
    }

    await pool.execute(query, params);

    const [updated] = await pool.execute(
      'SELECT id, name, subscription_start, subscription_until, DATEDIFF(subscription_until, NOW()) AS days_remaining FROM tenants WHERE id = ?',
      [tenantId]
    );

    res.json({
      success: true,
      message: `Masa aktif toko "${t.name}" berhasil diperpanjang`,
      tenant: updated[0],
    });
  } catch (err) {
    console.error('[ceo-radar] Error extend tenant:', err);
    res.status(500).json({ error: 'Gagal memperpanjang masa aktif toko: ' + err.message });
  }
});

/**
 * DELETE /api/ceo/tenants/:id
 * Hapus toko beserta seluruh dependensinya (kecuali Kopi Papa Ganteng ID 27)
 */
router.delete('/tenants/:id', ceoAuthMiddleware, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    if (tenantId === 27) {
      return res.status(400).json({ error: 'Kopi Papa Ganteng (ID 27) dilindungi dan tidak boleh dihapus.' });
    }

    // Cascade delete manual untuk MySQL constraints
    try {
      await pool.execute('DELETE ti FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id WHERE t.tenant_id = ?', [tenantId]);
    } catch {}
    try { await pool.execute('DELETE FROM transactions WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM products WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM categories WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM users WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM expenses WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM shifts WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM incoming_goods WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM audit_logs WHERE tenant_id = ?', [tenantId]); } catch {}
    try { await pool.execute('DELETE FROM dine_in_orders WHERE tenant_id = ?', [tenantId]); } catch {}

    const [delRes] = await pool.execute('DELETE FROM tenants WHERE id = ?', [tenantId]);

    res.json({
      success: true,
      message: `Toko ID ${tenantId} berhasil dihapus dari sistem`,
      affectedRows: delRes.affectedRows,
    });
  } catch (err) {
    console.error('[ceo-radar] Error delete tenant:', err);
    res.status(500).json({ error: 'Gagal menghapus toko: ' + err.message });
  }
});

/**
 * Helper generate random segment: huruf & angka (tanpa karakter ambigu seperti 0/O atau 1/I)
 */
function randomSegment(len = 5) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  const randBytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    res += chars[randBytes[i] % chars.length];
  }
  return res;
}

/**
 * POST /api/ceo/license-codes/generate
 * Buat kode lisensi otomatis dengan awalan SIV- (contoh: SIV-30D-K8J2X-9P4MQ)
 */
router.post('/license-codes/generate', ceoAuthMiddleware, async (req, res) => {
  try {
    const { duration_days = 30, notes = '', count = 1 } = req.body || {};
    const days = parseInt(duration_days, 10) || 30;
    const numCodes = Math.min(Math.max(parseInt(count, 10) || 1, 1), 20);

    const generated = [];

    for (let i = 0; i < numCodes; i++) {
      const part1 = randomSegment(5);
      const part2 = randomSegment(5);
      const code = `SIV-${days}D-${part1}-${part2}`;

      await pool.execute(
        'INSERT INTO license_codes (code, duration_days, notes) VALUES (?, ?, ?)',
        [code, days, notes || `Dibuat oleh CEO via Dashboard Radar`]
      );

      const whatsappText = `Halo kak, ini kode lisensi resmi SiKasir untuk toko Anda:\n\n*${code}*\n(Masa aktif: ${days} hari)\n\nSilakan buka aplikasi SiKasir > menu Lisensi Key > masukkan kode tersebut untuk mengaktifkan/memperpanjang akun toko Anda. Hubungi kami jika ada kendala. Terima kasih!`;

      generated.push({
        code,
        duration_days: days,
        notes,
        whatsapp_share_text: whatsappText,
        whatsapp_share_url: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
      });
    }

    res.json({
      success: true,
      message: `Berhasil membuat ${numCodes} kode lisensi baru`,
      codes: generated,
    });
  } catch (err) {
    console.error('[ceo-radar] Error generate license codes:', err);
    res.status(500).json({ error: 'Gagal membuat kode lisensi: ' + err.message });
  }
});

/**
 * GET /api/ceo/license-codes
 * Riwayat kode lisensi yang telah dibuat
 */
router.get('/license-codes', ceoAuthMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        lc.id,
        lc.code,
        lc.duration_days,
        lc.created_at,
        lc.used_at,
        lc.used_by_tenant_id,
        lc.notes,
        t.name AS used_by_tenant_name
      FROM license_codes lc
      LEFT JOIN tenants t ON t.id = lc.used_by_tenant_id
      ORDER BY lc.id DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      codes: rows,
    });
  } catch (err) {
    console.error('[ceo-radar] Error fetch license codes:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat kode lisensi: ' + err.message });
  }
});

module.exports = router;

