const { pool } = require('../config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_maintenance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        title VARCHAR(255) NOT NULL DEFAULT 'Pemeliharaan Sistem Skala Besar (Major Update)',
        message TEXT NOT NULL,
        estimated_finish VARCHAR(100) DEFAULT '15-30 Menit',
        updated_by VARCHAR(100) DEFAULT 'CEO',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Pastikan minimal ada 1 row default (is_active = 0)
    const [rows] = await pool.query('SELECT id FROM system_maintenance LIMIT 1');
    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO system_maintenance (is_active, title, message, estimated_finish, updated_by)
        VALUES (0, 'Pemeliharaan Sistem Skala Besar (Major Update)', 'Kami sedang melakukan pembaruan inti pada server dan basis data SiKasir untuk menghadirkan performa yang lebih cepat dan aman.', '15-30 Menit', 'CEO')
      `);
      console.log('[migration] Tabel system_maintenance berhasil dibuat dan diinisialisasi.');
    } else {
      console.log('[migration] Tabel system_maintenance sudah siap.');
    }
  } catch (err) {
    console.error('[migration] Gagal setup tabel system_maintenance:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
