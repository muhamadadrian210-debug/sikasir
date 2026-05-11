const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireRole, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);
router.use(requireRole('admin'));

function periodWhere(period) {
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
  return start;
}

router.get('/sales-summary', async (req, res) => {
  try {
    const tid = tenantId(req);
    const period = req.query.period || 'daily';
    const start = periodWhere(period);
    const [rows] = await pool.execute(
      `SELECT DATE(t.created_at) AS day, SUM(t.total) AS revenue, COUNT(*) AS tx_count
       FROM transactions t
       WHERE t.tenant_id = ? AND t.created_at >= ?
       GROUP BY DATE(t.created_at)
       ORDER BY day`,
      [tid, start]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat ringkasan penjualan' });
  }
});

router.get('/margin', async (req, res) => {
  try {
    const tid = tenantId(req);
    const period = req.query.period || 'daily';
    const start = periodWhere(period);
    const [rows] = await pool.execute(
      `SELECT p.id, p.barcode, p.name,
              SUM(ti.qty) AS qty_sold,
              SUM(ti.subtotal) AS revenue,
              SUM(ti.qty * p.purchase_price) AS cost,
              SUM(ti.subtotal - ti.qty * p.purchase_price) AS profit
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN products p ON p.id = ti.product_id
       WHERE t.tenant_id = ? AND t.created_at >= ?
       GROUP BY p.id, p.barcode, p.name
       ORDER BY profit DESC`,
      [tid, start]
    );
    const [tot] = await pool.execute(
      `SELECT COALESCE(SUM(ti.subtotal),0) AS revenue,
              COALESCE(SUM(ti.qty * p.purchase_price),0) AS cost
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN products p ON p.id = ti.product_id
       WHERE t.tenant_id = ? AND t.created_at >= ?`,
      [tid, start]
    );
    res.json({
      products: rows,
      total_revenue: Number(tot[0]?.revenue || 0),
      total_cost: Number(tot[0]?.cost || 0),
      total_profit: Number(tot[0]?.revenue || 0) - Number(tot[0]?.cost || 0),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat margin' });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const tid = tenantId(req);
    const threshold = parseInt(req.query.threshold, 10) || 10;
    const [rows] = await pool.execute(
      `SELECT id, barcode, name, stock, sale_price
       FROM products
       WHERE tenant_id = ? AND stock <= ?
       ORDER BY stock ASC, name`,
      [tid, threshold]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat stok menipis' });
  }
});

module.exports = router;
