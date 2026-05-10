const API_BASE = '';

export function getToken() {
  return localStorage.getItem('sikasir_token');
}

export function setToken(t) {
  if (t) localStorage.setItem('sikasir_token', t);
  else localStorage.removeItem('sikasir_token');
}

export function getUser() {
  try {
    const raw = localStorage.getItem('sikasir_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(u) {
  if (u) localStorage.setItem('sikasir_user', JSON.stringify(u));
  else localStorage.removeItem('sikasir_user');
}

async function getCsrfToken() {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/csrf-token`, { credentials: 'same-origin' });
  } catch {
    throw new Error(
      'Tidak terhubung ke server. Pastikan backend jalan (`npm start`) dan Anda membuka lewat http://localhost:PORT (bukan membuka file HTML langsung dari folder).'
    );
  }
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const hint =
      data?.error ||
      (res.status === 404
        ? 'Endpoint CSRF tidak ditemukan (HTTP 404). Pastikan server SiKasir sudah dijalankan dengan `npm start` dan Anda membuka http://localhost:3000 (bukan file HTML langsung).'
        : res.status === 429
          ? 'Terlalu banyak permintaan. Tunggu ±1 menit atau restart server jika stuck.'
          : res.status === 403
            ? 'Akses ditolak (IP / keamanan).'
            : `Gagal mengambil CSRF token (HTTP ${res.status}).`);
    throw new Error(hint);
  }
  if (!data.csrfToken) {
    throw new Error('Respon CSRF tidak valid. Periksa bahwa server SiKasir yang terbaru sedang berjalan.');
  }
  return data.csrfToken;
}

export async function api(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const headers = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = await getCsrfToken();
    headers['X-CSRF-Token'] = csrf;
  }

  if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    method,
    headers,
    credentials: 'same-origin',
    body:
      opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)
        ? JSON.stringify(opts.body)
        : opts.body,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Error' };
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}
