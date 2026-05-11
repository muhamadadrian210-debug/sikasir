const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireRole, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');
const { auditAdmin } = require('../lib/audit');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);

router.get('/', async (req, res) => {
  try {
    const tid = tenantId(req);
    const [rows] = await pool.execute(
      'SELECT id, name FROM categories WHERE tenant_id = ? ORDER BY name',
      [tid]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat kategori' });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const tid = tenantId(req);
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nama kategori wajib' });
    const [r] = await pool.execute(
      'INSERT INTO categories (tenant_id, name) VALUES (?, ?)',
      [tid, name]
    );
    await auditAdmin(req, 'category.create', { id: r.insertId, name });
    res.status(201).json({ id: r.insertId, name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Kategori sudah ada' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal menambah kategori' });
  }
});

module.exports = router;
