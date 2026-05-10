/** IP blacklist & violation counter (in-memory; restart clears — gunakan Redis di produksi) */

const permanentBlacklist = new Set();
const violations = new Map();

const THRESHOLD = Number(process.env.BLACKLIST_VIOLATION_THRESHOLD) || 10;

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '0.0.0.0';
}

function isBlacklisted(ip) {
  return permanentBlacklist.has(ip);
}

function blacklistPermanent(ip) {
  permanentBlacklist.add(ip);
}

function recordViolation(ip, reason = '') {
  const n = (violations.get(ip) || 0) + 1;
  violations.set(ip, n);
  if (n >= THRESHOLD) {
    blacklistPermanent(ip);
    return { blocked: true, violations: n, reason };
  }
  return { blocked: false, violations: n, reason };
}

function resetViolations(ip) {
  violations.delete(ip);
}

module.exports = {
  clientIp,
  isBlacklisted,
  blacklistPermanent,
  recordViolation,
  resetViolations,
  permanentBlacklist,
  THRESHOLD,
};
