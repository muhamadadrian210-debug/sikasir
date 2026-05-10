const { clientIp, recordViolation, blacklistPermanent } = require('./ipLists');
const { sendAlert } = require('./emailAlert');

const MAX_FAIL = Number(process.env.LOGIN_MAX_FAIL) || 5;
const LOCK_MS = Number(process.env.LOGIN_LOCK_MS) || 60 * 60 * 1000;

const state = new Map();

function getState(ip) {
  return state.get(ip) || { fails: 0, lockedUntil: 0 };
}

function isLoginLocked(ip) {
  const s = getState(ip);
  return s.lockedUntil > Date.now();
}

async function recordLoginFailure(ip) {
  const s = getState(ip);
  if (s.lockedUntil > Date.now()) return { locked: true, lockedUntil: s.lockedUntil };
  s.fails += 1;
  if (s.fails >= MAX_FAIL) {
    s.lockedUntil = Date.now() + LOCK_MS;
    s.fails = 0;
    state.set(ip, s);
    const r = recordViolation(ip, 'brute_login');
    if (r.blocked) blacklistPermanent(ip);
    await sendAlert(
      '[SiKasir] Login diblokir',
      `IP ${ip} diblokir selama 1 jam setelah ${MAX_FAIL} gagal login. Violations: ${r.violations}`
    );
    return { locked: true, lockedUntil: s.lockedUntil };
  }
  state.set(ip, s);
  return { locked: false, fails: s.fails };
}

function clearLoginState(ip) {
  state.delete(ip);
}

module.exports = {
  isLoginLocked,
  recordLoginFailure,
  clearLoginState,
  clientIp,
};
