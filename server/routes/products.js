const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { auditAdmin } = require('../lib/audit');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const q = req.query.q ? `%${String(req.query.q).trim()}%` : null;
    let sql = `
      SELECT p.id, p.barcode, p.name, p.purchase_price, p.sale_price, p.stock,
             p.category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
    `;
    const params = [];
    if (q) {
      sql += ' WHERE p.name LIKE ? OR p.barcode LIKE ?';
      params.push(q, q);
    }
    sql += ' ORDER BY p.name';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat produk' });
  }
});

router.get('/barcode/:code', async (req, res) => {
  try {
    const code = String(req.params.code).trim();
    const [rows] = await pool.execute(
      `SELECT p.id, p.barcode, p.name, p.purchase_price, p.sale_price, p.stock,
              p.category_id, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = ? LIMIT 1`,
      [code]
    );
    if (!rows.length) return res.status(404).json({ error: 'Barang tidak ditemukan' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal mencari barang' });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { barcode, name, purchase_price, sale_price, stock, category_id } = req.body || {};
    const bc = String(barcode || '').trim();
    const nm = String(name || '').trim();
    if (!bc || !nm) return res.status(400).json({ error: 'Barcode dan nama wajib' });
    const pp = Number(purchase_price);
    const sp = Number(sale_price);
    const st = parseInt(stock, 10);
    if (Number.isNaN(pp) || Number.isNaN(sp) || Number.isNaN(st)) {
      return res.status(400).json({ error: 'Harga dan stok tidak valid' });
    }
    const catId = category_id ? parseInt(category_id, 10) : null;
    const [r] = await pool.execute(
      `INSERT INTO products (barcode, name, purchase_price, sale_price, stock, category_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bc, nm, pp, sp, st, catId || null]
    );
    await auditAdmin(req, 'product.create', { id: r.insertId, barcode: bc });
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Barcode sudah terdaftar' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal menyimpan produk' });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { barcode, name, purchase_price, sale_price, stock, category_id } = req.body || {};
    const bc = String(barcode || '').trim();
    const nm = String(name || '').trim();
    if (!bc || !nm) return res.status(400).json({ error: 'Barcode dan nama wajib' });
    const pp = Number(purchase_price);
    const sp = Number(sale_price);
    const st = parseInt(stock, 10);
    if (Number.isNaN(pp) || Number.isNaN(sp) || Number.isNaN(st)) {
      return res.status(400).json({ error: 'Harga dan stok tidak valid' });
    }
    const catId = category_id ? parseInt(category_id, 10) : null;
    const [r] = await pool.execute(
      `UPDATE products SET barcode=?, name=?, purchase_price=?, sale_price=?, stock=?, category_id=?
       WHERE id=?`,
      [bc, nm, pp, sp, st, catId || null, id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    await auditAdmin(req, 'product.update', { id });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Barcode sudah dipakai produk lain' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal memperbarui produk' });
  }
});

router.patch('/:id/stock', requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const delta = parseInt(req.body?.delta, 10);
    if (Number.isNaN(delta)) return res.status(400).json({ error: 'delta tidak valid' });
    const [r] = await pool.execute(
      'UPDATE products SET stock = stock + ? WHERE id = ? AND stock + ? >= 0',
      [delta, id, delta]
    );
    if (!r.affectedRows) {
      const [p] = await pool.execute('SELECT stock FROM products WHERE id=?', [id]);
      if (!p.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
      return res.status(400).json({ error: 'Stok tidak mencukupi' });
    }
    await auditAdmin(req, 'product.stock_adjust', { id, delta });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal update stok' });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [r] = await pool.execute('DELETE FROM products WHERE id=?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    await auditAdmin(req, 'product.delete', { id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal menghapus produk' });
  }
});

module.exports = router;
