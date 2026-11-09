const CACHE_SHELL = 'sikasir-shell-v398';
const CACHE_DATA = 'sikasir-data-v398';
const ACTIVE_CACHES = [CACHE_SHELL, CACHE_DATA];

const SHELL = [
  '/',
  '/index.html',
  '/app.html',
  '/mode.html',
  '/setup.html',
  '/cds.html',
  '/ceo.html',
  '/css/app.css',
  '/js/app.js',
  '/js/api.js',
  '/js/mode.js',
  '/js/login.js',
  '/js/scanner.js',
  '/js/pwa-install.js',
  '/manifest.json',
  '/icons/logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/screenshot-mobile.png',
  '/og-image.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL.filter(Boolean)))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !ACTIVE_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/products')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) {
            caches.open(CACHE_DATA).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/offline-products.json')))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for icons, images, and fonts so the app opens instantly like a native APK
  if (url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.hostname.includes('fonts.')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for pages and scripts
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const copy = res.clone();
        caches.open(CACHE_SHELL).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/app.html') || caches.match('/')))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sikasir-sync') {
    event.waitUntil(Promise.resolve());
  }
});
