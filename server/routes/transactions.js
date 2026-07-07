const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireRole, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);

router.post('/checkout', requireRole('admin', 'kasir'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const tid = tenantId(req);
    const { items, paid } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Keranjang kosong' });
    }
    const paidNum = Number(paid);
    if (Number.isNaN(paidNum) || paidNum < 0) {
      return res.status(400).json({ error: 'Jumlah bayar tidak valid' });
    }

    let total = 0;
    const lines = [];
    for (const it of items) {
      const pid = parseInt(it.product_id, 10);
      const qty = parseInt(it.qty, 10);
      if (Number.isNaN(pid) || Number.isNaN(qty) || qty < 1) {
        return res.status(400).json({ error: 'Item tidak valid' });
      }
      // Scope product lookup to tenant
      const [prows] = await conn.execute(
        'SELECT id, sale_price, stock, name FROM products WHERE id = ? AND tenant_id = ? FOR UPDATE',
        [pid, tid]
      );
      if (!prows.length) {
        return res.status(400).json({ error: `Produk #${pid} tidak ada` });
      }
      const p = prows[0];
      if (p.stock < qty) {
        return res.status(400).json({ error: `Stok "${p.name}" tidak mencukupi` });
      }
      const unit = Number(p.sale_price);
      const sub = unit * qty;
      total += sub;
      lines.push({ product_id: pid, qty, unit_price: unit, subtotal: sub });
    }

    const changeAmt = paidNum - total;
    if (changeAmt < 0) {
      return res.status(400).json({ error: 'Uang kurang' });
    }

    await conn.beginTransaction();
    const [ins] = await conn.execute(
      'INSERT INTO transactions (tenant_id, user_id, total, paid, change_amount) VALUES (?, ?, ?, ?, ?)',
      [tid, req.user.id, total, paidNum, changeAmt]
    );
    const txId = ins.insertId;

    for (const line of lines) {
      await conn.execute(
        `INSERT INTO transaction_items (transaction_id, product_id, qty, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [txId, line.product_id, line.qty, line.unit_price, line.subtotal]
      );
      await conn.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?',
        [line.qty, line.product_id, tid]
      );
    }

    await conn.commit();
    res.status(201).json({
      transaction_id: txId,
      total,
      paid: paidNum,
      change: changeAmt,
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    // Task 2: catch foreign key constraint error (stale JWT user_id)
    if (e.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(401).json({
        error: 'Sesi tidak valid. Silakan logout dan login kembali.',
      });
    }
    res.status(500).json({ error: 'Gagal menyimpan transaksi' });
  } finally {
    conn.release();
  }
});

router.get('/', async (req, res) => {
  try {
    const tid = tenantId(req);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const kasirOnly = req.user.role === 'kasir';
    let sql = `
      SELECT t.id, t.user_id, u.username AS kasir_name, t.total, t.paid, t.change_amount, t.created_at
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.tenant_id = ?
    `;
    const params = [tid];
    if (kasirOnly) {
      sql += ' AND t.user_id = ?';
      params.push(req.user.id);
    }
    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit.toString(), offset.toString());
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat transaksi' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tid = tenantId(req);
    const id = parseInt(req.params.id, 10);
    const kasirOnly = req.user.role === 'kasir';
    let sql = `
      SELECT t.id, t.user_id, u.username AS kasir_name, t.total, t.paid, t.change_amount, t.created_at
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.id = ? AND t.tenant_id = ?
    `;
    const params = [id, tid];
    if (kasirOnly) {
      sql += ' AND t.user_id = ?';
      params.push(req.user.id);
    }
    const [trows] = await pool.execute(sql, params);
    if (!trows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const [items] = await pool.execute(
      `SELECT ti.id, ti.product_id, ti.qty, ti.unit_price, ti.subtotal, p.name AS product_name, p.barcode
       FROM transaction_items ti
       JOIN products p ON p.id = ti.product_id
       WHERE ti.transaction_id = ?`,
      [id]
    );
    res.json({ ...trows[0], items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat detail transaksi' });
  }
});

module.exports = router;
