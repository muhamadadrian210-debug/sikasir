const CACHE_SHELL = 'sikasir-shell-v10';
const CACHE_DATA = 'sikasir-data-v10';
const ACTIVE_CACHES = [CACHE_SHELL, CACHE_DATA];

const SHELL = ['/', '/index.html', '/app.html', '/css/app.css', '/js/app.js', '/js/api.js', '/js/scanner.js', '/manifest.json', '/icons/logo.svg'];

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

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const copy = res.clone();
        caches.open(CACHE_SHELL).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sikasir-sync') {
    event.waitUntil(Promise.resolve());
  }
});
