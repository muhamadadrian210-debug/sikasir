/**
 * Barcode scanner via ZXing (@zxing/library UMD build)
 * Compatible with v0.20.0
 */
let codeReader = null;

export async function startScanner(targetEl, onCode) {
  const ZXing = window.ZXing;
  if (!ZXing) {
    throw new Error('ZXing belum dimuat. Coba refresh halaman.');
  }

  // Buat video element
  const video = document.createElement('video');
  video.style.width = '100%';
  video.style.maxHeight = '300px';
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  targetEl.appendChild(video);

  codeReader = new ZXing.BrowserMultiFormatReader();

  let last = '';
  let lastTime = 0;

  try {
    // Coba pakai kamera belakang dulu
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();

    // Scan loop
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scan = () => {
      if (!codeReader) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
          const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
          const result = new ZXing.MultiFormatReader().decode(binaryBitmap);
          if (result) {
            const code = result.getText();
            const now = Date.now();
            if (code !== last || now - lastTime > 1500) {
              last = code;
              lastTime = now;
              onCode(code);
            }
          }
        } catch {
          // NotFoundException normal saat tidak ada barcode di frame
        }
      }
      if (codeReader) requestAnimationFrame(scan);
    };

    requestAnimationFrame(scan);

    // Simpan stream untuk cleanup
    codeReader._stream = stream;
  } catch (err) {
    // Fallback: pakai decodeFromVideoDevice jika cara manual gagal
    try {
      await codeReader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        video,
        (result, err) => {
          if (result) {
            const code = result.getText();
            const now = Date.now();
            if (code !== last || now - lastTime > 1500) {
              last = code;
              lastTime = now;
              onCode(code);
            }
          }
        }
      );
    } catch (err2) {
      throw new Error(err2.message || 'Kamera tidak bisa diakses');
    }
  }
}

export function stopScanner() {
  if (codeReader) {
    try {
      // Stop stream jika ada
      if (codeReader._stream) {
        codeReader._stream.getTracks().forEach((t) => t.stop());
        codeReader._stream = null;
      }
      codeReader.reset();
    } catch {
      /* noop */
    }
    codeReader = null;
  }
}
