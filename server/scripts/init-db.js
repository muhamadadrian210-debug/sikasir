/**
 * Seed admin default: username admin, password admin123
 * Jalankan setelah schema.sql
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sikasir',
  });

  const hash = await bcrypt.hash('admin123', 10);
  try {
    await pool.execute(
      `INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [hash]
    );
    console.log('Admin siap: username admin / password admin123');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  try {
    await pool.execute(
      `INSERT IGNORE INTO categories (name) VALUES ('Umum'), ('Minuman'), ('Makanan')`
    );
    console.log('Kategori default ditambahkan (jika belum ada).');
  } catch (e) {
    console.error(e);
  }

  await pool.end();
}

main();
