const express = require('express');
const { authMiddleware, requireRole, requireTenant } = require('../middleware/auth');
const { pool } = require('../config/db');
const {
  firewallLayers,
  localLogs,
  localTenantStats,
  localTenantLoop,
  logIncident,
  getLoopEnabled,
  setLoopEnabled
} = require('../middleware/cyberFirewall');
const { getRedisClient } = require('../config/redis');

const router = express.Router();

/**
 * GET /api/cybersecurity/status
 * Get the layer topology structure, Redis stats, and loop settings filtered by tenant_id.
 */
router.get('/status', authMiddleware, requireTenant, requireRole('admin'), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const tidKey = tenantId ? String(tenantId) : 'global';

  const layersMetadata = firewallLayers.map(l => ({
    level: l.level,
    name: l.name,
    description: l.description,
    branches_count: l.branches.length,
    branches: l.branches,
    honeypots_count: l.level + 1
  }));

  let loopEnabled = getLoopEnabled(tenantId);
  let ipStats = [];

  try {
    const redis = getRedisClient();
    const redisLoop = await redis.get(`cyber:firewall:tenant:${tidKey}:loop_enabled`);
    if (redisLoop !== null) {
      loopEnabled = redisLoop !== 'false';
    }

    const ips = await redis.smembers(`cyber:firewall:tenant:${tidKey}:ips`);
    if (ips && Array.isArray(ips)) {
      for (const ip of ips) {
        const stats = await redis.hgetall(`cyber:firewall:tenant:${tidKey}:ip:${ip}`);
        ipStats.push({
          ip,
          count: Number(stats.count || 0),
          lastLayer: Number(stats.lastLayer || 0),
          lastSeen: stats.lastSeen || null
        });
      }
    }
  } catch (err) {
    // Fallback to local memory stats per tenant
    const tenantMap = localTenantStats.get(tidKey);
    if (tenantMap) {
      ipStats = Array.from(tenantMap.entries()).map(([ip, data]) => ({
        ip,
        count: data.count,
        lastLayer: data.lastLayer,
        lastSeen: data.lastSeen
      }));
    }
    const loopVal = localTenantLoop.get(tidKey);
    loopEnabled = loopVal !== undefined ? loopVal : true;
  }

  let filteredViolationsCount = localLogs.filter(l => l.tenant_id === tenantId).length;
  try {
    if (pool) {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) AS total FROM cyber_firewall_logs WHERE tenant_id = ?',
        [tenantId]
      );
      filteredViolationsCount = Number(rows[0]?.total || 0);
    }
  } catch (err) {
    // Keep the memory fallback count when the table is not ready.
  }

  const stats = {
    loopEnabled,
    totalViolations: filteredViolationsCount,
    ipStats
  };

  res.json({ layers: layersMetadata, stats });
});

/**
 * GET /api/cybersecurity/logs
 * Retrieve recent logs filtered by tenant_id.
 */
router.get('/logs', authMiddleware, requireTenant, requireRole('admin'), async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    if (pool) {
      const [rows] = await pool.execute(
        'SELECT * FROM cyber_firewall_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100',
        [tenantId]
      );
      if (rows && rows.length > 0) {
        return res.json(rows);
      }
    }
  } catch (err) {
    // Database connection or table not ready, fallback to memory
  }

  // Fallback to memory logs filtered by tenantId
  const filteredLogs = localLogs.filter(l => l.tenant_id === tenantId);
  res.json(filteredLogs);
});

/**
 * POST /api/cybersecurity/toggle-loop
 * Toggles global looping trap flag for the current tenant.
 */
router.post('/toggle-loop', authMiddleware, requireTenant, requireRole('admin'), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { enabled } = req.body;
  
  if (typeof enabled === 'boolean') {
    await setLoopEnabled(tenantId, enabled);
    return res.json({ success: true, loopEnabled: getLoopEnabled(tenantId) });
  }
  res.status(400).json({ error: 'Nilai enabled harus boolean' });
});

/**
 * POST /api/cybersecurity/kick
 * Kick out action: blacklists the target IP and forces it into the tarpit loop for this tenant.
 */
