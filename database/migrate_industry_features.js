const { pool } = require('../server/config/db');

async function addCol(table, col, def) {
  const [cols] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, col]
  );
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    console.log(`[migration] Added ${col} to ${table}`);
  } else {
    console.log(`[migration] ${col} already exists in ${table}`);
  }
}

async function run() {
  try {
    console.log('[migration] Running industry feature migrations...');
    await addCol('products', 'is_service', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addCol('products', 'unit', "VARCHAR(32) NULL DEFAULT 'pcs'");
    await addCol('transactions', 'notes', 'TEXT NULL');
    await addCol('transactions', 'metadata', 'JSON NULL');
    console.log('✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
