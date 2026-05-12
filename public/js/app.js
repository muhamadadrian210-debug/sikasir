import { api, getToken, getUser, setToken, setUser } from './api.js';
import { startScanner, stopScanner } from './scanner.js';

const MODE_KEY = 'sikasir_app_mode';

if (!getToken()) {
  window.location.href = '/';
}

if (!localStorage.getItem(MODE_KEY)) {
  window.location.href = '/mode.html';
}

const user = getUser();
const isAdmin = user?.role === 'admin';

function normalizeMode() {
  const m = localStorage.getItem(MODE_KEY);
  if (!m || !['kasir', 'admin', 'both'].includes(m)) return 'both';
  return m;
}

const storedMode = normalizeMode();
localStorage.setItem(MODE_KEY, storedMode);

const NAV_ADMIN = [
  { id: 'pos', label: 'Kasir (POS)', title: 'Kasir (POS)', icon: '🛒' },
  { id: 'scan', label: 'Scan & Daftarkan', title: 'Scan & Daftarkan Barang', icon: '📷' },
  { id: 'products', label: 'Produk', title: 'Manajemen Produk', icon: '📦' },
  { id: 'incoming', label: 'Barang Masuk', title: 'Barang Masuk (log)', icon: '📥' },
  { id: 'reports', label: 'Laporan & Margin', title: 'Laporan & Margin', icon: '📊' },
  { id: 'stock', label: 'Stok', title: 'Manajemen Stok', icon: '🗃️' },
  { id: 'users', label: 'Kasir', title: 'Manajemen Kasir', icon: '👥' },
  { id: 'audit', label: 'Log Audit', title: 'Log Audit Admin', icon: '📝' },
  { id: 'history', label: 'Riwayat', title: 'Riwayat Transaksi', icon: '🕐' },
];

const NAV_KASIR = [
  { id: 'pos', label: 'Kasir (POS)', title: 'Kasir (POS)', icon: '🛒' },
  { id: 'history', label: 'Riwayat', title: 'Riwayat Transaksi', icon: '🕐' },
];

const TITLE_LOOKUP = {};
[NAV_ADMIN, NAV_KASIR].forEach((arr) => {
  arr.forEach((it) => {
    if (!TITLE_LOOKUP[it.id]) TITLE_LOOKUP[it.id] = it.title;
  });
});

function getNavItems() {
  if (storedMode === 'kasir') return NAV_KASIR;
  if (storedMode === 'admin') return NAV_ADMIN.filter((x) => x.id !== 'pos');
  return NAV_ADMIN;
}

function getDefaultStartView() {
  if (storedMode === 'kasir') return 'pos';
  if (storedMode === 'admin') return 'scan';
  return 'pos';
}

let currentView = 'pos';
let categories = [];
let salesChart = null;

/** Cached products for offline POS */
let productsCache = [];

async function fetchProductsCached() {
  try {
    const data = await api('/products');
    productsCache = data;
    try {
      const cache = await caches.open('sikasir-data');
      await cache.put(
        '/offline-products.json',
        new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
      );
    } catch {
      /* SW optional */
    }
    return data;
  } catch {
    try {
      const cache = await caches.open('sikasir-data');
      const r = await cache.match('/offline-products.json');
      if (r) {
        productsCache = await r.json();
        return productsCache;
      }
    } catch {
      /* noop */
    }
    throw new Error('Tidak ada koneksi dan cache produk kosong');
  }
}

function productByBarcode(code) {
  const c = String(code).trim();
  return productsCache.find((p) => p.barcode === c);
}

function money(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(n) || 0
  );
}

