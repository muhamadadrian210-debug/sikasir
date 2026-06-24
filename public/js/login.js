import { api, setToken, setUser, clearAuth } from './api.js';

const loginForm = document.getElementById('login-form');
const alertEl = document.getElementById('login-alert');

// If already logged in, skip to app
if (localStorage.getItem('sikasir_token')) {
  window.location.href = '/app.html';
}

// Cek apakah setup sudah dilakukan — kalau belum ada tenant, redirect ke setup
(async () => {
  try {
    const res = await fetch('/api/setup/status');
    const data = await res.json();
    if (!data.hasAdmin) {
      window.location.href = '/setup.html';
    }
  } catch {
    // Server belum siap, biarkan halaman login tampil
  }
})();

function showAlert(msg, kind = 'error') {
  alertEl.textContent = msg;
  alertEl.className = `alert ${kind === 'success' ? 'alert-success' : 'alert-error'}`;
  alertEl.classList.remove('hidden');
}

function hideAlert() {
  alertEl.classList.add('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  const fd = new FormData(loginForm);
  const username = fd.get('username');
  const password = fd.get('password');
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    setToken(data.token);
    setUser(data.user);
    const defaultMode = data.user.role === 'admin' ? 'both' : 'kasir';
    localStorage.setItem('sikasir_app_mode', defaultMode);
    window.location.href = '/app.html';
  } catch (err) {
    if (err.status === 401) {
      clearAuth();
    }
    showAlert(err.message || 'Gagal masuk');
  }
});

document.querySelectorAll('.btn-pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-pw-target');
    const input = document.getElementById(id);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Sembunyikan' : 'Tampilkan';
    btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
  });
});
