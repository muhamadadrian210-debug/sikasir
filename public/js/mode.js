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
const isBackoffice = user.role === 'backoffice' || user.role === 'admin';
const hint = document.getElementById('mode-user-hint');
const grid = document.getElementById('mode-grid');

const ICONS = {
  kasir: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  admin: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  both: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};

const roleLabel = isAdmin ? 'Owner / Admin Toko' : (user.role === 'backoffice' ? 'Staf Backoffice' : 'Staf Kasir');
const roleBadgeClass = isAdmin ? 'badge-admin' : (user.role === 'backoffice' ? 'badge-backoffice' : 'badge-kasir');

hint.innerHTML = `Pengguna: <strong>${user.username}</strong> &bull; Peran: <span class="badge ${roleBadgeClass}">${roleLabel}</span>`;

const options = [
  {
    mode: 'kasir',
    title: 'Staf Kasir (POS Register)',
    desc: 'Fokus melayani pelanggan, pencarian cepat, scan barcode, dan cetak struk nota.',
    icon: ICONS.kasir,
    show: true,
  },
  {
    mode: 'admin',
    title: 'Backoffice (Inventori & Laporan)',
    desc: 'Kelola stok barang, barang masuk, laporan laba rugi harian, dan keuangan toko.',
    icon: ICONS.admin,
    show: isBackoffice,
  },
  {
    mode: 'both',
    title: 'Mode Lengkap (Kasir + Backoffice)',
    desc: 'Akses penuh tanpa batas untuk melayani kasir sekaligus memantau inventori toko.',
    icon: ICONS.both,
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