function showAlert(msg, kind = 'error') {
  const el = document.getElementById('global-alert');
  if (!msg) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<div class="alert alert-${kind === 'success' ? 'success' : kind === 'warn' ? 'warn' : 'error'}">${msg}</div>`;
}

function setActiveNav(id) {
  document.querySelectorAll('#sidebar-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === id);
  });
  document.getElementById('page-title').textContent = TITLE_LOOKUP[id] || '';
}

function showView(id) {
  currentView = id;
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  const sec = document.getElementById(`view-${id}`);
  if (sec) sec.classList.remove('hidden');
  setActiveNav(id);
}

function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  const items = getNavItems();
  const modeLabels = {
    kasir: 'Mode: Kasir',
    admin: 'Mode: Admin',
    both: 'Mode: Kasir + Admin',
  };
  document.getElementById('sidebar-mode-label').textContent = modeLabels[storedMode] || '';

  nav.innerHTML = items
    .map(
      (it) =>
        `<button type="button" data-view="${it.id}" data-title="${it.title}">
          <span class="nav-icon">${it.icon}</span>${it.label}
        </button>`
    )
    .join('');
  nav.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.view);
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('visible');
      if (btn.dataset.view === 'reports') loadReports();
      if (btn.dataset.view === 'products') loadProductsTable();
      if (btn.dataset.view === 'stock') loadStockTable();
      if (btn.dataset.view === 'users') loadUsersTable();
      if (btn.dataset.view === 'history') loadHistoryTable();
      if (btn.dataset.view === 'scan') renderScanPanel();
      if (btn.dataset.view === 'incoming') loadIncomingPanel();
      if (btn.dataset.view === 'audit') loadAuditTable();
    });
  });
  document.getElementById('user-badge').innerHTML = `
    <span class="badge ${isAdmin ? 'badge-admin' : 'badge-kasir'}">${user.username}</span>
    <span style="opacity:.85"> · ${isAdmin ? 'Admin' : 'Kasir'}</span>`;
}

/* -------- POS -------- */
let cart = [];

function renderPOS() {
  const el = document.getElementById('view-pos');
  el.innerHTML = `
    <div class="grid-2">
      <div>
        <h3 style="margin-top:0">Keranjang</h3>
        <div class="field">
          <label>Barcode manual</label>
          <div class="actions-inline">
            <input type="text" id="pos-barcode-input" placeholder="Scan atau ketik" class="mono" style="flex:1;min-width:120px;padding:.6rem;border:1px solid var(--border);border-radius:8px"/>
            <button type="button" class="btn btn-secondary" id="pos-btn-scan">📷 Scan</button>
            <button type="button" class="btn btn-primary" id="pos-add-manual">Tambah</button>
          </div>
        </div>
        <div id="pos-cart-list"></div>
        <div class="cart-total mt-1">Total: <span class="mono" id="pos-total">${money(0)}</span></div>
      </div>
      <div>
        <h3 style="margin-top:0">Pembayaran</h3>
        <div class="field">
          <label>Uang dibayar</label>
          <input type="number" id="pos-paid" min="0" step="500" placeholder="0" />
        </div>
        <p>Kembalian: <strong class="mono" id="pos-change">${money(0)}</strong></p>
        <div class="actions-inline mt-1">
          <button type="button" class="btn btn-success" id="pos-checkout">Proses bayar</button>
          <button type="button" class="btn btn-secondary" id="pos-clear">Kosongkan</button>
          <button type="button" class="btn btn-secondary" id="pos-print-last" disabled>Struk PDF</button>
        </div>
        <p id="pos-offline-note" class="mt-1" style="font-size:.85rem;color:var(--secondary)"></p>
      </div>
    </div>`;

  const paidEl = document.getElementById('pos-paid');
  const updateChange = () => {
    const total = cart.reduce((s, i) => s + i.qty * i.sale_price, 0);
    const paid = Number(paidEl.value) || 0;
    document.getElementById('pos-change').textContent = money(Math.max(0, paid - total));
  };
  paidEl.addEventListener('input', updateChange);

  document.getElementById('pos-btn-scan').onclick = () => openScanModal(onPosScan);
  document.getElementById('pos-add-manual').onclick = () => {
    const code = document.getElementById('pos-barcode-input').value.trim();
    if (!code) return;
    onPosScan(code);
    document.getElementById('pos-barcode-input').value = '';
  };
  document.getElementById('pos-clear').onclick = () => {
    cart = [];
    renderCart();
    lastReceipt = null;
    document.getElementById('pos-print-last').disabled = true;
  };
  document.getElementById('pos-checkout').onclick = checkout;
  document.getElementById('pos-print-last').onclick = () => lastReceipt && printReceiptPdf(lastReceipt);

  renderCart();
  fetchProductsCached()
    .then(() => {
      document.getElementById('pos-offline-note').textContent =
        'Produk di-cache untuk mode offline kasir.';
    })
    .catch(() => {
      document.getElementById('pos-offline-note').textContent =
        'Gunakan koneksi sekali untuk mengunduh daftar produk.';
    });
}

function renderCart() {
  const list = document.getElementById('pos-cart-list');
  if (!list) return;
  const total = cart.reduce((s, i) => s + i.qty * i.sale_price, 0);
  document.getElementById('pos-total').textContent = money(total);
  document.getElementById('pos-paid')?.dispatchEvent(new Event('input'));

  if (!cart.length) {
    list.innerHTML = '<p style="opacity:.7">Belum ada barang.</p>';
    return;
  }
  list.innerHTML = cart
    .map(
      (i, idx) => `
    <div class="cart-row">
      <div>
        <div>${i.name}</div>
        <span class="mono" style="font-size:.85rem">${i.barcode}</span>
      </div>
      <div class="text-right">
        <div>${money(i.sale_price)} × ${i.qty}</div>
        <button type="button" class="btn btn-secondary" style="padding:.25rem .5rem;font-size:.8rem" data-idx="${idx}" data-act="minus">−</button>
        <button type="button" class="btn btn-secondary" style="padding:.25rem .5rem;font-size:.8rem" data-idx="${idx}" data-act="plus">+</button>
        <button type="button" class="btn btn-danger" style="padding:.25rem .5rem;font-size:.8rem" data-idx="${idx}" data-act="remove">×</button>
      </div>
    </div>`
    )
    .join('');
  list.querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.idx);
      const act = b.dataset.act;
      if (act === 'remove') cart.splice(idx, 1);
      else if (act === 'plus') cart[idx].qty += 1;
      else if (act === 'minus') {
        cart[idx].qty -= 1;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
      }
      renderCart();
    };
  });
}

async function onPosScan(code) {
  closeScanModal();
  try {
    await fetchProductsCached();
  } catch {
    showAlert('Tidak bisa memuat daftar produk.', 'error');
    return;
  }
  const p = productByBarcode(code);
  if (!p) {
    showAlert('Barang belum terdaftar, hubungi admin', 'warn');
    return;
  }
  if (p.stock < 1) {
    showAlert(`Stok "${p.name}" habis.`, 'warn');
    return;
  }
  const existing = cart.find((c) => c.product_id === p.id);
  if (existing) {
    if (existing.qty >= p.stock) {
      showAlert(`Stok "${p.name}" tidak mencukupi.`, 'warn');
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({
      product_id: p.id,
      barcode: p.barcode,
      name: p.name,
      sale_price: Number(p.sale_price),
      qty: 1,
      maxStock: p.stock,
    });
  }
  showAlert('', '');
  renderCart();
}

let lastReceipt = null;

async function checkout() {
  const total = cart.reduce((s, i) => s + i.qty * i.sale_price, 0);
  const paid = Number(document.getElementById('pos-paid').value) || 0;
  if (!cart.length) {
    showAlert('Keranjang kosong.', 'warn');
    return;
  }
  if (paid < total) {
    showAlert('Uang kurang.', 'warn');
    return;
  }
  try {
    const items = cart.map((c) => ({ product_id: c.product_id, qty: c.qty }));
    const res = await api('/transactions/checkout', {
      method: 'POST',
      body: { items, paid },
    });
    lastReceipt = {
      id: res.transaction_id,
      items: [...cart],
      total: res.total,
      paid: res.paid,
      change: res.change,
      kasir: user.username,
      time: new Date().toISOString(),
    };
    document.getElementById('pos-print-last').disabled = false;
    cart = [];
    renderCart();
    document.getElementById('pos-paid').value = '';
    showAlert('Transaksi berhasil.', 'success');
    fetchProductsCached().catch(() => {});
  } catch (e) {
    showAlert(e.message || 'Gagal checkout', 'error');
  }
}

function printReceiptPdf(rec) {
  const jsPDFLib = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDFLib) {
    alert('Library PDF belum dimuat. Coba refresh halaman.');
    return;
  }
  const doc = new jsPDFLib({ unit: 'mm', format: [72, 200] });
  let y = 8;
  doc.setFontSize(11);
  doc.text('SiKasir', 36, y, { align: 'center' });
  y += 6;
  doc.setFontSize(8);
  doc.text(`Trx #${rec.id}`, 36, y, { align: 'center' });
  y += 4;
  doc.text(new Date(rec.time).toLocaleString('id-ID'), 36, y, { align: 'center' });
  y += 6;
  doc.text(`Kasir: ${rec.kasir}`, 4, y);
  y += 5;
  rec.items.forEach((i) => {
    doc.text(`${i.name.substring(0, 22)}`, 4, y);
    y += 4;
    doc.text(`${i.qty} x ${money(i.sale_price)} = ${money(i.qty * i.sale_price)}`, 4, y);
    y += 5;
  });
  y += 2;
  doc.text(`Total: ${money(rec.total)}`, 4, y);
  y += 5;
  doc.text(`Bayar: ${money(rec.paid)}`, 4, y);
  y += 5;
  doc.text(`Kembali: ${money(rec.change)}`, 4, y);
  y += 8;
  doc.setFontSize(6);
  doc.setTextColor(120);
  doc.text('Product by Sivilize Corp', 36, Math.min(y + 4, 192), { align: 'center' });
  doc.save(`struk-${rec.id}.pdf`);
}