router.post('/kick', authMiddleware, requireTenant, requireRole('admin'), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const tidKey = tenantId ? String(tenantId) : 'global';
  const { ip } = req.body || {};

  if (!ip) {
    return res.status(400).json({ error: 'Parameter IP wajib diisi' });
  }

  try {
    const redis = getRedisClient();
    const redisIpKey = `cyber:firewall:tenant:${tidKey}:ip:${ip}`;
    const redisIpsSet = `cyber:firewall:tenant:${tidKey}:ips`;

    // Force count to threshold to lock IP into Tarpit
    await redis.sadd(redisIpsSet, ip);
    await redis.hset(redisIpKey, 'count', '5'); // Force higher than threshold (3)
    await redis.hset(redisIpKey, 'lastLayer', '99'); // Tarpit Isolation layer indicator
    await redis.hset(redisIpKey, 'lastSeen', new Date().toISOString());

  } catch (err) {
    // Fallback to local memory stats
    if (!localTenantStats.has(tidKey)) {
      localTenantStats.set(tidKey, new Map());
    }
    const tenantMap = localTenantStats.get(tidKey);
    tenantMap.set(ip, {
      count: 5,
      lastLayer: 99,
      lastSeen: new Date().toISOString()
    });
  }

  // Audit Log Kickout Event
  await logIncident(
    ip,
    tenantId,
    { level: 99, name: 'Permanent IP Isolation Tarpit' },
    'Manual Admin Kickout action',
    'Force Tarpit Loop Triggered',
    'POST',
    '/api/cybersecurity/kick',
    req.headers['user-agent'],
    `Kicked manually by admin: ${req.user.username}`,
    'LOOP_TRAPPED'
  );

  res.json({ success: true, message: `Akses dari ${ip} berhasil diblokir untuk toko ini.` });
});

/**
 * POST /api/cybersecurity/simulate
 * Simulates a request attack for the current tenant.
 */
router.post('/simulate', authMiddleware, requireTenant, requireRole('admin'), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { type, ip = '182.1.2.3' } = req.body || {};
  let targetLayerIndex = 0;
  let branchName = '';
  let honeypotName = '';
  let mockPayload = '';

  switch (type) {
    case 'blacklist':
      targetLayerIndex = 0;
      branchName = 'IP Blacklist Check';
      honeypotName = 'IP Lock Block';
      mockPayload = 'IP: ' + ip + ' blacklisted manually';
      break;
    case 'bot':
      targetLayerIndex = 1;
      branchName = 'Known Bot Signature Match';
      honeypotName = 'Scraper Tarpit';
      mockPayload = 'User-Agent: sqlmap/1.8.2 (http://sqlmap.org)';
      break;
    case 'rate_limit':
      targetLayerIndex = 2;
      branchName = 'IP Query Speed Check';
      honeypotName = 'Infinite Response Chunk Stream';
      mockPayload = 'Simulated DDoS (150 requests/sec)';
      break;
    case 'protocol':
      targetLayerIndex = 3;
      branchName = 'Content-Type Mismatch';
      honeypotName = 'SOAP XML Fault Decoy';
      mockPayload = 'PUT /api/transactions/checkout (text/plain)';
      break;
    case 'xss':
      targetLayerIndex = 4;
      branchName = 'HTML Script Tag Regex';
      honeypotName = 'Isolated Guestbook Sandbox';
      mockPayload = '{"comment": "<script>alert(document.cookie)</script>"}';
      break;
    case 'sqli':
      targetLayerIndex = 5;
      branchName = 'UNION SELECT Injection Detector';
      honeypotName = 'phpMyAdmin Decoy Portal';
      mockPayload = 'search=1 UNION SELECT null, username, password_hash FROM users';
      break;
    case 'csrf':
      targetLayerIndex = 6;
      branchName = 'MUTATION CSRF Header Check';
      honeypotName = 'Fake Fund Transfer Panel';
      mockPayload = 'POST /api/products (Missing X-CSRF-Token)';
      break;
    case 'session':
      targetLayerIndex = 7;
      branchName = 'Role Modification Attack Intercept';
      honeypotName = 'Decoy Admin Setup Screen';
      mockPayload = 'POST /api/users (Payload containing role=admin)';
      break;
    case 'idor':
      targetLayerIndex = 8;
      branchName = 'Tenant Access Boundary Shift Block';
      honeypotName = 'Mock Private Invoices Downloader';
      mockPayload = 'GET /api/invoices/download?id=123 (Tenant ID mismatch)';
      break;
    case 'api_abuse':
      targetLayerIndex = 9;
      branchName = 'Hidden File Probing (.env/.git)';
      honeypotName = 'Decoy .env File Downloader';
      mockPayload = 'GET /api/.env (Intruder file scraping)';
      break;
    case 'logic':
      targetLayerIndex = 10;
      branchName = 'Negative Quantity Checkout Reject';
      honeypotName = 'Fake Payment System sandbox';
      mockPayload = 'Checkout payload: qty=-5, item_id=22';
      break;
    default:
      return res.status(400).json({ error: 'Tipe simulasi tidak valid' });
  }

  const layer = firewallLayers[targetLayerIndex];
  const loopEnabled = getLoopEnabled(tenantId);
  const action = loopEnabled ? 'LOOP_TRAPPED' : 'HONEYPOT_TRAPPED';

  const logItem = await logIncident(
    ip,
    tenantId,
    layer,
    branchName,
    honeypotName,
    'POST',
    `/api/simulated-${type}`,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) simulated-attacker',
    mockPayload,
    action
  );

  res.json({
    success: true,
    message: `Simulasi serangan ${type.toUpperCase()} berhasil diluncurkan!`,
    incident: logItem
  });
});

module.exports = router;
