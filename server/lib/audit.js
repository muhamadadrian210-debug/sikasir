const { pool } = require('../config/db');
const { clientIp } = require('./ipLists');

/**
 * Catat aksi admin (fire-and-forget).
 */
async function auditAdmin(req, action, details = null) {
  if (!req.user || req.user.role !== 'admin') return;
  try {
    const ip = clientIp(req);
    const meta = details ? JSON.stringify(details).slice(0, 8000) : null;
    await pool.execute(
      'INSERT INTO audit_logs (user_id, username, action, resource_meta, ip) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, action, meta, ip]
    );
  } catch (e) {
    console.error('audit_log failed', e.message);
  }
}

module.exports = { auditAdmin };
