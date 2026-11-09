require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  console.log('[migration] Membuat tabel global_announcements...');
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS global_announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message TEXT NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('[migration] Sukses membuat tabel global_announcements');
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