/* -------- Scan modal -------- */
let scanCallback = null;

function openScanModal(cb) {
  scanCallback = cb;
  const backdrop = document.getElementById('modal-scan');
  const host = document.getElementById('scan-video-host');
  host.innerHTML = '';
  backdrop.classList.add('open');

  // Push history state so back button closes modal instead of leaving app
  history.pushState({ modal: 'scan' }, '');

  startScanner(host, (code) => {
    stopScanner();
    backdrop.classList.remove('open');
    scanCallback?.(code);
    scanCallback = null;
  }).catch((err) => {
    showAlert(err.message || 'Kamera gagal', 'error');
    backdrop.classList.remove('open');
  });
}

function closeScanModal() {
  stopScanner();
  document.getElementById('modal-scan').classList.remove('open');
}

document.getElementById('modal-scan-close').addEventListener('click', () => {
  closeScanModal();
  scanCallback = null;
});

/* Upload foto dari galeri untuk scan barcode */
document.getElementById('modal-scan-upload').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const ZXing = window.ZXing;
  if (!ZXing) { showAlert('ZXing belum dimuat', 'error'); return; }

  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    try {
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      const reader = new ZXing.MultiFormatReader();
      reader.setHints(hints);
      const luminance = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
      const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
      const result = reader.decode(bitmap);
      if (result) {
        const code = result.getText();
        closeScanModal();
        scanCallback?.(code);
        scanCallback = null;
      }
    } catch {
      showAlert('Barcode tidak terbaca dari foto. Coba foto yang lebih jelas.', 'warn');
    }
  };
  img.src = url;
  // reset input so same file can be re-selected
  e.target.value = '';
});

