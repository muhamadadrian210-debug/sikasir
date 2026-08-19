const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);

// Pastikan tabel shifts ada
async function ensureShiftsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        cashier_name VARCHAR(64) NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP NULL,
        initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
        expected_cash DECIMAL(12,2) NULL,
        actual_cash DECIMAL(12,2) NULL,
        variance DECIMAL(12,2) NULL,
        total_tx INT DEFAULT 0,
        total_sales DECIMAL(12,2) DEFAULT 0,
        notes TEXT NULL,
        status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
        INDEX idx_shifts_tenant (tenant_id),
        INDEX idx_shifts_status (status)
      )
    `);
  } catch (e) {
    console.error('[shifts] Error ensure table:', e.message);
  }
}
ensureShiftsTable();

// 1. Cek shift aktif kasir
router.get('/active', async (req, res) => {
  try {
    const tid = tenantId(req);
    const uid = req.user.id;

    const [rows] = await pool.execute(`
      SELECT * FROM shifts 
      WHERE tenant_id = ? AND user_id = ? AND status = 'OPEN' 
      ORDER BY id DESC LIMIT 1
    `, [tid, uid]);

    if (rows.length === 0) {
      return res.json({ active: false, shift: null });
    }

    const shift = rows[0];
    // Hitung total transaksi dan penjualan selama shift aktif ini
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(id) as tx_count,
        COALESCE(SUM(total), 0) as total_sales
      FROM transactions
      WHERE tenant_id = ? AND user_id = ? AND created_at >= ?
    `, [tid, uid, shift.start_time]);

    const txCount = Number(stats[0]?.tx_count || 0);
    const totalSales = Number(stats[0]?.total_sales || 0);
    const expectedCash = Number(shift.initial_cash) + totalSales;

    res.json({
      active: true,
      shift: {
        ...shift,
        total_tx: txCount,
        total_sales: totalSales,
        expected_cash: expectedCash
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data shift: ' + err.message });
  }
});

// 2. Buka Shift Baru (Input Modal Awal)
router.post('/start', async (req, res) => {
  try {
    const tid = tenantId(req);
    const uid = req.user.id;
    const { initial_cash, notes } = req.body;

    const initialCashNum = Number(initial_cash) || 0;

    // Cek jika sudah ada shift OPEN
    const [existing] = await pool.execute(`
      SELECT id FROM shifts WHERE tenant_id = ? AND user_id = ? AND status = 'OPEN'
    `, [tid, uid]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Anda masih memiliki shift aktif yang belum ditutup.' });
    }

    const [ins] = await pool.execute(`
      INSERT INTO shifts (tenant_id, user_id, cashier_name, initial_cash, notes, status)
      VALUES (?, ?, ?, ?, ?, 'OPEN')
    `, [tid, uid, req.user.username || 'Kasir', initialCashNum, notes || '']);

    res.json({
      message: 'Shift kasir berhasil dibuka',
      shift_id: ins.insertId,
      initial_cash: initialCashNum
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuka shift: ' + err.message });
  }
});

// 3. Tutup Shift (Close Shift & Hitung Selisih Uang Fisik)
router.post('/close', async (req, res) => {
  try {
    const tid = tenantId(req);
    const uid = req.user.id;
    const { actual_cash, notes } = req.body;

    const [rows] = await pool.execute(`
      SELECT * FROM shifts WHERE tenant_id = ? AND user_id = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1
    `, [tid, uid]);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada shift aktif yang perlu ditutup.' });
    }

    const shift = rows[0];
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(id) as tx_count,
        COALESCE(SUM(total), 0) as total_sales
      FROM transactions
      WHERE tenant_id = ? AND user_id = ? AND created_at >= ?
    `, [tid, uid, shift.start_time]);

    const txCount = Number(stats[0]?.tx_count || 0);
    const totalSales = Number(stats[0]?.total_sales || 0);
    const expectedCash = Number(shift.initial_cash) + totalSales;
    const actualCashNum = Number(actual_cash) || 0;
    const variance = actualCashNum - expectedCash; // Selisih (+ lebih, - kurang)

    await pool.execute(`
      UPDATE shifts 
      SET 
        end_time = CURRENT_TIMESTAMP,
        expected_cash = ?,
        actual_cash = ?,
        variance = ?,
        total_tx = ?,
        total_sales = ?,
        notes = CONCAT(COALESCE(notes, ''), ' | Close Notes: ', ?),
        status = 'CLOSED'
      WHERE id = ? AND tenant_id = ?
    `, [expectedCash, actualCashNum, variance, txCount, totalSales, notes || '', shift.id, tid]);

    res.json({
      message: 'Shift kasir berhasil ditutup',
      summary: {
        shift_id: shift.id,
        cashier: shift.cashier_name,
        initial_cash: shift.initial_cash,
        total_sales: totalSales,
        expected_cash: expectedCash,
        actual_cash: actualCashNum,
        variance: variance,
        status: variance === 0 ? 'MATCH' : (variance > 0 ? 'SURPLUS' : 'DEFICIT')
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menutup shift: ' + err.message });
  }
});

module.exports = router;
