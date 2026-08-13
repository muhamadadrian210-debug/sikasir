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

hint.innerHTML = `👤 Pengguna: <strong>${user.username}</strong> &bull; Peran: <span class="badge ${isAdmin ? 'badge-admin' : 'badge-kasir'}">${isAdmin ? 'Admin Toko' : 'Staf Kasir'}</span>`;

const options = [
  {
    mode: 'kasir',
    title: 'Staf Kasir (POS Register)',
    desc: 'Fokus melayani pelanggan, pencarian cepat, scan barcode, dan cetak struk nota.',
    icon: '🛒',
    show: true,
  },
  {
    mode: 'admin',
    title: 'Admin Toko (Backoffice)',
    desc: 'Kelola stok, barang masuk, laporan laba rugi, mutasi cabang, staf & keamanan.',
    icon: '📊',
    show: isAdmin,
  },
  {
    mode: 'both',
    title: 'Mode Lengkap (Kasir + Admin)',
    desc: 'Akses penuh tanpa batas untuk melayani kasir sekaligus memantau inventori toko.',
    icon: '⚡',
    show: isAdmin,
  },
];

grid.innerHTML = options
  .filter((o) => o.show)
  .map(
    (o) => `
    <button type="button" class="mode-card" data-mode="${o.mode}">
      <div class="mode-card-icon" aria-hidden="true">${o.icon}</div>
      <div>
        <div class="mode-card-title">${o.title}</div>
        <div class="mode-card-desc">${o.desc}</div>
      </div>
    </button>`
  )
  .join('');

grid.querySelectorAll('.mode-card').forEach((btn) => {
  btn.addEventListener('click', () => {
    localStorage.setItem(MODE_KEY, btn.dataset.mode);
    window.location.href = '/app.html';
  });
});
