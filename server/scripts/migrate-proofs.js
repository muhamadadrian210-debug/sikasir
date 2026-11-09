require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  console.log('[migration] Membuat tabel payment_proofs jika belum ada...');
  const sql = `
    CREATE TABLE IF NOT EXISTS payment_proofs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      store_name VARCHAR(150) NOT NULL,
      sender_name VARCHAR(150) DEFAULT '',
      sender_bank VARCHAR(100) DEFAULT '',
      target_account VARCHAR(100) DEFAULT '748501012399501',
      target_name VARCHAR(150) DEFAULT 'Muhamad Adrian',
      target_bank VARCHAR(50) DEFAULT 'BRI',
      transfer_amount DECIMAL(12, 2) DEFAULT 0,
      transfer_time DATETIME DEFAULT NULL,
      raw_metadata JSON DEFAULT NULL,
      ai_verification JSON DEFAULT NULL,
      ai_status ENUM('PENDING', 'AI_MATCHED', 'SUSPICIOUS', 'MANUAL_REVIEW') DEFAULT 'PENDING',
      status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
      image_url LONGTEXT NOT NULL,
      package_duration_days INT DEFAULT 30,
      rejection_reason VARCHAR(255) DEFAULT '',
      approved_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.execute(sql);
  console.log('[migration] Tabel payment_proofs siap digunakan.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[migration error]', err);
  process.exit(1);
});
