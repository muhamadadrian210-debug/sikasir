/**
 * SiKasir Advanced Barcode Scanner v3
 * - Flip kamera depan/belakang
 * - Scan super cepat (<300ms debounce)
 * - Torch/flashlight
 * - Brightness boost untuk kondisi gelap
 * - Viewfinder UI
 */

let activeStream = null;
let scanning = false;
let torchOn = false;
let activeTrack = null;
let currentFacing = 'environment'; // 'environment' = belakang, 'user' = depan

/**
 * Pilih kamera terbaik — hindari ultrawide/macro/depth
 */
async function pickBestCamera(facing = 'environment') {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
    tempStream.getTracks().forEach(t => t.stop());
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoCams = devices.filter(d => d.kind === 'videoinput');

    if (facing === 'user') {
      // Kamera depan — ambil yang pertama dengan label "front"/"selfie"/"depan" atau fallback
      const front = videoCams.find(d => /front|selfie|depan|user/i.test(d.label));
      return front?.deviceId || null;
    }

    // Kamera belakang — hindari ultrawide/macro/depth/tele
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
  const constraints = deviceId
    ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } }
    : { video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } } };
  return navigator.mediaDevices.getUserMedia(constraints);
}

export async function startScanner(targetEl, onCode) {
  const ZXing = window.ZXing;
  if (!ZXing) throw new Error('ZXing belum dimuat. Coba refresh halaman.');

  currentFacing = 'environment';

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

  // Viewfinder overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;border-radius:10px;overflow:hidden;';
  overlay.innerHTML = `
    <div style="
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:70%;height:50%;
      border-radius:8px;
      box-shadow:0 0 0 9999px rgba(0,0,0,0.4);
    ">
      <div style="position:absolute;top:-2px;left:-2px;width:22px;height:22px;border-top:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:3px 0 0 0;"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:22px;height:22px;border-top:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 3px 0 0;"></div>
      <div style="position:absolute;bottom:-2px;left:-2px;width:22px;height:22px;border-bottom:3px solid #3b82f6;border-left:3px solid #3b82f6;border-radius:0 0 0 3px;"></div>
      <div style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-bottom:3px solid #3b82f6;border-right:3px solid #3b82f6;border-radius:0 0 3px 0;"></div>
      <div id="scan-line-anim" style="
        position:absolute;top:0;left:4px;right:4px;height:2px;
        background:linear-gradient(90deg,transparent,#3b82f6,transparent);
        animation:scanline 1.5s ease-in-out infinite;
      "></div>
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

  // Start stream
  let stream;
  try {
    stream = await openStream(currentFacing);
  } catch {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      throw new Error('Izin kamera ditolak atau kamera tidak tersedia.');
    }
  }

  const applyStream = async (s) => {
    activeStream = s;
    activeTrack = s.getVideoTracks()[0];
    video.srcObject = s;
    await new Promise((res, rej) => {
      video.onloadedmetadata = () => video.play().then(res).catch(rej);
      video.onerror = rej;
    });
  };

  await applyStream(stream);
  scanning = true;

  // Torch
  const btnTorch = controls.querySelector('#btn-torch');
  btnTorch.addEventListener('click', async () => {
    if (!activeTrack) return;
    torchOn = !torchOn;
    try {
      await activeTrack.applyConstraints({ advanced: [{ torch: torchOn }] });
      btnTorch.style.background = torchOn ? '#fef3c7' : '#f8fafc';
      btnTorch.innerHTML = torchOn ? '🔦 ON' : '🔦 Senter';
    } catch {
      torchOn = !torchOn;
    }
  });

  // Flip kamera depan/belakang
  const btnFlip = controls.querySelector('#btn-flip');
  let flipping = false;
  btnFlip.addEventListener('click', async () => {
    if (flipping) return;
    flipping = true;
    btnFlip.disabled = true;
    btnFlip.innerHTML = '⏳';

    // Stop stream lama
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
      // Fallback balik lagi
      currentFacing = currentFacing === 'environment' ? 'user' : 'environment';
      btnFlip.innerHTML = '🔄 Gagal';
    }
    btnFlip.disabled = false;
    flipping = false;
  });

  // ZXing reader
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

  let lastCode = '';
  let lastTime = 0;

  const scan = () => {
    if (!scanning) return;
    if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Brightness boost untuk kondisi gelap
      ctx.filter = 'brightness(1.4) contrast(1.25)';
      ctx.drawImage(video, 0, 0);
      ctx.filter = 'none';

      try {
        const luminance = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
        const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
        const result = reader.decode(bitmap);
        if (result) {
          const code = result.getText();
          const now = Date.now();
          // Debounce 300ms — cepat tapi tidak double-fire
          if (code !== lastCode || now - lastTime > 300) {
            lastCode = code;
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
