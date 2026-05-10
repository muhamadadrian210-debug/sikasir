/**
 * Blokir User-Agent yang mencurigakan (scanner otomatis).
 */
const BAD_UA = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /masscan/i,
  /nmap\/script/i,
  /acunetix/i,
  /burpsuite/i,
];

function botBlockMiddleware(req, res, next) {
  const ua = req.headers['user-agent'] || '';
  if (!ua.trim() && req.method !== 'GET') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (BAD_UA.some((re) => re.test(ua))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = { botBlockMiddleware };
