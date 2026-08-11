const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sikasir',
  waitForConnections: true,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 8000,
  
  // [SECURITY/NEON DB] Batas maksimal koneksi yang dipertahankan dalam Pool. 
  // Jika menggunakan Serverless Postgres (Neon), sangat penting membatasi ini 
  // di angka 10-20 agar tidak terjadi serangan Connection Exhaustion 
  // yang bisa menghabiskan RAM Neon instance Anda.
  connectionLimit: 10,
  
  // 0 berarti antrean tidak dibatasi, namun rateLimiter (Redis) 
  // akan memotong request yang spam sebelum masuk ke antrean ini.
  queueLimit: 0,
};

if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

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
