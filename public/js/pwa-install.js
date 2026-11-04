/**
 * SiKasir Standalone App & PWA Installation Controller
 * Memberikan alur instalasi langsung layaknya APK Standalone tanpa embel-embel browser.
 */

(function () {
  let deferredPrompt = null;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://') ||
    window.location.search.includes('source=pwa');

  if (isStandalone) {
    document.documentElement.classList.add('is-standalone-apk');
    if (document.body) document.body.classList.add('is-standalone-apk');
  }

  // Registrasi Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  // Tangkap event sebelum instalasi native Android / Chrome
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPWAInstallPrompt = e;

    document.querySelectorAll('.pwa-install-trigger, #btn-install-pwa, #hero-install-pwa, #header-install-pwa').forEach((el) => {
      el.style.display = 'inline-flex';
    });

    // Tampilkan floating banner jika belum pernah ditutup sesi ini
    const dismissed = sessionStorage.getItem('sikasir_pwa_dismissed');
    if (!isStandalone && !dismissed) {
      showFloatingBanner();
    }
  });

  // Event saat instalasi selesai
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.deferredPWAInstallPrompt = null;
    localStorage.setItem('sikasir_pwa_installed', 'true');

    document.querySelectorAll('.pwa-install-trigger, #btn-install-pwa, #hero-install-pwa, #header-install-pwa, #pwa-floating-bar').forEach((el) => {
      el.style.display = 'none';
    });

    if (typeof window.showToast === 'function') {
      window.showToast('SiKasir berhasil terpasang di layar utama perangkat Anda!', 'success');
    }
  });

  // Ekspor fungsi trigger install global
  window.triggerPWAInstall = async function () {
    const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        deferredPrompt = null;
        window.deferredPWAInstallPrompt = null;
        const banner = document.getElementById('pwa-floating-bar');
        if (banner) banner.remove();
      }
      return;
    }

    if (isIos) {
      showIosInstructions();
      return;
    }

    // Fallback jika browser belum menembakkan beforeinstallprompt
    showFallbackGuide();
  };

  function showFloatingBanner() {
    if (document.getElementById('pwa-floating-bar')) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-floating-bar';
    banner.className = 'pwa-floating-banner';
    banner.innerHTML = `
      <div class="pwa-float-content">
        <img src="/icons/logo.svg" alt="SiKasir" width="38" height="38" class="pwa-float-icon" />
        <div class="pwa-float-text">
          <div class="pwa-float-title">Pasang Aplikasi SiKasir (APK)</div>
          <div class="pwa-float-desc">Gunakan layar penuh tanpa address bar, cepat dan offline-ready.</div>
        </div>
      </div>
      <div class="pwa-float-actions">
        <button type="button" class="btn btn-primary btn-sm pwa-btn-pasang" id="btn-float-install">
          Pasang Sekarang
        </button>
        <button type="button" class="pwa-btn-close" id="btn-float-close" aria-label="Tutup">
          &times;
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    const btnInstall = banner.querySelector('#btn-float-install');
    const btnClose = banner.querySelector('#btn-float-close');

    if (btnInstall) {
      btnInstall.addEventListener('click', () => {
        window.triggerPWAInstall();
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        sessionStorage.setItem('sikasir_pwa_dismissed', 'true');
        banner.remove();
      });
    }
  }

  function showIosInstructions() {
    let modal = document.getElementById('pwa-ios-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwa-ios-modal';
      modal.className = 'pwa-modal-backdrop';
      modal.innerHTML = `
        <div class="pwa-modal-card">
          <div class="pwa-modal-header">
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="/icons/logo.svg" alt="SiKasir" width="32" height="32" />
              <strong>Pasang di iPhone / iPad</strong>
            </div>
            <button type="button" class="pwa-btn-close" id="btn-ios-close">&times;</button>
          </div>
          <div class="pwa-modal-body">
            <ol style="margin-left:1.25rem;display:flex;flex-direction:column;gap:10px;font-size:0.9rem;color:#334155;line-height:1.45;">
              <li>Buka browser <strong>Safari</strong> pada iPhone atau iPad Anda.</li>
              <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bar bawah Safari (ikon kotak dengan panah ke atas).</li>
              <li>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
              <li>Ketuk <strong>Tambah</strong> di sudut kanan atas. SiKasir akan langsung terpasang di home screen layaknya aplikasi asli.</li>
            </ol>
          </div>
          <div class="pwa-modal-footer">
            <button type="button" class="btn btn-primary btn-block" id="btn-ios-done">Saya Mengerti</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => modal.remove();
      modal.querySelector('#btn-ios-close').addEventListener('click', close);
      modal.querySelector('#btn-ios-done').addEventListener('click', close);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
    }
  }

  function showFallbackGuide() {
    let modal = document.getElementById('pwa-fallback-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwa-fallback-modal';
      modal.className = 'pwa-modal-backdrop';
      modal.innerHTML = `
        <div class="pwa-modal-card">
          <div class="pwa-modal-header">
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="/icons/logo.svg" alt="SiKasir" width="32" height="32" />
              <strong>Pasang Aplikasi SiKasir</strong>
            </div>
            <button type="button" class="pwa-btn-close" id="btn-fallback-close">&times;</button>
          </div>
          <div class="pwa-modal-body">
            <p style="font-size:0.9rem;color:#334155;line-height:1.45;margin-bottom:12px;">
              Untuk memasang SiKasir di HP atau PC Anda:
            </p>
            <ol style="margin-left:1.25rem;display:flex;flex-direction:column;gap:8px;font-size:0.88rem;color:#334155;">
              <li>Ketuk menu browser Anda (ikon <strong>tiga titik</strong> di sudut kanan atas Chrome / Edge).</li>
              <li>Pilih menu <strong>Pasang Aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.</li>
              <li>Konfirmasi instalasi. SiKasir akan berjalan mandiri tanpa bilah browser.</li>
            </ol>
          </div>
          <div class="pwa-modal-footer">
            <button type="button" class="btn btn-primary btn-block" id="btn-fallback-done">Mengerti</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => modal.remove();
      modal.querySelector('#btn-fallback-close').addEventListener('click', close);
      modal.querySelector('#btn-fallback-done').addEventListener('click', close);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
    }
  }

  // Hubungkan event click untuk semua tombol ber-atribut data-pwa-install
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-pwa-install], #btn-install-pwa, #hero-install-pwa, #header-install-pwa').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.triggerPWAInstall();
      });
    });
  });
})();
