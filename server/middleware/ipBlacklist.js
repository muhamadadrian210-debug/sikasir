const { clientIp, isBlacklisted } = require('../lib/ipLists');

function ipBlacklistMiddleware(req, res, next) {
  const ip = clientIp(req);
  if (isBlacklisted(ip)) {
    return res.status(403).json({ error: 'IP diblokir' });
  }
  next();
}

module.exports = { ipBlacklistMiddleware };
