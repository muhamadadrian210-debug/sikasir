const { issue, consume } = require('../lib/csrfStore');

function issueCsrf(req, res) {
  const token = issue();
  res.json({ csrfToken: token });
}

function csrfProtection(req, res, next) {
  const m = req.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return next();
  const url = req.originalUrl || '';
  if (url.includes('/csrf-token')) return next();

  const token = req.headers['x-csrf-token'];
  if (!consume(token)) {
    return res.status(403).json({ error: 'CSRF token tidak valid atau sudah dipakai. Ambil token baru.' });
  }
  next();
}

module.exports = { issueCsrf, csrfProtection };
