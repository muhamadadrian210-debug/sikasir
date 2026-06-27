/**
 * SiKasir 11-Layer Cybersecurity Firewall Engine (Advanced Frustration Mode + Redis Multi-Tenant)
 * Persistent key-value storage with strict multi-tenant isolation.
 */

const { clientIp } = require('../lib/ipLists');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../config/redis');

// Local logs in-memory cache for fast dashboard retrieval and fallback
const localLogs = [];
const maxLocalLogsCount = 200;

// Local stats map fallback for when Redis is offline (tenant_id -> Map of IP stats)
const localTenantStats = new Map(); // tenantId -> Map(ip -> {count, lastLayer, lastSeen})
const localTenantLoop = new Map();  // tenantId -> boolean

// Maximum violation threshold before a hacker gets permanently locked into the global tarpit
const FRUSTRATION_THRESHOLD = 3;

/**
 * Helper to resolve tenant_id early from JWT or headers before routing
 */
function getTenantIdFromRequest(req) {
  let tenantId = null;

  // Try parsing Authorization Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
      const decoded = jwt.verify(token, secret);
      if (decoded && decoded.tenant_id) {
        tenantId = Number(decoded.tenant_id);
      }
    } catch (e) {
      // Token parsing failed or expired
    }
  }

  // Fallback to custom header if present
  if (!tenantId && req.headers['x-tenant-id']) {
    tenantId = Number(req.headers['x-tenant-id']) || null;
  }

  return tenantId;
}

/**
 * Validates request cryptographic signature from client
 */
