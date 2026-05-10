const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { auditAdmin } = require('../lib/audit');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/summary/today', async (req, res) => {
  try {
    let day = req.query.date ? String(req.query.date).slice(0, 10) : null;
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      day = new Date().toISOString().slice(0, 10);
    }
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS items, COALESCE(SUM(quantity),0) AS total_qty
       FROM incoming_goods
       WHERE entry_date = ?`,
      [day]
    );
    res.json(rows[0] || { items: 0, total_qty: 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal ringkasan barang masuk' });
  }
});

router.get('/', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.execute(
      `SELECT g.id, g.entry_date, g.description, g.quantity, g.unit, g.product_id, g.created_at,
              u.username AS created_by_name, p.name AS product_name
       FROM incoming_goods g
       JOIN users u ON u.id = g.created_by
       LEFT JOIN products p ON p.id = g.product_id
       WHERE g.entry_date = ?
       ORDER BY g.created_at DESC`,
      [date]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat barang masuk' });
  }
});

router.post('/', async (req, res) => {
  const { entry_date, description, quantity, unit, product_id } = req.body || {};
  const desc = String(description || '').trim();
  if (!desc) return res.status(400).json({ error: 'Deskripsi wajib (contoh: rokok filter 1 slof)' });
  const dateStr = entry_date || new Date().toISOString().slice(0, 10);
  const qty = quantity !== undefined && quantity !== null ? Number(quantity) : 1;
  if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Jumlah tidak valid' });
  const unitStr = unit ? String(unit).trim().slice(0, 32) : null;
  const pid = product_id ? parseInt(product_id, 10) : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.execute(
      `INSERT INTO incoming_goods (entry_date, description, quantity, unit, product_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dateStr, desc, qty, unitStr, pid || null, req.user.id]
    );

    if (pid) {
      const [u] = await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, pid]);
      if (!u.affectedRows) {
        await conn.rollback();
        return res.status(400).json({ error: 'Produk terpilih tidak ditemukan' });
      }
    }

    await conn.commit();
    await auditAdmin(req, 'incoming.create', { id: ins.insertId, description: desc, date: dateStr });
    res.status(201).json({ id: ins.insertId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Gagal menyimpan barang masuk' });
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [r] = await pool.execute('DELETE FROM incoming_goods WHERE id=?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Data tidak ditemukan' });
    await auditAdmin(req, 'incoming.delete', { id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal menghapus' });
  }
});

module.exports = router;
