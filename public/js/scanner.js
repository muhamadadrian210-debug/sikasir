let html5QrCode = null;
let scanning = false;
let torchOn = false;
let currentFacing = 'environment';
let lastCode = '';
let lastTime = 0;
let continuousMode = true;

// Play Audio Beep Sound on successful scan
function playBeepSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 Note
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

export async function startScanner(targetEl, onCode) {
  if (!window.Html5Qrcode) {
    throw new Error('Library Html5Qrcode belum dimuat. Coba refresh halaman.');
  }

  scanning = true;
  lastCode = '';
  lastTime = 0;

  if (!targetEl.id) {
    targetEl.id = 'scan-video-host-container';
  }

  targetEl.innerHTML = '';
  targetEl.style.position = 'relative';

  html5QrCode = new window.Html5Qrcode(targetEl.id, { 
    formatsToSupport: [ 
      window.Html5QrcodeSupportedFormats.EAN_13,
      window.Html5QrcodeSupportedFormats.EAN_8,
      window.Html5QrcodeSupportedFormats.CODE_128,
      window.Html5QrcodeSupportedFormats.CODE_39,
      window.Html5QrcodeSupportedFormats.UPC_A,
      window.Html5QrcodeSupportedFormats.UPC_E,
      window.Html5QrcodeSupportedFormats.QR_CODE
    ]
  });

  const handleCode = (decodedText) => {
    if (!decodedText || !scanning) return;
    const now = Date.now();
    if (decodedText === lastCode && now - lastTime < 1500) return;
    lastCode = decodedText;
    lastTime = now;

    // Audio & Haptic feedback
    playBeepSound();
    if (navigator.vibrate) {
      try { navigator.vibrate(100); } catch (e) {}
    }

    onCode(decodedText);

    if (!continuousMode) {
      stopScanner();
    }
  };

  const config = { 
    fps: 25,
    qrbox: { width: 280, height: 180 },
    aspectRatio: 1.0,
    disableFlip: false,
    useBarCodeDetectorIfSupported: true // Native hardware acceleration!
  };

  try {
    await html5QrCode.start(
      { facingMode: currentFacing },
      config,
      handleCode,
      undefined
    );
    
    setupOverlay(targetEl);
  } catch (err) {
    try {
      await html5QrCode.start(
        { facingMode: "user" },
        config,
        handleCode,
        undefined
      );
      setupOverlay(targetEl);
    } catch (fallbackErr) {
      throw new Error('Kamera gagal diakses: ' + (fallbackErr.message || err.message));
    }
  }
}

export async function scanFile(file) {
  if (!window.Html5Qrcode || !file) return null;
  const tempScanner = new window.Html5Qrcode('scan-file-temp-id', false);
  try {
    const result = await tempScanner.scanFile(file, true);
    playBeepSound();
    return result;
  } catch (e) {
    throw new Error('Barcode tidak terdeteksi dari foto gambar ini.');
  }
}

function setupOverlay(targetEl) {
  const overlay = document.createElement('div');
  overlay.id = 'scan-overlay-custom';
  overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;border-radius:12px;overflow:hidden;z-index:10;';
  overlay.innerHTML = `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;height:180px;border-radius:12px;border: 2px dashed rgba(16, 185, 129, 0.4);">
      <div style="position:absolute;top:-2px;left:-2px;width:24px;height:24px;border-top:4px solid #10b981;border-left:4px solid #10b981;border-radius:6px 0 0 0;"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:24px;height:24px;border-top:4px solid #10b981;border-right:4px solid #10b981;border-radius:0 6px 0 0;"></div>
      <div style="position:absolute;bottom:-2px;left:-2px;width:24px;height:24px;border-bottom:4px solid #10b981;border-left:4px solid #10b981;border-radius:0 0 0 6px;"></div>
      <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-bottom:4px solid #10b981;border-right:4px solid #10b981;border-radius:0 0 6px 0;"></div>
      <div style="position:absolute;top:0;left:4px;right:4px;height:2px;background:linear-gradient(90deg,transparent,#ef4444,transparent);box-shadow: 0 0 10px #ef4444;animation:scanline 1.5s ease-in-out infinite;"></div>
    </div>
    <style>
      @keyframes scanline{0%{top:0}50%{top:calc(100% - 2px)}100%{top:0}}
      #scan-video-host-container video { border-radius: 12px; object-fit: cover; }
    </style>
  `;
  
  targetEl.appendChild(overlay);
  
  const existingControls = document.getElementById('scan-controls-custom');
  if (existingControls) existingControls.remove();
  
  const controls = document.createElement('div');
  controls.id = 'scan-controls-custom';
  controls.style.cssText = 'display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:center;flex-wrap:wrap;align-items:center;';
  controls.innerHTML = `
    <button id="btn-torch" type="button" class="btn btn-secondary" style="font-size:0.85rem;padding:0.4rem 0.8rem;">🔦 Senter</button>
    <button id="btn-mode-toggle" type="button" class="btn btn-secondary" style="font-size:0.85rem;padding:0.4rem 0.8rem;">🔄 Mode Beruntun (Aktif)</button>
  `;
  targetEl.parentNode.insertBefore(controls, targetEl.nextSibling);

  const btnTorch = controls.querySelector('#btn-torch');
  const btnMode = controls.querySelector('#btn-mode-toggle');

  btnTorch.addEventListener('click', async () => {
    if (!html5QrCode) return;
    torchOn = !torchOn;
    try {
      await html5QrCode.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
      btnTorch.style.background = torchOn ? '#fef3c7' : '';
      btnTorch.innerHTML = torchOn ? '🔦 Senter ON' : '🔦 Senter';
    } catch { 
      torchOn = !torchOn; 
    }
  });

  btnMode.addEventListener('click', () => {
    continuousMode = !continuousMode;
    btnMode.innerHTML = continuousMode ? '🔄 Mode Beruntun (Aktif)' : '🎯 Mode Sekali Scan';
    btnMode.style.borderColor = continuousMode ? '#10b981' : '#cbd5e1';
  });
}

export function stopScanner() {
  scanning = false;
  const controls = document.getElementById('scan-controls-custom');
  if (controls) controls.remove();

  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
    }).catch(() => {
      html5QrCode = null;
    });
  }
}
