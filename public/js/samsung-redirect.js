/**
 * Deteksi Samsung Browser dan tampilkan banner untuk buka di Chrome.
 * Gunakan intent:// URL agar langsung launch Chrome di Android.
 */
(function () {
  const ua = navigator.userAgent || '';
  const isSamsungBrowser = /SamsungBrowser/i.test(ua);
  if (!isSamsungBrowser) return;

  // Buat intent URL untuk buka halaman ini di Chrome
  const currentUrl = window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  const intentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=${window.location.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodedUrl};end`;

  const banner = document.createElement('div');
  banner.className = 'samsung-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <p>🌐 Untuk pengalaman terbaik & install aplikasi, buka di <strong>Chrome</strong>.</p>
    <button class="samsung-banner-btn" id="open-chrome-btn">Buka di Chrome</button>
    <button class="samsung-banner-close" aria-label="Tutup">&times;</button>
  `;

  document.body.prepend(banner);

  document.getElementById('open-chrome-btn').addEventListener('click', () => {
    window.location.href = intentUrl;
  });

  banner.querySelector('.samsung-banner-close').addEventListener('click', () => {
    banner.remove();
  });
})();