/* -------- Scan register (admin) -------- */
function renderScanPanel() {
  const el = document.getElementById('view-scan');
  el.innerHTML = `
    <p>Scan barcode pada kemasan. Jika belum terdaftar, isi form yang muncul.</p>
    <button type="button" class="btn btn-primary" id="scan-start">Mulai scan</button>
    <div id="scan-result" class="mt-1"></div>`;
  document.getElementById('scan-start').onclick = () =>
    openScanModal(async (code) => {
      await lookupOrForm(code);
    });
}

async function loadCategories() {
  categories = await api('/categories');
}

async function lookupOrForm(barcode) {
  const box = document.getElementById('scan-result');
  try {
    const p = await api(`/products/barcode/${encodeURIComponent(barcode)}`);
    box.innerHTML = productForm(p, true);
    bindProductForm(box, p.id);
  } catch (e) {
    if (e.status === 404) {
      box.innerHTML = productForm({ barcode, name: '', purchase_price: 0, sale_price: 0, stock: 0 }, false);
      bindProductForm(box, null);
    } else {
      box.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }
}

function productForm(p, isEdit) {
  const cats = categories.map((c) => `<option value="${c.id}" ${p.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('');
  return `
    <div class="panel pf-root" style="margin-top:1rem">
      <h4>${isEdit ? 'Edit barang' : 'Daftarkan barang baru'}</h4>
      <div class="field"><label>Barcode</label><input class="mono pf-barcode" value="${escapeHtml(p.barcode || '')}" ${isEdit ? 'readonly' : ''}/></div>
      <div class="field"><label>Nama barang</label><input class="pf-name" value="${escapeHtml(p.name || '')}"/></div>
      <div class="grid-2">
        <div class="field"><label>Harga beli</label><input type="number" class="pf-buy" value="${p.purchase_price ?? 0}"/></div>
        <div class="field"><label>Harga jual</label><input type="number" class="pf-sale" value="${p.sale_price ?? 0}"/></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Stok awal / stok</label><input type="number" class="pf-stock" value="${p.stock ?? 0}"/></div>
        <div class="field"><label>Kategori</label><select class="pf-cat"><option value="">—</option>${cats}</select></div>
      </div>
      <button type="button" class="btn btn-primary pf-save">Simpan</button>
    </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function bindProductForm(container, id) {
  const root = container.querySelector('.pf-root') || container;
  root.querySelector('.pf-save').onclick = async () => {
    const body = {
      barcode: root.querySelector('.pf-barcode').value.trim(),
      name: root.querySelector('.pf-name').value.trim(),
      purchase_price: Number(root.querySelector('.pf-buy').value),
      sale_price: Number(root.querySelector('.pf-sale').value),
      stock: parseInt(root.querySelector('.pf-stock').value, 10),
      category_id: root.querySelector('.pf-cat').value || null,
    };
    try {
      if (id) await api(`/products/${id}`, { method: 'PUT', body });
      else await api('/products', { method: 'POST', body });
      showAlert('Produk disimpan.', 'success');
      fetchProductsCached().catch(() => {});
    } catch (e) {
      showAlert(e.message, 'error');
    }
  };
}

/* -------- Products table -------- */
async function loadProductsTable() {
  const el = document.getElementById('view-products');
  el.innerHTML = `<div class="actions-inline" style="margin-bottom:1rem">
    <input type="search" id="prod-q" placeholder="Cari nama/barcode..." style="flex:1;max-width:280px;padding:.5rem;border:1px solid var(--border);border-radius:8px"/>
    <button type="button" class="btn btn-primary" id="prod-add">Tambah produk</button>
  </div><div id="prod-table-wrap"></div>`;

  document.getElementById('prod-q').oninput = debounce(renderProd, 300);
  document.getElementById('prod-add').onclick = () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = productForm({ barcode: '', name: '', purchase_price: 0, sale_price: 0, stock: 0 }, false);
    el.querySelector('#prod-table-wrap').prepend(wrap);
    bindProductForm(wrap, null);
  };
  await renderProd();
}

async function renderProd() {
  const q = document.getElementById('prod-q')?.value?.trim();
  const path = q ? `/products?q=${encodeURIComponent(q)}` : '/products';
  let rows;
  try {
    rows = await api(path);
  } catch (e) {
    document.getElementById('prod-table-wrap').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    return;
  }
  const html = `
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Barcode</th><th>Nama</th><th>Beli</th><th>Jual</th><th>Stok</th><th></th></tr></thead>
      <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          <td class="mono">${r.barcode}</td>
          <td>${r.name}</td>
          <td class="mono">${money(r.purchase_price)}</td>
          <td class="mono">${money(r.sale_price)}</td>
          <td>${r.stock}</td>
          <td><button type="button" class="btn btn-secondary" data-edit="${r.id}">Edit</button>
          <button type="button" class="btn btn-danger" data-del="${r.id}">Hapus</button></td>
        </tr>`
        )
        .join('')}
      </tbody>
    </table></div>`;
  document.getElementById('prod-table-wrap').innerHTML = html;
  document.getElementById('prod-table-wrap').querySelectorAll('[data-edit]').forEach((b) => {
    b.onclick = async () => {
      const p = rows.find((x) => x.id === Number(b.dataset.edit));
      const wrap = document.createElement('div');
      wrap.innerHTML = productForm(p, true);
      document.getElementById('prod-table-wrap').prepend(wrap);
      bindProductForm(wrap, p.id);
    };
  });
  document.getElementById('prod-table-wrap').querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Hapus produk ini?')) return;
      try {
        await api(`/products/${b.dataset.del}`, { method: 'DELETE' });
        renderProd();
        fetchProductsCached().catch(() => {});
      } catch (e) {
        alert(e.message);
      }
    };
  });
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* -------- Reports -------- */
async function loadReports() {
  const el = document.getElementById('view-reports');
  el.innerHTML = `
    <div class="actions-inline" style="margin-bottom:1rem">
      <label>Periode <select id="rep-period"><option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option></select></label>
      <button type="button" class="btn btn-secondary" id="rep-export-pdf">Export PDF</button>
      <button type="button" class="btn btn-secondary" id="rep-export-csv">Export Excel (CSV)</button>
    </div>
    <div class="grid-2">
      <div class="panel"><h4 style="margin-top:0">Grafik penjualan</h4><div class="chart-box"><canvas id="chart-sales"></canvas></div></div>
      <div class="panel"><h4 style="margin-top:0">Ringkasan margin</h4><div id="rep-margin-summary"></div></div>
    </div>
    <div class="panel"><h4 style="margin-top:0">Margin per produk</h4><div id="rep-margin-table"></div></div>
    <div class="panel"><h4 style="margin-top:0">Stok menipis (≤10)</h4><div id="rep-low-stock"></div></div>`;

  const periodEl = document.getElementById('rep-period');
  const refresh = async () => {
    const period = periodEl.value;
    const [sales, margin, low] = await Promise.all([
      api(`/reports/sales-summary?period=${period}`),
      api(`/reports/margin?period=${period}`),
      api('/reports/low-stock?threshold=10'),
    ]);

    const ctx = document.getElementById('chart-sales');
    if (salesChart) salesChart.destroy();
    const labels = sales.length ? sales.map((s) => s.day) : ['—'];
    const values = sales.length ? sales.map((s) => Number(s.revenue)) : [0];
    salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Omzet', data: values, backgroundColor: '#38bdf8' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
      },
    });

    document.getElementById('rep-margin-summary').innerHTML = `
      <p>Omzet: <strong>${money(margin.total_revenue)}</strong></p>
      <p>HPP: ${money(margin.total_cost)}</p>
      <p>Profit: <strong style="color:var(--success)">${money(margin.total_profit)}</strong></p>`;

    document.getElementById('rep-margin-table').innerHTML = `
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Barcode</th><th>Nama</th><th>Qty</th><th>Omzet</th><th>Profit</th></tr></thead>
        <tbody>
        ${margin.products
          .map(
            (r) =>
              `<tr><td class="mono">${r.barcode}</td><td>${r.name}</td><td>${r.qty_sold}</td><td class="mono">${money(r.revenue)}</td><td class="mono">${money(r.profit)}</td></tr>`
          )
          .join('')}
        </tbody>
      </table></div>`;

    document.getElementById('rep-low-stock').innerHTML = low.length
      ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Barcode</th><th>Nama</th><th>Stok</th></tr></thead>
        <tbody>
        ${low.map((r) => `<tr><td class="mono">${r.barcode}</td><td>${r.name}</td><td><span class="badge badge-warn">${r.stock}</span></td></tr>`).join('')}
        </tbody></table></div>`
      : '<p>Tidak ada stok menipis.</p>';

    window.__lastReport = { sales, margin, low, period };
  };

  periodEl.onchange = refresh;
  await refresh();

  document.getElementById('rep-export-pdf').onclick = () => {
    const r = window.__lastReport;
    if (!r) return;
    const jsPDFLib = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFLib) {
      alert('Library PDF belum dimuat. Coba refresh halaman.');
      return;
    }
    const doc = new jsPDFLib();
    let y = 10;
    doc.text('SiKasir — Laporan', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Periode: ${r.period}`, 14, y);
    y += 6;
    doc.text(`Omzet: ${money(r.margin.total_revenue)} | Profit: ${money(r.margin.total_profit)}`, 14, y);
    y += 10;
    r.margin.products.slice(0, 40).forEach((p) => {
      doc.text(`${p.barcode} ${p.name.substring(0, 40)} — ${money(p.profit)}`, 14, y);
      y += 5;
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
    });
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Product by Sivilize Corp', 105, 285, { align: 'center' });
    doc.save(`laporan-${r.period}.pdf`);
  };

  document.getElementById('rep-export-csv').onclick = () => {
    const r = window.__lastReport;
    if (!r) return;
    const header = 'barcode,nama,qty_terjual,omzet,profit\n';
    const rows = r.margin.products
      .map((p) =>
        [p.barcode, `"${String(p.name).replace(/"/g, '""')}"`, p.qty_sold, p.revenue, p.profit].join(',')
      )
      .join('\n');
    const bom = '\ufeff';
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-${r.period}.csv`;
    a.click();
  };
}

/* -------- Stock -------- */
async function loadStockTable() {
  const el = document.getElementById('view-stock');
  el.innerHTML = `<div id="stock-wrap"></div>`;
  const rows = await api('/products');
  document.getElementById('stock-wrap').innerHTML = `
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Barcode</th><th>Nama</th><th>Stok</th><th>Penyesuaian</th></tr></thead>
      <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          <td class="mono">${r.barcode}</td>
          <td>${r.name}</td>
          <td>${r.stock}</td>
          <td><input type="number" data-stock-id="${r.id}" style="width:80px" placeholder="+/-"/> 
          <button type="button" class="btn btn-primary stock-adj" data-id="${r.id}">Terapkan</button></td>
        </tr>`
        )
        .join('')}
      </tbody>
    </table></div>`;
  el.querySelectorAll('.stock-adj').forEach((b) => {
    b.onclick = async () => {
      const inp = el.querySelector(`input[data-stock-id="${b.dataset.id}"]`);
      const delta = parseInt(inp.value, 10);
      if (Number.isNaN(delta)) return;
      try {
        await api(`/products/${b.dataset.id}/stock`, { method: 'PATCH', body: { delta } });
        inp.value = '';
        loadStockTable();
        fetchProductsCached().catch(() => {});
      } catch (e) {
        alert(e.message);
      }
    };
  });
}