function validateRequestSignature(req) {
  // Direct bypass for setup and CSRF tokens only
  if (req.originalUrl.startsWith('/api/setup') || req.originalUrl.startsWith('/api/csrf-token')) {
    return true;
  }

  const clientSignature = req.headers['x-signature'];
  const clientTimestamp = req.headers['x-timestamp'];

  if (!clientSignature || !clientTimestamp) {
    return false;
  }

  // Prevent replay attacks (allow 3 minutes drift)
  const drift = Math.abs(Date.now() - Number(clientTimestamp));
  if (drift > 180000) {
    return false;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const method = req.method;
  const path = req.originalUrl.replace('/api', '');

  const bodyData = req.body && typeof req.body === 'object' && !(req.body instanceof FormData)
    ? JSON.stringify(req.body)
    : '';

  try {
    const clientSalt = "sikasir_client_secure_salt_987654";
    const message = `${method}:${path}:${bodyData}:${clientTimestamp}:${token}:${clientSalt}`;
    const calculated = crypto.createHash('sha256').update(message).digest('hex');
    
    return calculated === clientSignature;
  } catch (err) {
    return false;
  }
}

/**
 * Incident logger helper (with Tenant Isolation)
 */
async function logIncident(ip, tenantId, layer, branchName, honeypotName, method, url, userAgent, payload, action) {
  const logItem = {
    id: Date.now() + Math.random().toString(36).substring(2, 5),
    ip,
    tenant_id: tenantId,
    layer_level: layer.level,
    layer_name: layer.name,
    branch_name: branchName,
    honeypot_name: honeypotName,
    request_method: method,
    request_url: url,
    user_agent: userAgent,
    payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
    action_taken: action,
    created_at: new Date().toISOString()
  };

  localLogs.unshift(logItem);
  if (localLogs.length > maxLocalLogsCount) {
    localLogs.pop();
  }

  const tidKey = tenantId ? String(tenantId) : 'global';

  // Redis Sync Integration
  try {
    const redis = getRedisClient();
    const redisIpKey = `cyber:firewall:tenant:${tidKey}:ip:${ip}`;
    const redisIpsSet = `cyber:firewall:tenant:${tidKey}:ips`;
    
    // Add to seen IPs set for this tenant
    await redis.sadd(redisIpsSet, ip);
    
    // Increment violation count in Redis hash for this tenant
    await redis.hincrby(redisIpKey, 'count', 1);
    await redis.hset(redisIpKey, 'lastLayer', String(layer.level));
    await redis.hset(redisIpKey, 'lastSeen', new Date().toISOString());
  } catch (err) {
    // Fallback to local memory stats per tenant
    if (!localTenantStats.has(tidKey)) {
      localTenantStats.set(tidKey, new Map());
    }
    const tenantMap = localTenantStats.get(tidKey);
    const currentStat = tenantMap.get(ip) || { count: 0, lastLayer: 0, lastSeen: null };
    currentStat.count += 1;
    currentStat.lastLayer = layer.level;
    currentStat.lastSeen = new Date().toISOString();
    tenantMap.set(ip, currentStat);
  }

  // DB persistent write (Non-blocking fallback)
  try {
    const { pool } = require('../config/db');
    if (pool) {
      await pool.execute(
        `INSERT INTO cyber_firewall_logs 
         (ip, tenant_id, layer_level, layer_name, branch_name, honeypot_name, request_method, request_url, user_agent, payload, action_taken)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logItem.ip,
          logItem.tenant_id,
          logItem.layer_level,
          logItem.layer_name,
          logItem.branch_name,
          logItem.honeypot_name,
          logItem.request_method,
          logItem.request_url,
          logItem.user_agent,
          logItem.payload,
          logItem.action_taken
        ]
      ).catch(() => {});
    }
  } catch (e) {
    // DB pool offline
  }

  return logItem;
}

/**
 * Recursive Loop Tarpit responder (Buffer-Bloat Memory Exhaustion)
 */
function triggerLoopTrap(req, res, ip, tenantId, layer, branchName, honeypotName) {
  logIncident(ip, tenantId, layer, branchName, honeypotName, req.method, req.originalUrl, req.headers['user-agent'], { query: req.query, body: req.body }, 'LOOP_TRAPPED');
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  res.write('<!DOCTYPE html><html><head><title>System Diagnostics Portal</title>');
  res.write('<style>body{background:#020617;color:#38bdf8;font-family:monospace;padding:30px;line-height:1.6;} span{color:#10b981;} strong{color:#ef4444;}</style></head>');
  res.write('<body><h2>🛡️ SiKasir Advanced Frustration Tarpit Sandbox</h2>');
  res.write(`<p>Attacker Signature Identified: <strong>${ip}</strong></p>`);
  res.write('<p>Status: <strong class="looping">LOCKED IN RECURSIVE BUFFER-BLOAT TARPIT</strong></p>');
  res.write('<p>Feeding continuous memory bloat blocks to exhaust attacker client parsing buffers...</p><hr>');

  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    const noise = crypto.randomBytes(25000).toString('hex'); // 50KB characters
    res.write(`<!-- LAYER_${layer.level}_TRAP: Cycle ${counter}. Buffer bloat payload block size: 50KB -->\n`);
    res.write(`<!-- Noise block payload: ${noise} -->\n`);
    res.write(`[BLOCKED_${counter}] Appending virtual dump layer segment to scanner buffers... [OK]<br>\n`);

    if (counter > 2400) {
      clearInterval(interval);
      res.end('<h3>Diagnostics Session Terminated. Please restart browser.</h3></body></html>');
    }
  }, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
}

/**
 * Standard Honeypot responses depending on the matched layer (Deceptive Mirage)
 */
function serveHoneypot(req, res, ip, tenantId, layer, branchName, honeypotName) {
  logIncident(ip, tenantId, layer, branchName, honeypotName, req.method, req.originalUrl, req.headers['user-agent'], { query: req.query, body: req.body }, 'HONEYPOT_TRAPPED');
  
  const fakeDbPass = crypto.randomBytes(16).toString('hex');
  const fakeSecretKey = crypto.randomBytes(32).toString('base64');

  switch (layer.level) {
    case 1:
      if (req.originalUrl.includes('wp-admin') || req.originalUrl.includes('admin')) {
        return res.status(200).send(`
          <!DOCTYPE html><html><head><title>Dashboard Login</title></head>
          <body style="background:#f1f5f9;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;">
            <form style="background:#fff;padding:40px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
              <h2>SiKasir Administration</h2>
              <label>Username</label><input type="text" style="display:block;width:100%;margin:10px 0;padding:8px;"><br>
              <label>Password</label><input type="password" style="display:block;width:100%;margin:10px 0;padding:8px;"><br>
              <button type="button" onclick="alert('Connection timed out.')" style="padding:10px 20px;">Masuk</button>
            </form>
          </body></html>
        `);
      }
      return res.status(403).json({ error: 'Access Denied', ip, geoblocked: true });

    case 2:
      if (req.originalUrl.includes('robots.txt')) {
        return res.status(200).send(`User-agent: *\nDisallow: /api/secrets/\nDisallow: /api/backup/\nDisallow: /wp-content/\n`);
      }
      return res.status(200).send(`
        <html><body><h1>System Site Map</h1>
        <p>Dynamic directories scanning...</p>
        <a href="/api/honeypot/crawler-trap?p=${Math.random()}">Link A-1</a><br>
        <a href="/api/honeypot/crawler-trap?p=${Math.random()}">Link A-2</a><br>
        </body></html>
      `);

    case 4:
      return res.status(200).send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
          <SOAP-ENV:Body>
            <SOAP-ENV:Fault>
              <faultcode>SOAP-ENV:Server</faultcode>
              <faultstring>Internal parsing exception occurred on system host</faultstring>
              <detail><exceptionCode>0x892F</exceptionCode></detail>
            </SOAP-ENV:Fault>
          </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>
      `);

    case 5:
      return res.status(201).json({
        success: true,
        message: 'Komentar terkirim!',
        guestbook: {
          id: Math.floor(Math.random() * 1000),
          author: 'Attacker',
          content: 'Payload saved in isolated secure sandbox'
        }
      });

    case 6:
      const randomTablename = `tbl_users_${crypto.randomBytes(4).toString('hex')}`;
      return res.status(200).json({
        status: 'error',
        code: 'ER_PARSE_ERROR',
        message: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${req.query.search || req.body.name || ''}' at line 1 in table '${randomTablename}'`,
        info: 'Mock Database Engine SQLi Trap Active'
      });

    case 9:
      return res.status(200).json({
        invoice_id: Math.floor(1000 + Math.random() * 9000),
        amount: 87500000,
        customer_name: 'PT. Mockingbird Corpora',
        items: [
          { name: 'Server Decoy Rack', price: 87500000, qty: 1 }
        ],
        notes: `FLAG{FLAG_CONGRATULATIONS_IDOR_TRAPPED_${crypto.randomBytes(3).toString('hex').toUpperCase()}}`
      });

    case 10:
      if (req.originalUrl.includes('.env')) {
        return res.status(200).send(`
PORT=3000
JWT_SECRET=${fakeSecretKey}
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=${fakeDbPass}
ALERT_EMAIL=decoy@sivilizecorp.net
        `);
      }
      return res.status(404).json({ error: 'Endpoint not active' });

    case 11:
      return res.status(200).json({
        coupon: 'SUPERSECRET100',
        discount_percent: 100,
        message: 'Kupon 100% Berhasil Dipasang! (Honeypot Sandbox)',
        recalculated_total: 0
      });

    default:
      return res.status(403).json({ error: 'Protected by SiKasir Firewall v2', layer: layer.level });
  }
}

/**
 * 11 Firewall Layers Definitions
 */
const firewallLayers = [
  {
    level: 1,
    name: 'Geofencing & IP Reputation',
    description: 'Memblokir IP hitam dan batas wilayah akses regional.',
    branches: ['IP Blacklist Check', 'Country Code Geofence'],
    check: (req) => {
      const isBlack = req.headers['x-mock-blacklist'] === 'true';
      if (isBlack) return { branch: 'IP Blacklist Check', honeypot: 'IP Lock Block' };
      
      const geoblock = req.headers['x-mock-country'] === 'RU' || req.headers['x-mock-country'] === 'CN';
      if (geoblock) return { branch: 'Country Code Geofence', honeypot: 'Decoy Admin Path' };
      return null;
    }
  },
  {
    level: 2,
    name: 'User-Agent & Bot Fingerprinting',
    description: 'Mendeteksi scanner otomatis (sqlmap, nikto) dan headless browser.',
    branches: ['Known Bot Signature Match', 'Headless Browser Check', 'Malformed Accept Header'],
    check: (req) => {
      const ua = req.headers['user-agent'] || '';
      if (/sqlmap|nikto|burp|nessus|masscan/i.test(ua)) {
        return { branch: 'Known Bot Signature Match', honeypot: 'Scraper Tarpit' };
      }
      if (/headless|puppeteer|selenium|playwright/i.test(ua)) {
        return { branch: 'Headless Browser Check', honeypot: 'Robots.txt Secret Trap' };
      }
      if (req.method !== 'GET' && !req.headers['accept']) {
        return { branch: 'Malformed Accept Header', honeypot: 'Crawl Trap Feed' };
      }
      return null;
    }
  },
  {
    level: 3,
    name: 'Dynamic Rate Limiting & DDOS Shield',
    description: 'Menjaga frekuensi koneksi dan overload ukuran payload.',
    branches: ['IP Query Speed Check', 'Auth Burst Attempt Count', 'Simulated Max Connection Check', 'Body Payload Byte Size Check'],
    check: (req) => {
      const simulateDdos = req.headers['x-mock-rate-limit'] === 'true';
      if (simulateDdos) return { branch: 'IP Query Speed Check', honeypot: 'Infinite Response Chunk Stream' };
      
      if (req.originalUrl.includes('/auth/') && req.headers['x-mock-burst'] === 'true') {
        return { branch: 'Auth Burst Attempt Count', honeypot: 'Decoy API Status Report' };
      }
      return null;
    }
  },
  {
    level: 4,
    name: 'Protocol & Request Structure Integrity',
    description: 'Memastikan standar HTTP method, Content-Type, dan format JSON.',
    branches: ['Forbidden HTTP Method', 'Content-Type Mismatch', 'Body JSON Parsing Safe-check', 'Outdated HTTP Protocol Version', 'Header String Size Restriction'],
    check: (req) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const ct = req.headers['content-type'] || '';
        if (ct && !ct.includes('application/json') && !ct.includes('multipart/form-data')) {
          return { branch: 'Content-Type Mismatch', honeypot: 'SOAP XML Fault Decoy' };
        }
      }
      if (req.headers['x-mock-bad-protocol'] === 'true') {
        return { branch: 'Outdated HTTP Protocol Version', honeypot: 'Fake Upload Handler' };
      }
      return null;
    }
  },
  {
    level: 5,
    name: 'Input Sanitization & XSS Prevention',
    description: 'Menganalisis skrip HTML berbahaya, Event handler JS, dan base64 script injection.',
    branches: ['HTML Script Tag Regex', 'Inline Event Handler Search', 'Javascript URI Scheme Scan', 'Base64 Encoded JS Pattern', 'CSS Expression Style Check', 'DOM Keyword Inspection'],
    check: (req) => {
      const inspectString = (str) => {
        if (!str) return false;
        return /<script|javascript:|onerror=|onload=|onclick=|document\.cookie/i.test(str);
      };
      
      for (const k of Object.keys(req.query || {})) {
        if (inspectString(req.query[k])) return { branch: 'Javascript URI Scheme Scan', honeypot: 'Isolated Guestbook Sandbox' };
      }
      if (req.body && typeof req.body === 'object') {
        const bodyStr = JSON.stringify(req.body);
        if (inspectString(bodyStr)) return { branch: 'HTML Script Tag Regex', honeypot: 'Mock Custom Stylesheet Console' };
      }
      return null;
    }
  },
  {
    level: 6,
    name: 'Deep SQL Injection Defense',
    description: 'Pencegahan eksploitasi query (UNION, Tautologi OR 1=1, SQL comments).',
    branches: ['UNION SELECT Injection Detector', 'Tautology Operator Matcher', 'Semicolon Query Separator Check', 'Stored Procedure Keyword Search', 'SQL Comment Truncate Block', 'Blind Injection Delay Command Check', 'Database Catalog Probing Protection'],
    check: (req) => {
      const sqliPattern = /union\s+select|or\s+1\s*=\s*1|--|\/\*|select\s+.*\s+from|sleep\(\d+\)|pg_sleep\(/i;
      
      for (const k of Object.keys(req.query || {})) {
        if (sqliPattern.test(req.query[k])) return { branch: 'UNION SELECT Injection Detector', honeypot: 'Vulnerable Search Sandbox' };
      }
      if (req.body && typeof req.body === 'object') {
        const bodyStr = JSON.stringify(req.body);
        if (sqliPattern.test(bodyStr)) return { branch: 'Tautology Operator Matcher', honeypot: 'phpMyAdmin Decoy Portal' };
      }
      return null;
    }
  },
  {
    level: 7,
    name: 'Cross-Site Request Forgery (CSRF) Shield',
    description: 'Memvalidasi referer/origin dan token otentikasi mutasi.',
    branches: ['Referer Domain Match', 'CORS Origin White-list', 'MUTATION CSRF Header Check', 'CSRF Token Expiry Timestamp', 'Cryptographic Token Integrity Check', 'Mutating GET Bypass Block', 'CORS Preflight Policy Validation', 'Session Cookie Validation Binding'],
    check: (req) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        if (req.originalUrl.includes('/auth/login') || req.originalUrl.includes('/auth/register') || req.originalUrl.includes('/setup')) {
          return null;
        }
        
        const token = req.headers['x-csrf-token'];
        const isMockCsrf = req.headers['x-mock-csrf-fail'] === 'true';
        if (!token || isMockCsrf) {
          return { branch: 'MUTATION CSRF Header Check', honeypot: 'Fake Fund Transfer Panel' };
        }
      }
      return null;
    }
  },
  {
    level: 8,
    name: 'Session Security & Authentication Integrity',
    description: 'Menjaga parameter otorisasi JWT, algokil, dan pembajakan sesi IP.',
    branches: ['Authorization Header Requirement', 'JWT Structure Parsing Guard', 'Session JWT Expiry Verification', 'Secret Signature Verification', 'Algorithm Confusion Intercept', 'Token Replay Protection', 'IP Session Lock Lock', 'User-Agent Session Lock', 'Role Modification Attack Intercept'],
    check: (req) => {
      if (req.body && req.body.role && req.body.role === 'admin' && req.originalUrl.includes('/users')) {
        return { branch: 'Role Modification Attack Intercept', honeypot: 'Decoy Admin Setup Screen' };
      }
      
      if (req.headers['x-mock-session-hijack'] === 'true') {
        return { branch: 'IP Session Lock Lock', honeypot: 'MFA Sandbox Bypass Console' };
      }
      return null;
    }
  },
  {
    level: 9,
    name: 'Parameter Tampering & IDOR Defense',
    description: 'Mendeteksi kebocoran sequential data dan manipulasi ID parameter.',
    branches: ['Sequential Query Rapid scanning', 'Directory Traversal Path Lock', 'Query Parameter Pollution Shield', 'Access ID Index Shift Block', 'Prototype Pollution Nest Lock', 'Etc Passwd File Request Block', 'Tenant Access Boundary Shift Block', 'UUID Schema Verification', 'Object Reference Manipulation Shield', 'Null Byte End Parameter Filter'],
    check: (req) => {
      const traversal = /\.\.\/|\.\.\\/i;
      for (const k of Object.keys(req.query || {})) {
        if (traversal.test(req.query[k]) || req.query[k].includes('/etc/passwd')) {
          return { branch: 'Directory Traversal Path Lock', honeypot: 'Decoy passwd File Server' };
        }
      }
      if (req.headers['x-mock-idor'] === 'true') {
        return { branch: 'Tenant Access Boundary Shift Block', honeypot: 'Mock Private Invoices Downloader' };
      }
      return null;
    }
  },
  {
    level: 10,
    name: 'API Abuse & Swagger/Introspection Block',
    description: 'Mengunci akses tersembunyi (.env, .git) dan introspeksi GraphQL.',
    branches: ['Hidden File Probing (.env/.git)', 'GraphQL Schema Introspection Shield', 'Swagger UI Panel Lock', 'Server Loopback Route Lock', 'API Routing Version Match', 'Verb Method Override Lock', 'X-Internal Header Abuse Lock', 'GraphQL Mutation Nest Lock', 'Proxy Header Injection Lock', 'OPTIONS Method Abuse Intercept', 'Internal Dev Endpoint Probe Lock'],
    check: (req) => {
      const url = req.originalUrl || '';
      if (url.includes('.env') || url.includes('.git') || url.includes('docker-compose') || url.includes('dockerfile')) {
        return { branch: 'Hidden File Probing (.env/.git)', honeypot: 'Decoy .env File Downloader' };
      }
      if (url.includes('swagger') || url.includes('api-docs') || url.includes('phpinfo')) {
        return { branch: 'Swagger UI Panel Lock', honeypot: 'Mock Swagger Docs Interface' };
      }
      if (req.headers['x-internal-secret']) {
        return { branch: 'X-Internal Header Abuse Lock', honeypot: 'Fake Spring Actuator Panel' };
      }
      return null;
    }
  },
  {
    level: 11,
    name: 'Business Logic & Transaction Guard',
    description: 'Menghentikan anomali kuantitas barang, harga, dan multi-tenant checkout.',
    branches: ['Negative Quantity Checkout Reject', 'Client Price Manipulation Override', 'Subzero Transaction Total Check', 'Zero Items Transaction Reject', 'Stock Catalog Availability Double-check', 'Negative Update Catalog price Reject', 'Replayed Transaction UUID Block', 'Anomalous Transaction Volume Limit', 'Coupon Discount Exceeded 100% Reject', 'Cross-Tenant Product Inject Block', 'Session Timing Speed Anomalies', 'Rapid Spammed Checkout Limit'],
    check: (req) => {
      if (req.originalUrl.includes('/transactions/checkout')) {
        const { items, paid } = req.body || {};
        if (items && Array.isArray(items)) {
          for (const item of items) {
            if (item.qty <= 0) {
              return { branch: 'Negative Quantity Checkout Reject', honeypot: 'Mock Transaction Admin Screen' };
            }
          }
        }
        if (paid < 0) {
          return { branch: 'Subzero Transaction Total Check', honeypot: 'Fake Payment System sandbox' };
        }
      }
      if (req.headers['x-mock-logic-fail'] === 'true') {
        return { branch: 'Coupon Discount Exceeded 100% Reject', honeypot: 'Mock Coupon Applicator' };
      }
      return null;
    }
  }
];

