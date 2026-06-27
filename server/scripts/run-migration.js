const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigration() {
  try {
    console.log('[migration] Membaca migration_cyber_firewall.sql...');
    const sqlPath = path.join(__dirname, '..', '..', 'database', 'migration_cyber_firewall.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL by semicolon, but clean up comments and empty lines
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`[migration] Menjalankan ${statements.length} perintah SQL...`);
    
    for (const stmt of statements) {
      if (stmt.toLowerCase().startsWith('use ')) {
        // Skip USE statement or execute as normal
        await pool.query(stmt);
      } else {
        await pool.query(stmt);
      }
    }
    
    console.log('[migration] BERHASIL menginisialisasi tabel cyber_firewall_logs!');
  } catch (error) {
    console.error('[migration] Gagal menjalankan migrasi:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
