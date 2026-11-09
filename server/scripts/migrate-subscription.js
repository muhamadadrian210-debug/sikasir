const { pool } = require('../config/db');

async function migrate() {
  try {
    const [cols] = await pool.execute('DESCRIBE tenants');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('subscription_start')) {
      await pool.execute('ALTER TABLE tenants ADD COLUMN subscription_start DATETIME NULL');
      console.log('Added subscription_start');
    }
    if (!colNames.includes('subscription_until')) {
      await pool.execute('ALTER TABLE tenants ADD COLUMN subscription_until DATETIME NULL');
      console.log('Added subscription_until');
    }
    if (!colNames.includes('license_code')) {
      await pool.execute('ALTER TABLE tenants ADD COLUMN license_code VARCHAR(64) NULL');
      console.log('Added license_code');
    }
    if (!colNames.includes('status')) {
      await pool.execute("ALTER TABLE tenants ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active'");
      console.log('Added status');
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS license_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) NOT NULL UNIQUE,
        duration_days INT NOT NULL DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        used_by_tenant_id INT NULL,
        notes VARCHAR(255) NULL,
        INDEX idx_license_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table license_codes ready');

    await pool.execute(`
      UPDATE tenants 
      SET 
        subscription_start = '2026-11-01 00:00:00',
        subscription_until = '2027-01-01 23:59:59',
        license_code = 'SIV-KPG-OFFICIAL-2027',
        status = 'active'
      WHERE id = 27
    `);
    console.log('Kopi Papa Ganteng (ID 27) updated with 2026-11-01 to 2027-01-01');

    // Clean delete all dummy child records where tenant_id != 27
    try {
      await pool.execute('DELETE ti FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id WHERE t.tenant_id != 27');
    } catch (e) { console.log('ti err:', e.message); }

    try { await pool.execute('DELETE FROM transactions WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM products WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM categories WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM users WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM expenses WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM shifts WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM incoming_goods WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM audit_logs WHERE tenant_id != 27'); } catch (e) {}
    try { await pool.execute('DELETE FROM dine_in_orders WHERE tenant_id != 27'); } catch (e) {}

    const [delRes] = await pool.execute('DELETE FROM tenants WHERE id != 27');
    console.log('Deleted other tenants, affected rows:', delRes.affectedRows);

    const [remaining] = await pool.execute('SELECT id, name, subscription_start, subscription_until, license_code, status FROM tenants');
    console.log('Remaining tenants in DB:', remaining);

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