/* -------- Users -------- */
async function loadUsersTable() {
  const el = document.getElementById('view-users');
  el.innerHTML = `
    <div class="panel">
      <h4 style="margin-top:0">Tambah akun kasir</h4>
      <div class="grid-2">
        <div class="field"><label>Username</label><input id="nu-user"/></div>
        <div class="field"><label>Password</label><input type="password" id="nu-pass"/></div>
      </div>
      <button type="button" class="btn btn-primary" id="nu-save">Tambah</button>
    </div>
    <div id="users-wrap"></div>`;

  document.getElementById('nu-save').onclick = async () => {
    const username = document.getElementById('nu-user').value.trim();
    const password = document.getElementById('nu-pass').value;
    try {
      await api('/users', { method: 'POST', body: { username, password, role: 'kasir' } });
      document.getElementById('nu-user').value = '';
      document.getElementById('nu-pass').value = '';
      loadUsersTable();
    } catch (e) {
      alert(e.message);
    }
  };

  const users = await api('/users');
  document.getElementById('users-wrap').innerHTML = `
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Username</th><th>Role</th><th></th></tr></thead>
      <tbody>
      ${users
        .map(
          (u) => `
        <tr>
          <td>${u.username}</td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-kasir'}">${u.role}</span></td>
          <td>
            ${u.role === 'kasir' ? `<button type="button" class="btn btn-secondary" data-edit-user="${u.id}">Edit</button>
            <button type="button" class="btn btn-danger" data-del-user="${u.id}">Hapus</button>` : '—'}
          </td>
        </tr>`
        )
        .join('')}
      </tbody>
    </table></div>`;

  el.querySelectorAll('[data-del-user]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Hapus akun ini?')) return;
      try {
        await api(`/users/${b.dataset.delUser}`, { method: 'DELETE' });
        loadUsersTable();
      } catch (e) {
        alert(e.message);
      }
    };
  });
  el.querySelectorAll('[data-edit-user]').forEach((b) => {
    b.onclick = async () => {
      const u = users.find((x) => x.id === Number(b.dataset.editUser));
      const password = prompt(`Password baru untuk ${u.username} (kosongkan jika tidak diubah):`);
      const username = prompt('Username baru:', u.username);
      if (!username) return;
      try {
        const body = { username, role: 'kasir' };
        if (password) body.password = password;
        await api(`/users/${u.id}`, { method: 'PUT', body });
        loadUsersTable();
      } catch (e) {
        alert(e.message);
      }
    };
  });
}

