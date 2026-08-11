const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');

const router = express.Router();

/**
 * BACKUP 1: Full Database JSON Export
 * Hanya untuk admin (atau manager tingkat tinggi)
 */
router.get('/full', authMiddleware, requireRole(['admin']), async (req, res) => {
  const tid = tenantId(req);
  try {
    // Kumpulkan data penting dari database
    const [products] = await pool.query('SELECT * FROM products WHERE tenant_id = ?', [tid]);
    const [transactions] = await pool.query('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC', [tid]);
    const [transactionItems] = await pool.query(`
      SELECT ti.* FROM transaction_items ti 
      JOIN transactions t ON ti.transaction_id = t.id 
      WHERE t.tenant_id = ?`, [tid]);
    const [categories] = await pool.query('SELECT * FROM categories WHERE tenant_id = ?', [tid]);
    
    // Jangan dump password hash milik user
    const [users] = await pool.query('SELECT id, username, role, full_name, is_active FROM users WHERE tenant_id = ?', [tid]);

    const backupData = {
      tenant_id: tid,
      generated_at: new Date().toISOString(),
      data: {
        users,
        categories,
        products,
        transactions,
        transaction_items: transactionItems
      }
    };

    // Jadikan ini file attachment
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="sikasir_backup_full_tenant_${tid}_${Date.now()}.json"`);
    
    res.json(backupData);
  } catch (error) {
    console.error('[Backup Full Error]', error);
    res.status(500).json({ error: 'Gagal membuat backup full' });
  }
});

/**
 * BACKUP 2: Transaksi CSV Export
 * Bisa diakses oleh admin dan manager (kasir tidak boleh)
 */
router.get('/transactions/csv', authMiddleware, requireRole(['admin', 'manager']), async (req, res) => {
  const tid = tenantId(req);
  try {
    const [transactions] = await pool.query(
      `SELECT t.id, t.created_at, t.total_amount, t.paid_amount, t.change_amount, t.payment_method, u.username as cashier_name
       FROM transactions t
       LEFT JOIN users u ON t.cashier_id = u.id
       WHERE t.tenant_id = ?
       ORDER BY t.created_at DESC`,
      [tid]
    );

    // Membuat header CSV
    let csvData = 'ID Transaksi,Tanggal,Kasir,Metode Pembayaran,Total,Dibayar,Kembalian\n';

    // Looping data menjadi CSV row
    transactions.forEach(row => {
      // Membersihkan teks agar tidak merusak koma di CSV
      const dateStr = new Date(row.created_at).toISOString().split('T').join(' ').substring(0, 19);
      const cashier = row.cashier_name || 'Tidak Diketahui';
      
      csvData += `"${row.id}","${dateStr}","${cashier}","${row.payment_method}","${row.total_amount}","${row.paid_amount}","${row.change_amount}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="laporan_transaksi_tenant_${tid}_${Date.now()}.csv"`);
    
    res.send(csvData);
  } catch (error) {
    console.error('[Backup CSV Error]', error);
    res.status(500).json({ error: 'Gagal membuat laporan CSV' });
  }
});

module.exports = router;
