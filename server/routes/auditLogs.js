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
