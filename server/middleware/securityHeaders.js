const helmet = require('helmet');

function securityHeaders() {
  const isProd = process.env.NODE_ENV === 'production';
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts: isProd
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  });
}

function legacyXssProtectionHeader() {
  return (req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  };
}

module.exports = { securityHeaders, legacyXssProtectionHeader };
