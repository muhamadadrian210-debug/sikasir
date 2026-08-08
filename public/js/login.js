import { api, setToken, setUser, clearAuth } from './api.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const alertEl = document.getElementById('login-alert');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

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
  const company_id = fd.get('company_id') || '';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { username, password, company_id },
    });
    setToken(data.token);
    setUser(data.user);
    if (company_id) localStorage.setItem('sikasir_company_id', company_id);
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

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  const store_name = document.getElementById('reg-store-name').value.trim();
  const store_type = document.getElementById('reg-store-type').value;
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const passwordConfirm = document.getElementById('reg-password-confirm').value;
  const company_id = document.getElementById('reg-company-id').value.trim();

  if (!store_type) {
    showAlert('Pilih jenis toko terlebih dahulu');
    return;
  }

  if (password !== passwordConfirm) {
    showAlert('Password tidak sama');
    return;
  }

  const full_store_name = `${store_name} (${store_type})`;

  try {
    const data = await api('/auth/register-tenant', {
      method: 'POST',
      body: { store_name: full_store_name, username, password, company_id },
    });
    setToken(data.token);
    setUser(data.user);
    if (company_id) localStorage.setItem('sikasir_company_id', company_id);
    const defaultMode = data.user.role === 'admin' ? 'both' : 'kasir';
    localStorage.setItem('sikasir_app_mode', defaultMode);
    window.location.href = '/app.html';
  } catch (err) {
    showAlert(err.message || 'Gagal mendaftar toko');
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
