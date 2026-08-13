const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');
const { auditAdmin } = require('../lib/audit');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);

// Pastikan tabel expenses otomatis ada
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT,
        user_name VARCHAR(100),
        store_source VARCHAR(200) NOT NULL COMMENT 'Nama Toko / Supplier / Keperluan',
        category VARCHAR(100) DEFAULT 'Supplier',
        amount DECIMAL(12, 2) NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_date (tenant_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[expenses] Tabel expenses siap.');
  } catch (e) {
    console.warn('[expenses] Init tabel expenses:', e.message);
  }
})();

// GET /api/expenses?period=daily|weekly|monthly
router.get('/', async (req, res) => {
  try {
    const tid = tenantId(req);
    const period = req.query.period || 'daily';
    const now = new Date();
    let start;
    if (period === 'weekly') {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
    } else if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const [rows] = await pool.execute(
      `SELECT id, tenant_id, user_id, user_name, store_source, category, amount, notes, created_at
       FROM expenses
       WHERE tenant_id = ? AND created_at >= ?
       ORDER BY created_at DESC`,
      [tid, start]
    );

    const [tot] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_expense, COUNT(*) AS count
       FROM expenses
       WHERE tenant_id = ? AND created_at >= ?`,
      [tid, start]
    );

    res.json({
      expenses: rows,
      total_expense: Number(tot[0]?.total_expense || 0),
      count: Number(tot[0]?.count || 0),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat catatan pengeluaran/nota' });
  }
});

// POST /api/expenses (Tambah Bayar Nota / Kas Keluar)
router.post('/', async (req, res) => {
  try {
    const tid = tenantId(req);
    const user = req.user;
    const store_source = String(req.body?.store_source || '').trim();
    const category = String(req.body?.category || 'Supplier').trim();
    const amount = Number(req.body?.amount || 0);
    const notes = String(req.body?.notes || '').trim();

    if (!store_source) {
      return res.status(400).json({ error: 'Nama Toko Asal / Keperluan nota wajib diisi' });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: 'Nominal pembayaran nota harus lebih dari 0' });
    }

    const [r] = await pool.execute(
      `INSERT INTO expenses (tenant_id, user_id, user_name, store_source, category, amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tid, user?.id || null, user?.username || 'Kasir', store_source, category, amount, notes]
    );

    await auditAdmin(req, 'expense.create', {
      id: r.insertId,
      store_source,
      category,
      amount,
      notes,
    });

    res.status(201).json({
      id: r.insertId,
      message: 'Nota pengeluaran berhasil dicatat dan memotong kas hari ini',
      expense: {
        id: r.insertId,
        store_source,
        category,
        amount,
        notes,
        created_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal mencatat pengeluaran nota' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const tid = tenantId(req);
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });

    await pool.execute('DELETE FROM expenses WHERE id = ? AND tenant_id = ?', [id, tid]);
    await auditAdmin(req, 'expense.delete', { id });
    res.json({ message: 'Pengeluaran berhasil dihapus' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal menghapus pengeluaran' });
  }
});

module.exports = router;
