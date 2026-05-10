const { clientIp } = require('../lib/ipLists');

/** Setelah rate limit tercapai, blokir IP selama 15 menit */
const BAN_MS = 15 * 60 * 1000;
const tempBanUntil = new Map();

function setTempBan(ip) {
  tempBanUntil.set(ip, Date.now() + BAN_MS);
}

function tempBanMiddleware(req, res, next) {
  const ip = clientIp(req);
  const until = tempBanUntil.get(ip);
  if (until && Date.now() < until) {
    return res.status(429).json({
      error: 'Terlalu banyak permintaan. IP diblokir sementara 15 menit.',
    });
  }
  if (until && Date.now() >= until) tempBanUntil.delete(ip);
  next();
}

module.exports = { tempBanMiddleware, setTempBan };
