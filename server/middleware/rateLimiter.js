const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
const { clientIp, recordViolation, blacklistPermanent } = require('../lib/ipLists');
const { setTempBan } = require('./tempBan');
const { getRedisClient } = require('../config/redis');

const WINDOW_MS = 60 * 1000;
const MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().call(...args),
  }),
  windowMs: WINDOW_MS,
  max: MAX,
  standardHeaders: true,
  legacyHeaders: false,
  /** Ambil CSRF tidak boleh ikut terhitung (banyak retry form = banyak GET ini). */
  skip: (req) =>
    req.method === 'GET' && String(req.originalUrl || req.url || '').includes('/csrf-token'),
  keyGenerator: (req) => clientIp(req),
  handler: (req, res, next, options) => {
    const ip = clientIp(req);
    setTempBan(ip);
    const r = recordViolation(ip, 'rate_limit');
    if (r.blocked) {
      blacklistPermanent(ip);
      console.warn(`[security] Permanent blacklist after violations: ${ip}`);
    }
    res.status(options.statusCode || 429).json({
      error: 'Terlalu banyak permintaan. Coba lagi nanti.',
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
  },
});

module.exports = { apiLimiter };
