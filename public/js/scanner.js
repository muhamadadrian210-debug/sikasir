/**
 * SiKasir Advanced Barcode Scanner v5 — Full Resolution + Web Worker
 * - Decode di Web Worker (thread terpisah) = tidak blocking UI
 * - Resolusi penuh 1920x1080
 * - Scan instan seperti scanner kasir
 * - Flip kamera depan/belakang
 * - Torch support
 */

let activeStream = null;
let scanning = false;
let torchOn = false;
let activeTrack = null;
let currentFacing = 'environment';
let worker = null;
let workerReady = false;
let pendingDecode = false;
let msgId = 0;

function initWorker() {
  try {
    worker = new Worker('/js/scanner-worker.js');
    worker.onmessage = null; // akan di-set per decode
    workerReady = true;
  } catch {
    workerReady = false;
  }
}

async function pickBestCamera(facing = 'environment') {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
    tempStream.getTracks().forEach(t => t.stop());
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoCams = devices.filter(d => d.kind === 'videoinput');

    if (facing === 'user') {
      const front = videoCams.find(d => /front|selfie|depan|user/i.test(d.label));
      return front?.deviceId || null;
    }

    const backCams = videoCams.filter(d => {
      const l = d.label.toLowerCase();
      return l.includes('back') || l.includes('rear') || l.includes('environment') ||
             l.includes('belakang') || !l.includes('front');
    });
    const candidates = backCams.length > 0 ? backCams : videoCams;
    const unwanted = /ultrawide|ultra.wide|wide.angle|macro|depth|tele|front|selfie|depan/i;
    const preferred = candidates.filter(d => !unwanted.test(d.label));
    const main = preferred.find(d => /main|camera2 0|camera 0|\b0\b/.test(d.label.toLowerCase()));
    return (main || preferred[0] || candidates[0])?.deviceId || null;
  } catch {
    return null;
  }
}

async function openStream(facing) {
  const deviceId = await pickBestCamera(facing);
  const videoConstraints = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    : { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } };
  return navigator.mediaDevices.getUserMedia({ video: videoConstraints });
}

// Fallback decode di main thread jika worker tidak tersedia
function decodeMainThread(canvas, ZXing) {
  const reader = decodeMainThread._reader;
  if (!reader) return null;
  try {
    const luminance = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
    const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
    return reader.decode(bitmap).getText();
  } catch {
    return null;
  }
}

