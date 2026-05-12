import { getToken, getUser } from './api.js';

const MODE_KEY = 'sikasir_app_mode';

if (!getToken()) {
  window.location.href = '/';
}

const user = getUser();
if (!user) {
  window.location.href = '/';
}

const isAdmin = user.role === 'admin';
const hint = document.getElementById('mode-user-hint');
const grid = document.getElementById('mode-grid');

hint.textContent = `Masuk sebagai ${user.username} (${isAdmin ? 'Admin' : 'Kasir'}).`;

const options = [
  {
    mode: 'kasir',
    title: 'Kasir',
    desc: 'POS & riwayat transaksi — fokus melayani pelanggan.',
    icon: '🛒',
    show: true,
  },
  {
    mode: 'admin',
    title: 'Admin',
    desc: 'Kelola produk, stok, laporan, akun — tanpa menu POS di sidebar.',
    icon: '📊',
    show: true,
  },
  {
    mode: 'both',
    title: 'Keduanya',
    desc: 'Akses penuh: kasir + semua fitur admin.',
    icon: '⚡',
    show: true,
  },
];

grid.innerHTML = options
  .filter((o) => o.show)
  .map(
    (o) => `
    <button type="button" class="mode-card" data-mode="${o.mode}">
      <span class="mode-card-icon" aria-hidden="true">${o.icon}</span>
      <span class="mode-card-title">${o.title}</span>
      <span class="mode-card-desc">${o.desc}</span>
    </button>`
  )
  .join('');

grid.querySelectorAll('.mode-card').forEach((btn) => {
  btn.addEventListener('click', () => {
    localStorage.setItem(MODE_KEY, btn.dataset.mode);
    window.location.href = '/app.html';
  });
});
