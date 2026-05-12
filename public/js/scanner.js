/**
 * SiKasir Advanced Barcode Scanner
 * - Auto-pilih kamera utama (bukan ultrawide) via deviceId enumeration
 * - Torch/flashlight support
 * - Brightness enhancement untuk kondisi gelap
 * - ZXing multi-format decode dengan TRY_HARDER
 */

let activeStream = null;
let scanning = false;
let torchOn = false;
let activeTrack = null;

/**
 * Pilih kamera terbaik dari daftar kamera belakang.
 * Strategi: hindari kamera dengan label "ultrawide", "wide", "macro", "depth".
 * Prioritaskan kamera dengan label "main", "rear", "back", atau resolusi tertinggi.
 */
async function pickBestCamera() {
  let devices = [];
  try {
    // Perlu izin dulu sebelum bisa enumerate dengan label
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    tempStream.getTracks().forEach(t => t.stop());
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch {
    return null; // fallback ke default
  }

  const videoCams = devices.filter(d => d.kind === 'videoinput');
  if (!videoCams.length) return null;

  // Filter kamera belakang berdasarkan label
  const backCams = videoCams.filter(d => {
    const label = d.label.toLowerCase();
    return label.includes('back') || label.includes('rear') || label.includes('environment') ||
           label.includes('belakang') || label.includes('0,') || label.includes('facing back');
  });

  const candidates = backCams.length > 0 ? backCams : videoCams;

  // Buang kamera ultrawide/macro/depth/tele
  const unwanted = /ultrawide|ultra.wide|wide.angle|macro|depth|tele|front|selfie|depan/i;
  const preferred = candidates.filter(d => !unwanted.test(d.label));

  // Prioritaskan yang labelnya mengandung "main" atau "0"
  const main = preferred.find(d => /main|camera2 0|camera 0|\b0\b/.test(d.label.toLowerCase()));
  if (main) return main.deviceId;

  // Ambil yang pertama dari preferred, atau fallback ke candidates pertama
  return (preferred[0] || candidates[0])?.deviceId || null;
}

export async function startScanner(targetEl, onCode) {
  const ZXing = window.ZXing;
  if (!ZXing) throw new Error('ZXing belum dimuat. Coba refresh halaman.');

  // Container dengan UI controls
  const container = document.createElement('div');
  container.style.cssText = 'position:relative;width:100%;';
  targetEl.appendChild(container);

  // Video element
  const video = document.createElement('video');
  video.style.cssText = 'width:100%;max-height:280px;border-radius:10px;background:#000;display:block;object-fit:cover;';
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  container.appendChild(video);

  // Viewfinder overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute;top:0;left:0;right:0;bottom:0;
    pointer-events:none;border-radius:10px;overflow:hidden;
  `;
  overlay.innerHTML = `
    <div style="
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:65%;height:45%;
      border:2px solid rgba(59,130,246,0.8);
      border-radius:8px;
      box-shadow:0 0 0 9999px rgba(0,0,0,0.35);
    ">
      <div style="position:absolute;top:-2px;left:-2px;width:20px;height:20px;border-top:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:2px 0 0 0;"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:20px;height:20px;border-top:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 2px 0 0;"></div>
      <div style="position:absolute;bottom:-2px;left:-2px;width:20px;height:20px;border-bottom:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:0 0 0 2px;"></div>
      <div style="position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;border-bottom:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 0 2px 0;"></div>
      <div id="scan-line" style="
        position:absolute;top:0;left:0;right:0;height:2px;
        background:linear-gradient(90deg,transparent,#3b82f6,transparent);
        animation:scanline 1.8s ease-in-out infinite;
      "></div>
    </div>
    <style>
      @keyframes scanline {
        0%{top:0%} 50%{top:calc(100% - 2px)} 100%{top:0%}
      }
    </style>
  `;
  container.appendChild(overlay);

  // Controls bar (torch + camera switch)
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:0.5rem;margin-top:0.5rem;justify-content:center;';
  controls.innerHTML = `
    <button id="btn-torch" type="button" style="
      padding:0.5rem 1rem;border-radius:8px;border:1px solid #e2e8f0;
      background:#f8fafc;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem;
    ">🔦 Senter</button>
    <button id="btn-switch-cam" type="button" style="
      padding:0.5rem 1rem;border-radius:8px;border:1px solid #e2e8f0;
      background:#f8fafc;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem;
    ">🔄 Ganti Kamera</button>
  `;
  targetEl.appendChild(controls);

  // Pilih kamera terbaik
  const bestDeviceId = await pickBestCamera();

  const getStream = async (deviceId) => {
    const constraints = deviceId
      ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } }
      : { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } };
    return navigator.mediaDevices.getUserMedia(constraints);
  };

  let stream;
  try {
    stream = await getStream(bestDeviceId);
  } catch {
    try {
      stream = await getStream(null);
    } catch (err) {
      throw new Error('Izin kamera ditolak atau kamera tidak tersedia.');
    }
  }

  activeStream = stream;
  activeTrack = stream.getVideoTracks()[0];
  scanning = true;
  torchOn = false;
  video.srcObject = stream;

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
    video.onerror = reject;
  });

  // Torch button
  const btnTorch = controls.querySelector('#btn-torch');
  const torchSupported = activeTrack?.getCapabilities?.()?.torch;
  if (!torchSupported) {
    btnTorch.style.opacity = '0.4';
    btnTorch.title = 'Senter tidak didukung di kamera ini';
  }
  btnTorch.addEventListener('click', async () => {
    if (!activeTrack) return;
    torchOn = !torchOn;
    try {
      await activeTrack.applyConstraints({ advanced: [{ torch: torchOn }] });
      btnTorch.style.background = torchOn ? '#fef3c7' : '#f8fafc';
      btnTorch.textContent = torchOn ? '🔦 Senter ON' : '🔦 Senter';
    } catch {
      torchOn = !torchOn;
      btnTorch.title = 'Senter tidak didukung';
    }
  });

  // Camera switch button — enumerate semua kamera dan cycle
  let allCameras = [];
  let camIndex = 0;
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    allCameras = devs.filter(d => d.kind === 'videoinput');
    // Cari index kamera yang sedang aktif
    const currentId = activeTrack?.getSettings?.()?.deviceId;
    const idx = allCameras.findIndex(d => d.deviceId === currentId);
    if (idx >= 0) camIndex = idx;
  } catch { /* noop */ }

  const btnSwitch = controls.querySelector('#btn-switch-cam');
  if (allCameras.length <= 1) btnSwitch.style.opacity = '0.4';

  btnSwitch.addEventListener('click', async () => {
    if (allCameras.length <= 1) return;
    camIndex = (camIndex + 1) % allCameras.length;
    const nextId = allCameras[camIndex].deviceId;
    const label = allCameras[camIndex].label || `Kamera ${camIndex + 1}`;

    // Stop stream lama
    if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    torchOn = false;
    btnTorch.style.background = '#f8fafc';
    btnTorch.textContent = '🔦 Senter';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      activeStream = newStream;
      activeTrack = newStream.getVideoTracks()[0];
      video.srcObject = newStream;
      await video.play();
      btnSwitch.textContent = `🔄 ${label.substring(0, 20)}`;
    } catch {
      btnSwitch.textContent = '🔄 Gagal';
    }
  });

  // ZXing reader setup
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const reader = new ZXing.MultiFormatReader();
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.QR_CODE,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.DATA_MATRIX,
    ZXing.BarcodeFormat.ITF,
    ZXing.BarcodeFormat.CODABAR,
  ]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);

  let last = '';
  let lastTime = 0;

  const scan = () => {
    if (!scanning) return;
    if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Brightness boost untuk kondisi gelap
      ctx.filter = 'brightness(1.3) contrast(1.2)';
      ctx.drawImage(video, 0, 0);
      ctx.filter = 'none';

      try {
        const luminance = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
        const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
        const result = reader.decode(bitmap);
        if (result) {
          const code = result.getText();
          const now = Date.now();
          if (code !== last || now - lastTime > 2000) {
            last = code;
            lastTime = now;
            onCode(code);
            return;
          }
        }
      } catch { /* NotFoundException — normal */ }
    }
    if (scanning) requestAnimationFrame(scan);
  };

  requestAnimationFrame(scan);
}

export function stopScanner() {
  scanning = false;
  torchOn = false;
  if (activeStream) {
    activeStream.getTracks().forEach(t => t.stop());
    activeStream = null;
  }
  activeTrack = null;
}
