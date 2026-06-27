const API_BASE = typeof window !== 'undefined' && window.Capacitor 
  ? 'https://sikasir-alpha.vercel.app' 
  : '';

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

/** Clear all stored auth state (token + user). */
export function clearAuth() {
  localStorage.removeItem('sikasir_token');
  localStorage.removeItem('sikasir_user');
}

async function getCsrfToken() {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/csrf-token`, { credentials: 'same-origin', cache: 'no-store' });
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
  const token = getToken();

  const timestamp = String(Date.now());
  const bodyData = opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)
    ? JSON.stringify(opts.body)
    : (opts.body || '');

  // Cryptographic Request Signature using Web Crypto API
  let signature = '';
  try {
    const clientSalt = "sikasir_client_secure_salt_987654";
    const message = `${method}:${path}:${bodyData}:${timestamp}:${token || ''}:${clientSalt}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Perform synchronous-like web crypto call by waiting, but since api() is async, we can await it!
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback if crypto is not supported (unlikely in modern browsers)
  }

  const send = async () => {
    const headers = { ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrf = await getCsrfToken();
      headers['X-CSRF-Token'] = csrf;
    }

    if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    headers['X-Timestamp'] = timestamp;
    if (signature) {
      headers['X-Signature'] = signature;
    }

    const res = await fetch(`${API_BASE}/api${path}`, {
      ...opts,
      method,
      headers,
      credentials: 'same-origin',
      body: bodyData,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || 'Error' };
    }
    return { res, data };
  };

  let { res, data } = await send();
  if (
    res.status === 403 &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    String(data?.error || '').toLowerCase().includes('csrf')
  ) {
    ({ res, data } = await send());
  }

  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.body = data;
    // Auto-logout jika token tidak valid / expired / tidak punya tenant_id
    if (res.status === 401) {
      localStorage.removeItem('sikasir_token');
      localStorage.removeItem('sikasir_user');
      localStorage.removeItem('sikasir_app_mode');
      window.location.href = '/';
    }
    throw err;
  }
  return data;
}
