const { pool } = require('../config/db');

async function migrate() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM tenants LIKE 'plan_tier'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE tenants ADD COLUMN plan_tier VARCHAR(32) NOT NULL DEFAULT 'BASIC'");
      console.log('[migration] Kolom plan_tier berhasil ditambahkan ke tabel tenants.');
    } else {
      console.log('[migration] Kolom plan_tier sudah ada.');
    }
  } catch (err) {
    console.error('[migration] Gagal menambah kolom plan_tier:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