export async function startScanner(targetEl, onCode) {
  const ZXing = window.ZXing;
  if (!ZXing) throw new Error('ZXing belum dimuat. Coba refresh halaman.');

  // Init fallback reader untuk main thread
  const fallbackReader = new ZXing.MultiFormatReader();
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E, ZXing.BarcodeFormat.DATA_MATRIX,
    ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.CODABAR,
  ]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  fallbackReader.setHints(hints);
  decodeMainThread._reader = fallbackReader;

  // Init worker
  initWorker();

  currentFacing = 'environment';
  scanning = false;
  pendingDecode = false;

  // Container
  const container = document.createElement('div');
  container.style.cssText = 'position:relative;width:100%;';
  targetEl.appendChild(container);

  // Video
  const video = document.createElement('video');
  video.style.cssText = 'width:100%;max-height:260px;border-radius:10px;background:#000;display:block;object-fit:cover;';
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  container.appendChild(video);

  // Viewfinder
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;border-radius:10px;overflow:hidden;';
  overlay.innerHTML = `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:70%;height:50%;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.4);">
      <div style="position:absolute;top:-2px;left:-2px;width:22px;height:22px;border-top:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:3px 0 0 0;"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:22px;height:22px;border-top:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 3px 0 0;"></div>
      <div style="position:absolute;bottom:-2px;left:-2px;width:22px;height:22px;border-bottom:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:0 0 0 3px;"></div>
      <div style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-bottom:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 0 3px 0;"></div>
      <div style="position:absolute;top:0;left:4px;right:4px;height:2px;background:linear-gradient(90deg,transparent,#3b82f6,transparent);animation:scanline 1.5s ease-in-out infinite;"></div>
    </div>
    <style>@keyframes scanline{0%{top:0}50%{top:calc(100% - 2px)}100%{top:0}}</style>
  `;
  container.appendChild(overlay);

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:0.5rem;margin-top:0.5rem;justify-content:center;flex-wrap:wrap;';
  controls.innerHTML = `
    <button id="btn-torch" type="button" style="padding:0.45rem 0.9rem;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-size:0.85rem;cursor:pointer;">🔦 Senter</button>
    <button id="btn-flip" type="button" style="padding:0.45rem 0.9rem;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-size:0.85rem;cursor:pointer;">🔄 Balik Kamera</button>
  `;
  targetEl.appendChild(controls);

  // Canvas untuk capture frame — resolusi penuh
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

  const applyStream = async (s) => {
    activeStream = s;
    activeTrack = s.getVideoTracks()[0];
    video.srcObject = s;
    await new Promise((res, rej) => {
      video.onloadedmetadata = () => video.play().then(res).catch(rej);
      video.onerror = rej;
    });
  };

  let stream;
  try {
    stream = await openStream(currentFacing);
  } catch {
    try { stream = await navigator.mediaDevices.getUserMedia({ video: true }); }
    catch { throw new Error('Izin kamera ditolak atau kamera tidak tersedia.'); }
  }
  await applyStream(stream);
  scanning = true;

  let lastCode = '';
  let lastTime = 0;

  const handleCode = (code) => {
    if (!code || !scanning) return;
    const now = Date.now();
    if (code === lastCode && now - lastTime < 150) return;
    lastCode = code;
    lastTime = now;
    onCode(code);
  };

  // Scan loop — rAF untuk sinkron dengan frame kamera
  const scanLoop = () => {
    if (!scanning) return;
    if (pendingDecode || video.readyState < video.HAVE_ENOUGH_DATA || video.videoWidth === 0) {
      requestAnimationFrame(scanLoop);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    if (workerReady && worker) {
      // Decode di worker — non-blocking
      pendingDecode = true;
      const id = ++msgId;
      const imageData = ctx.getImageData(0, 0, w, h);

      const handler = (e) => {
        if (e.data.id !== id) return;
        worker.removeEventListener('message', handler);
        pendingDecode = false;
        if (e.data.code) handleCode(e.data.code);
        if (scanning) requestAnimationFrame(scanLoop);
      };
      worker.addEventListener('message', handler);
      // Transfer imageData buffer untuk zero-copy
      worker.postMessage({ imageData: imageData.data, width: w, height: h, id }, [imageData.data.buffer]);
    } else {
      // Fallback main thread
      const code = decodeMainThread(canvas, ZXing);
      if (code) handleCode(code);
      requestAnimationFrame(scanLoop);
    }
  };

  requestAnimationFrame(scanLoop);

  // Torch
  const btnTorch = controls.querySelector('#btn-torch');
  btnTorch.addEventListener('click', async () => {
    if (!activeTrack) return;
    torchOn = !torchOn;
    try {
      await activeTrack.applyConstraints({ advanced: [{ torch: torchOn }] });
      btnTorch.style.background = torchOn ? '#fef3c7' : '#f8fafc';
      btnTorch.innerHTML = torchOn ? '🔦 ON' : '🔦 Senter';
    } catch { torchOn = !torchOn; }
  });

  // Flip kamera
  const btnFlip = controls.querySelector('#btn-flip');
  let flipping = false;
  btnFlip.addEventListener('click', async () => {
    if (flipping) return;
    flipping = true;
    btnFlip.disabled = true;
    btnFlip.innerHTML = '⏳';
    scanning = false;
    pendingDecode = false;
    if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    torchOn = false;
    btnTorch.style.background = '#f8fafc';
    btnTorch.innerHTML = '🔦 Senter';

    currentFacing = currentFacing === 'environment' ? 'user' : 'environment';
    try {
      const newStream = await openStream(currentFacing);
      await applyStream(newStream);
      btnFlip.innerHTML = currentFacing === 'environment' ? '🔄 Balik Kamera' : '🤳 Kamera Depan';
    } catch {
      currentFacing = currentFacing === 'environment' ? 'user' : 'environment';
      btnFlip.innerHTML = '🔄 Gagal';
    }
    scanning = true;
    requestAnimationFrame(scanLoop);
    btnFlip.disabled = false;
    flipping = false;
  });
}

export function stopScanner() {
  scanning = false;
  pendingDecode = false;
  torchOn = false;
  if (worker) {
    worker.terminate();
    worker = null;
    workerReady = false;
  }
  if (activeStream) {
    activeStream.getTracks().forEach(t => t.stop());
    activeStream = null;
  }
  activeTrack = null;
}
