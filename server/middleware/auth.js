const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  const token = h && h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Token diperlukan' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    next();
  };
}

/**
 * Ensures the authenticated user has a tenant_id in their JWT.
 * Use after authMiddleware on routes that require tenant context.
 */
function requireTenant(req, res, next) {
  if (!req.user || !req.user.tenant_id) {
    return res.status(401).json({ error: 'Konteks tenant diperlukan. Silakan login ulang.' });
  }
  next();
}

module.exports = { authMiddleware, requireRole, requireTenant };
