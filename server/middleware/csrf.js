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
  
  // Endpoint auth publik (login & registrasi toko) tidak mewajibkan CSRF token
  if (url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register') || url.startsWith('/api/auth/register-tenant')) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const hasBearer = !!(req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer '));
  const isMobileClient = req.headers['x-client-app'] === 'sikasir-mobile-pos';

  // Jika token CSRF valid, ada JWT Bearer, ATAU request dari Mobile App resmi, izinkan lewat
  if (!consume(token) && !hasBearer && !isMobileClient) {
    return res.status(403).json({ error: 'CSRF token tidak valid atau sudah dipakai. Ambil token baru.' });
  }
  next();
}

module.exports = { issueCsrf, csrfProtection };