/* -------- Barang masuk (admin) -------- */
async function loadIncomingPanel() {
  const el = document.getElementById('view-incoming');
  el.innerHTML = `<p>Catat penerimaan barang hari ini (contoh: <em>Rokok filter 1 slof</em>). Jika memilih produk katalog, stok otomatis bertambah.</p>
    <div class="grid-2">
      <div class="panel">
        <h4 style="margin-top:0">Ringkasan hari ini</h4>
        <p id="inc-summary">Memuat…</p>
        <h4 class="mt-1">Tambah entri</h4>
        <div class="field"><label>Tanggal</label><input type="date" id="inc-date"/></div>
        <div class="field"><label>Deskripsi</label><input id="inc-desc" placeholder="Mis. Rokok merk X 1 slof"/></div>
        <div class="grid-2">
          <div class="field"><label>Jumlah</label><input type="number" id="inc-qty" value="1" min="0.001" step="any"/></div>
          <div class="field"><label>Satuan</label><input id="inc-unit" placeholder="slof, dus, pcs…"/></div>
        </div>
        <div class="field"><label>Hubungkan produk (opsional)</label><select id="inc-product"><option value="">— Tidak —</option></select></div>
        <button type="button" class="btn btn-primary" id="inc-save">Simpan</button>
      </div>
      <div class="panel">
        <h4 style="margin-top:0">Daftar tanggal terpilih</h4>
        <div id="inc-list"></div>
      </div>
    </div>`;

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('inc-date').value = today;

  let products = [];
  try {
    products = await api('/products');
    const sel = document.getElementById('inc-product');
    products.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${p.name} (${p.barcode})`;
      sel.appendChild(o);
    });
  } catch {
    /* noop */
  }

  async function refresh() {
    const d = document.getElementById('inc-date').value || today;
    try {
      const sum = await api(`/incoming-goods/summary/today?date=${encodeURIComponent(d)}`);
      document.getElementById('inc-summary').innerHTML = `
        Tanggal <strong>${d}</strong>: <strong>${sum.items}</strong> entri · total qty (sum): <strong>${Number(sum.total_qty).toLocaleString('id-ID')}</strong>`;
    } catch {
      document.getElementById('inc-summary').textContent = 'Ringkasan tidak tersedia.';
    }
    try {
      const rows = await api(`/incoming-goods?date=${encodeURIComponent(d)}`);
      document.getElementById('inc-list').innerHTML = rows.length
        ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Waktu</th><th>Deskripsi</th><th>Qty</th><th>Satuan</th><th>Oleh</th><th></th></tr></thead>
          <tbody>${rows
            .map(
              (r) =>
                `<tr><td>${new Date(r.created_at).toLocaleTimeString('id-ID')}</td><td>${escapeHtml(r.description)}</td><td>${r.quantity}</td><td>${r.unit || '—'}</td><td>${r.created_by_name}</td>
                <td><button type="button" class="btn btn-danger inc-del" data-id="${r.id}">Hapus</button></td></tr>`
            )
            .join('')}</tbody></table></div>`
        : '<p>Belum ada entri.</p>';
      el.querySelectorAll('.inc-del').forEach((b) => {
        b.onclick = async () => {
          if (!confirm('Hapus entri ini?')) return;
          try {
            await api(`/incoming-goods/${b.dataset.id}`, { method: 'DELETE' });
            refresh();
          } catch (e) {
            alert(e.message);
          }
        };
      });
    } catch (e) {
      document.getElementById('inc-list').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }

  document.getElementById('inc-save').onclick = async () => {
    const entry_date = document.getElementById('inc-date').value;
    const description = document.getElementById('inc-desc').value.trim();
    const quantity = Number(document.getElementById('inc-qty').value);
    const unit = document.getElementById('inc-unit').value.trim();
    const product_id = document.getElementById('inc-product').value || null;
    try {
      await api('/incoming-goods', {
        method: 'POST',
        body: { entry_date, description, quantity, unit: unit || null, product_id },
      });
      document.getElementById('inc-desc').value = '';
      showAlert('Barang masuk tercatat.', 'success');
      refresh();
      fetchProductsCached().catch(() => {});
    } catch (e) {
      showAlert(e.message, 'error');
    }
  };

  document.getElementById('inc-date').onchange = refresh;
  await refresh();
}

