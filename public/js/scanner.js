/**
 * Barcode scanner via ZXing (@zxing/library UMD build v0.20.0)
 * Menggunakan decodeFromStream yang lebih reliable
 */
let activeStream = null;
let scanning = false;

export async function startScanner(targetEl, onCode) {
  const ZXing = window.ZXing;
  if (!ZXing) {
    throw new Error('ZXing belum dimuat. Coba refresh halaman.');
  }

  // Buat video element
  const video = document.createElement('video');
  video.style.cssText = 'width:100%;max-height:300px;border-radius:8px;background:#000;display:block;';
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  targetEl.appendChild(video);

  // Minta akses kamera belakang
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch {
    // Fallback ke kamera manapun
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      throw new Error('Izin kamera ditolak atau kamera tidak tersedia.');
    }
  }

  activeStream = stream;
  scanning = true;
  video.srcObject = stream;

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(resolve).catch(reject);
    };
    video.onerror = reject;
  });

  // Canvas untuk decode
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const reader = new ZXing.MultiFormatReader();

  // Hints untuk format barcode yang didukung
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
      ctx.drawImage(video, 0, 0);

      try {
        const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
        const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
        const result = reader.decode(binaryBitmap);
        if (result) {
          const code = result.getText();
          const now = Date.now();
          if (code !== last || now - lastTime > 2000) {
            last = code;
            lastTime = now;
            onCode(code);
            return; // stop setelah berhasil scan
          }
        }
      } catch {
        // NotFoundException — normal, tidak ada barcode di frame ini
      }
    }

    if (scanning) requestAnimationFrame(scan);
  };

  requestAnimationFrame(scan);
}

export function stopScanner() {
  scanning = false;
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
}
