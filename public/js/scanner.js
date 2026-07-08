let html5QrCode = null;
let scanning = false;
let torchOn = false;
let currentFacing = 'environment';
let lastCode = '';
let lastTime = 0;

export async function startScanner(targetEl, onCode) {
  if (!window.Html5Qrcode) {
    throw new Error('Library Html5Qrcode belum dimuat. Coba refresh halaman.');
  }

  scanning = true;
  lastCode = '';
  lastTime = 0;

  // Html5Qrcode needs an ID for the target element
  if (!targetEl.id) {
    targetEl.id = 'scan-video-host-container';
  }

  // Bersihkan isinya kalau-kalau ada
  targetEl.innerHTML = '';
  targetEl.style.position = 'relative';

  // Inisialisasi dengan format 1D dan QR
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
    if (decodedText === lastCode && now - lastTime < 2000) return;
    lastCode = decodedText;
    lastTime = now;
    onCode(decodedText);
  };

  // Konfigurasi performa tinggi untuk Android
  const config = { 
    fps: 15,
    qrbox: { width: 280, height: 180 },
    aspectRatio: 1.0,
    disableFlip: false,
    useBarCodeDetectorIfSupported: true // Native hardware acceleration! Sangat Cepat!
  };

  try {
    await html5QrCode.start(
      { facingMode: currentFacing },
      config,
      handleCode,
      undefined // abaikan error (seperti tidak ada barcode terdeteksi)
    );
    
    setupOverlay(targetEl);
  } catch (err) {
    // Jika kamera environment gagal, coba kamera user (kamera depan)
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

function setupOverlay(targetEl) {
  // Tambah garis biru scan
  const overlay = document.createElement('div');
  overlay.id = 'scan-overlay-custom';
  overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;border-radius:10px;overflow:hidden;z-index:10;';
  overlay.innerHTML = `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;height:180px;border-radius:8px;">
      <div style="position:absolute;top:-2px;left:-2px;width:22px;height:22px;border-top:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:3px 0 0 0;"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:22px;height:22px;border-top:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 3px 0 0;"></div>
      <div style="position:absolute;bottom:-2px;left:-2px;width:22px;height:22px;border-bottom:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:0 0 0 3px;"></div>
      <div style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-bottom:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 0 3px 0;"></div>
      <div style="position:absolute;top:0;left:4px;right:4px;height:2px;background:linear-gradient(90deg,transparent,#3b82f6,transparent);animation:scanline 1.5s ease-in-out infinite;"></div>
    </div>
    <style>
      @keyframes scanline{0%{top:0}50%{top:calc(100% - 2px)}100%{top:0}}
      #scan-video-host-container video { border-radius: 10px; object-fit: cover; }
    </style>
  `;
  
  targetEl.appendChild(overlay);
  
  // Controls Button (Senter)
  const existingControls = document.getElementById('scan-controls-custom');
  if (existingControls) existingControls.remove();
  
  const controls = document.createElement('div');
  controls.id = 'scan-controls-custom';
  controls.style.cssText = 'display:flex;gap:0.5rem;margin-top:0.5rem;justify-content:center;flex-wrap:wrap;';
  controls.innerHTML = `
    <button id="btn-torch" type="button" style="padding:0.45rem 0.9rem;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-size:0.85rem;cursor:pointer;">🔦 Senter</button>
  `;
  targetEl.parentNode.insertBefore(controls, targetEl.nextSibling);

  const btnTorch = controls.querySelector('#btn-torch');
  btnTorch.addEventListener('click', async () => {
    if (!html5QrCode) return;
    torchOn = !torchOn;
    try {
      await html5QrCode.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
      btnTorch.style.background = torchOn ? '#fef3c7' : '#f8fafc';
      btnTorch.innerHTML = torchOn ? '🔦 ON' : '🔦 Senter';
    } catch { 
      torchOn = !torchOn; 
    }
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
      // ignore
      html5QrCode = null;
    });
  }
}