/* -------- Audit log -------- */
async function loadAuditTable() {
  const el = document.getElementById('view-audit');
  el.innerHTML = `<div id="audit-wrap">Memuat…</div>`;
  try {
    const rows = await api('/audit-logs?limit=150');
    document.getElementById('audit-wrap').innerHTML = `
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Waktu</th><th>Admin</th><th>Aksi</th><th>Detail</th><th>IP</th></tr></thead>
        <tbody>
        ${rows
          .map(
            (r) =>
              `<tr><td>${new Date(r.created_at).toLocaleString('id-ID')}</td><td>${r.username || '—'}</td><td>${escapeHtml(r.action)}</td><td style="max-width:240px;font-size:.85rem">${escapeHtml(r.resource_meta || '—')}</td><td class="mono">${r.ip || '—'}</td></tr>`
          )
          .join('')}
        </tbody>
      </table></div>`;
  } catch (e) {
    document.getElementById('audit-wrap').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
  }
}

/* -------- History -------- */
async function loadHistoryTable() {
  const el = document.getElementById('view-history');
  el.innerHTML = `<div id="hist-wrap"></div>`;
  try {
    const rows = await api('/transactions');
    document.getElementById('hist-wrap').innerHTML = `
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Waktu</th><th>Kasir</th><th>Total</th><th></th></tr></thead>
        <tbody>
        ${rows
          .map(
            (r) => `
          <tr>
            <td class="mono">#${r.id}</td>
            <td>${new Date(r.created_at).toLocaleString('id-ID')}</td>
            <td>${r.kasir_name}</td>
            <td class="mono">${money(r.total)}</td>
            <td><button type="button" class="btn btn-secondary" data-tx="${r.id}">Detail</button></td>
          </tr>`
          )
          .join('')}
        </tbody>
      </table></div>
      <div id="hist-detail"></div>`;
    el.querySelectorAll('[data-tx]').forEach((b) => {
      b.onclick = async () => {
        const d = await api(`/transactions/${b.dataset.tx}`);
        document.getElementById('hist-detail').innerHTML = `
          <div class="panel mt-1">
            <h4>Transaksi #${d.id}</h4>
            <p>Total ${money(d.total)} · Bayar ${money(d.paid)} · Kembali ${money(d.change_amount)}</p>
            <div class="table-wrap"><table class="data">
              <thead><tr><th>Barcode</th><th>Nama</th><th>Qty</th><th>Subtotal</th></tr></thead>
              <tbody>
              ${d.items
                .map(
                  (i) =>
                    `<tr><td class="mono">${i.barcode}</td><td>${i.product_name}</td><td>${i.qty}</td><td class="mono">${money(i.subtotal)}</td></tr>`
                )
                .join('')}
              </tbody>
            </table></div>
          </div>`;
      };
    });
  } catch (e) {
    document.getElementById('hist-wrap').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
  }
}