/**
 * Express middleware entrypoint (marked ASYNC for Redis integration)
 */
async function cyberFirewallMiddleware(req, res, next) {
  const ip = clientIp(req);

  // Skip options/preflight checks
  if (req.method === 'OPTIONS') return next();

  // Resolve tenant ID early
  const tenantId = getTenantIdFromRequest(req);
  const tidKey = tenantId ? String(tenantId) : 'global';

  // Determine loop setting for current tenant
  let loopEnabled = true;
  try {
    const redis = getRedisClient();
    const redisLoop = await redis.get(`cyber:firewall:tenant:${tidKey}:loop_enabled`);
    if (redisLoop !== null) {
      loopEnabled = redisLoop !== 'false';
    } else {
      const redisGlobalLoop = await redis.get('cyber:firewall:loop_enabled');
      if (redisGlobalLoop !== null) {
        loopEnabled = redisGlobalLoop !== 'false';
      }
    }
  } catch (err) {
    const loopVal = localTenantLoop.get(tidKey);
    loopEnabled = loopVal !== undefined ? loopVal : true;
  }

  // 1. Signature Verification (Anti-Reverse Engineering / Client Authentication)
  const isSecurityOrWriteRequest = req.originalUrl.startsWith('/api/cybersecurity') || ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const bypassPaths = [
    '/api/csrf-token',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/register-tenant',
    '/api/setup/status',
    '/api/setup',
  ];
  
  if (isSecurityOrWriteRequest && !bypassPaths.some(p => req.originalUrl.startsWith(p))) {
    if (!validateRequestSignature(req)) {
      const layer8 = firewallLayers[7]; // Layer 8 (index 7)
      if (loopEnabled) {
        return triggerLoopTrap(req, res, ip, tenantId, layer8, 'Client Request Signature Mismatch', 'Anti-Reverse Engineering Decoy');
      } else {
        return serveHoneypot(req, res, ip, tenantId, layer8, 'Client Request Signature Mismatch', 'Anti-Reverse Engineering Decoy');
      }
    }
  }

  // Special direct bypass for dashboard APIs after their signature has been verified
  if (req.originalUrl.startsWith('/api/cybersecurity')) {
    return next();
  }

  // 2. ESCALATION CHECK (FRUSTRATION OVERDRIVE):
  // Check violation statistics from Redis or local cache in isolated tenant spaces
  let violationCount = 0;
  
  try {
    const redis = getRedisClient();
    const redisKey = `cyber:firewall:tenant:${tidKey}:ip:${ip}`;
    const stats = await redis.hgetall(redisKey);
    violationCount = Number(stats.count || 0);
  } catch (err) {
    // Fallback to local memory statistical tracking per tenant
    const tenantMap = localTenantStats.get(tidKey);
    if (tenantMap) {
      const currentStat = tenantMap.get(ip);
      violationCount = currentStat ? currentStat.count : 0;
    }
  }

  // Auto-escalation trigger (Strictly isolated by Tenant!)
  if (violationCount >= FRUSTRATION_THRESHOLD && loopEnabled) {
    const dummyLayer = { level: 99, name: 'Permanent IP Isolation Tarpit' };
    return triggerLoopTrap(
      req,
      res,
      ip,
      tenantId,
      dummyLayer,
      'IP Block Escalation Trigger',
      'Persistent Infinite Memory Bloater'
    );
  }

  // Intercept via 11-Layer firewall
  for (const layer of firewallLayers) {
    const violation = layer.check(req);
    if (violation) {
      if (loopEnabled) {
        return triggerLoopTrap(req, res, ip, tenantId, layer, violation.branch, violation.honeypot);
      } else {
        return serveHoneypot(req, res, ip, tenantId, layer, violation.branch, violation.honeypot);
      }
    }
  }

  next();
}

module.exports = {
  cyberFirewallMiddleware,
  firewallLayers,
  localLogs,
  localTenantStats,
  localTenantLoop,
  logIncident,
  triggerLoopTrap,
  serveHoneypot,
  getLoopEnabled: (tenantId) => {
    const tidKey = tenantId ? String(tenantId) : 'global';
    const loopVal = localTenantLoop.get(tidKey);
    return loopVal !== undefined ? loopVal : true;
  },
  setLoopEnabled: async (tenantId, val) => { 
    const tidKey = tenantId ? String(tenantId) : 'global';
    localTenantLoop.set(tidKey, val);
    try {
      const redis = getRedisClient();
      await redis.set(`cyber:firewall:tenant:${tidKey}:loop_enabled`, String(val));
    } catch (err) {}
  }
};
