const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sikasir',
  waitForConnections: true,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
  
  // TCP KeepAlive untuk mencegah koneksi diputus oleh firewall cloud / Aiven
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,

  // Serverless Micro-Pool Tuning:
  // Dibatasi 2 koneksi per container serverless (default 2, dapat diubah via DB_CONNECTION_LIMIT).
  // Menjaga agar puluhan instance Vercel yang berjalan bersamaan tidak melampaui
  // kuota max_connections pada Aiven Cloud Free Tier (maksimal ~20-25 koneksi total).
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 2,
  maxIdle: 2,
  idleTimeout: 30000,
  
  // 0 berarti antrean pool tidak dibatasi
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
