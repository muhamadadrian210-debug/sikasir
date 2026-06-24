require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sikasir',
    ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('Membersihkan database...');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute('TRUNCATE TABLE transaction_items');
    await pool.execute('TRUNCATE TABLE transactions');
    await pool.execute('TRUNCATE TABLE incoming_goods');
    await pool.execute('TRUNCATE TABLE products');
    await pool.execute('TRUNCATE TABLE categories');
    await pool.execute('TRUNCATE TABLE users');
    await pool.execute('TRUNCATE TABLE audit_logs');
    await pool.execute('TRUNCATE TABLE tenants');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database berhasil dikosongkan!');
  } catch (e) {
    console.error('Gagal mengosongkan database:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
