const MAX_STR = 8000;

/**
 * Pembersihan input: null byte, panjang, pola script.
 * Query DB tetap pakai parameter — cegah SQL injection.
 * HTML di output di-escape di klien; di sini tidak di-`escape` penuh agar password & simbol aman.
 */
function scrubString(s) {
  if (typeof s !== 'string') return s;
  let out = s.replace(/\0/g, '').trim();
  if (out.length > MAX_STR) out = out.slice(0, MAX_STR);
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  return out;
}

function walk(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return scrubString(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (Array.isArray(obj)) return obj.map(walk);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      const key = scrubString(String(k));
      if (!key) continue;
      out[key] = walk(obj[k]);
    }
    return out;
  }
  return obj;
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = walk(req.body);
  }
  next();
}

module.exports = { sanitizeBody };
