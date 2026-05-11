import { api, setToken, setUser } from './api.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const alertEl = document.getElementById('login-alert');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

if (localStorage.getItem('sikasir_token')) {
  window.location.href = localStorage.getItem('sikasir_app_mode') ? '/app.html' : '/mode.html';
}

// Cek apakah admin sudah ada, kalau belum redirect ke setup
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

function switchPanel(panel) {
  const loginActive = panel === 'login';
  loginForm.classList.toggle('hidden', !loginActive);
  registerForm.classList.toggle('hidden', loginActive);
  tabLogin.classList.toggle('active', loginActive);
  tabRegister.classList.toggle('active', !loginActive);
  tabLogin.setAttribute('aria-selected', loginActive);
  tabRegister.setAttribute('aria-selected', !loginActive);
  hideAlert();
}

tabLogin.addEventListener('click', () => switchPanel('login'));
tabRegister.addEventListener('click', () => switchPanel('register'));

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
    localStorage.removeItem('sikasir_app_mode');
    window.location.href = '/mode.html';
  } catch (err) {
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

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;
  if (p !== p2) {
    showAlert('Password tidak sama');
    return;
  }
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: { username: u, password: p },
    });
    setToken(data.token);
    setUser(data.user);
    localStorage.removeItem('sikasir_app_mode');
    window.location.href = '/mode.html';
  } catch (err) {
    showAlert(err.message || 'Gagal mendaftar');
  }
});
