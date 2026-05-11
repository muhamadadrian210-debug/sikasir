const { pool } = require('../config/db');
const { clientIp } = require('./ipLists');

/**
 * Catat aksi admin (fire-and-forget).
 * Menyertakan tenant_id dari req.user jika tersedia.
 */
async function auditAdmin(req, action, details = null) {
  if (!req.user || req.user.role !== 'admin') return;
  try {
    const ip = clientIp(req);
    const meta = details ? JSON.stringify(details).slice(0, 8000) : null;
    const tenantId = req.user.tenant_id || null;
    await pool.execute(
      'INSERT INTO audit_logs (tenant_id, user_id, username, action, resource_meta, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [tenantId, req.user.id, req.user.username, action, meta, ip]
    );
  } catch (e) {
    console.error('audit_log failed', e.message);
  }
}

module.exports = { auditAdmin };
