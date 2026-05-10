const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sikasir',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/** Verifikasi koneksi DB saat startup agar error langsung terlihat di console */
pool.getConnection()
  .then((conn) => {
    console.log('[db] Koneksi MySQL berhasil');
    conn.release();
  })
  .catch((err) => {
    console.error('[db] GAGAL koneksi MySQL:', err.message);
    console.error('  → Pastikan MySQL berjalan dan konfigurasi DB_* di .env sudah benar');
    console.error(`  → Host: ${process.env.DB_HOST || 'localhost'}, DB: ${process.env.DB_NAME || 'sikasir'}, User: ${process.env.DB_USER || 'root'}`);
  });

module.exports = { pool };
