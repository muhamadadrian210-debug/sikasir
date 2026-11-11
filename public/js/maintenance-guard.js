/**
 * SiKasir Universal Maintenance Mode Guard & Lockdown Screen
 * Automatically blocks app usage across Web, PWA, and APK during major system updates.
 * Product by Sivilize Corp.
 */

(function () {
  let lockdownEl = null;
  let pollInterval = null;

  function createLockdownScreen(info) {
    if (document.getElementById('sikasir-maintenance-lockdown')) {
      updateLockdownContent(info);
      return;
    }

    lockdownEl = document.createElement('div');
    lockdownEl.id = 'sikasir-maintenance-lockdown';
    lockdownEl.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: #0B0F19;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
      backdrop-filter: blur(12px);
    `;

    document.body.appendChild(lockdownEl);
    updateLockdownContent(info);
    startAutoRecoveryPolling();
  }

  function updateLockdownContent(info) {
    if (!lockdownEl) return;
    const title = info?.title || 'Pemeliharaan Sistem Skala Besar (Major Update)';
    const message = info?.message || 'Kami sedang melakukan peningkatan performa dan pembaruan arsitektur sistem SiKasir. Seluruh akses transaksi kasir sementara dikunci demi keamanan data Anda.';
    const est = info?.estimated_finish || '15-30 Menit';

    lockdownEl.innerHTML = `
      <div style="max-width: 480px; width: 100%; background: #131B2E; border: 1.5px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);">
        
        <!-- Animated Maintenance Icon -->
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #EF4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 0 24px rgba(239, 68, 68, 0.25);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 2s infinite ease-in-out;">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.18); border: 1px solid rgba(239, 68, 68, 0.4); color: #FCA5A5; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 12px; border-radius: 9999px; margin-bottom: 14px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444; display: inline-block;"></span>
          Maintenance Mode Aktif
        </div>

        <h2 style="font-size: 1.35rem; font-weight: 800; color: #FFFFFF; margin: 0 0 10px 0; line-height: 1.35;">
          ${escapeHtml(title)}
        </h2>

        <p style="font-size: 0.88rem; color: #94A3B8; line-height: 1.6; margin: 0 0 22px 0;">
          ${escapeHtml(message)}
        </p>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 10px; padding: 14px; margin-bottom: 24px; text-align: left; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748B;">Estimasi Durasi:</span>
            <strong style="color: #38BDF8;">${escapeHtml(est)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Keamanan Transaksi:</span>
            <strong style="color: #10B981;">Tersimpan Aman</strong>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button type="button" id="btn-check-maintenance-now" style="width: 100%; padding: 12px; border-radius: 8px; border: none; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Periksa Status Sistem
          </button>
          <div style="font-size: 0.75rem; color: #64748B; margin-top: 4px;">
            Sistem otomatis terbuka kembali saat founder selesai melakukan pembaruan.
          </div>
        </div>
      </div>
    `;

    const btnCheck = lockdownEl.querySelector('#btn-check-maintenance-now');
    if (btnCheck) {
      btnCheck.onclick = async () => {
        btnCheck.disabled = true;
        btnCheck.textContent = 'Memeriksa ke server...';
        const isStillActive = await checkStatus();
        if (!isStillActive) {
          removeLockdown();
        } else {
          setTimeout(() => {
            btnCheck.disabled = false;
            btnCheck.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Periksa Status Sistem
            `;
          }, 800);
        }
      };
    }
  }

  function removeLockdown() {
    if (lockdownEl) {
      lockdownEl.remove();
      lockdownEl = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function startAutoRecoveryPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      const active = await checkStatus();
      if (!active) {
        removeLockdown();
      }
    }, 12000); // Poll setiap 12 detik
  }

  async function checkStatus() {
    try {
      const res = await fetch('/api/maintenance/status?_t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.maintenance) {
        createLockdownScreen(data);
        return true;
      } else {
        removeLockdown();
        return false;
      }
    } catch {
      return false;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Ekspor fungsi global
  window.showMaintenanceLockdown = createLockdownScreen;
  window.hideMaintenanceLockdown = removeLockdown;
  window.checkMaintenanceStatus = checkStatus;

  // Jalankan pemeriksaan status saat halaman selesai dimuat (kecuali halaman CEO)
  if (!window.location.pathname.includes('ceo.html')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkStatus);
    } else {
      checkStatus();
    }
  }
})();
