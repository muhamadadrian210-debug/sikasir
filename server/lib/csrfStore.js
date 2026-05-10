const crypto = require('crypto');

/** One-time CSRF tokens (in-memory) */
const tokens = new Map();
const TTL_MS = 60 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [t, exp] of tokens) {
    if (exp < now) tokens.delete(t);
  }
}

setInterval(cleanup, 60 * 1000).unref();

function issue() {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, Date.now() + TTL_MS);
  return token;
}

function consume(token) {
  if (!token || typeof token !== 'string') return false;
  const exp = tokens.get(token);
  if (!exp || exp < Date.now()) {
    tokens.delete(token);
    return false;
  }
  tokens.delete(token);
  return true;
}

module.exports = { issue, consume };
