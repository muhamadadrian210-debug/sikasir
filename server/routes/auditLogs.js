const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireRole, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const tid = tenantId(req);

    // Proteksi Hak Akses Paket (Log Audit Forensik eksklusif Paket 1 Tahun / ENTERPRISE)
    const [tRows] = await pool.execute('SELECT plan_tier, license_code FROM tenants WHERE id = ?', [tid]);
    const t = tRows[0];
    const code = String(t?.license_code || '').toUpperCase();
    const plan = code.includes('TRIAL') ? 'ENTERPRISE' : (t?.plan_tier || (code.includes('365D') || code.includes('ENTERPRISE') ? 'ENTERPRISE' : code.includes('180D') || code.includes('PRO') ? 'PRO' : 'BASIC'));
    if (plan !== 'ENTERPRISE') {
      return res.status(403).json({
        error: 'Fitur Log Aktivitas Forensik eksklusif untuk Paket 1 Tahun (Enterprise). Silakan perpanjang lisensi toko Anda.',
        upgrade_required: true,
        required_plan: 'ENTERPRISE'
      });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const [rows] = await pool.execute(
      `SELECT id, user_id, username, action, resource_meta, ip, created_at
       FROM audit_logs
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [tid, limit.toString(), offset.toString()]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat log audit' });
  }
});

module.exports = router;