/* -------- Init -------- */
document.getElementById('menu-toggle').onclick = () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('visible');
};
document.getElementById('sidebar-overlay').onclick = () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
};

document.getElementById('btn-logout').onclick = () => {
  setToken(null);
  setUser(null);
  localStorage.removeItem(MODE_KEY);
  window.location.href = '/';
};

async function init() {
  buildSidebar();
  try {
    await loadCategories();
  } catch {
    showAlert('Gagal memuat kategori. Periksa server & DB.', 'error');
  }

  const start = getDefaultStartView();

  if (start === 'pos') renderPOS();
  if (start === 'scan') renderScanPanel();
  if (start === 'products') await loadProductsTable();
  if (start === 'incoming') await loadIncomingPanel();
  if (start === 'reports') await loadReports();
  if (start === 'stock') await loadStockTable();
  if (start === 'users') await loadUsersTable();
  if (start === 'audit') await loadAuditTable();
  if (start === 'history') await loadHistoryTable();

  showView(start);

  document.getElementById('btn-change-mode').onclick = () => {
    window.location.href = '/mode.html';
  };

  // PWA install button
  const btnInstall = document.getElementById('btn-install-pwa');
  if (btnInstall) {
    btnInstall.onclick = () => window.__installPWA?.();
  }

  // Hardware back button — intercept popstate so Android back doesn't exit app
  history.pushState({ view: start }, '');
  window.addEventListener('popstate', (e) => {
    // If scan modal is open, close it
    if (document.getElementById('modal-scan').classList.contains('open')) {
      closeScanModal();
      scanCallback = null;
      history.pushState({ view: currentView }, '');
      return;
    }
    // If sidebar is open, close it
    if (document.getElementById('sidebar').classList.contains('open')) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('visible');
      history.pushState({ view: currentView }, '');
      return;
    }
    // Otherwise push state again to prevent exit
    history.pushState({ view: currentView }, '');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
