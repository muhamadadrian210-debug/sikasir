/**
 * Barcode scanner via ZXing (global ZXing from CDN UMD build)
 */
let codeReader = null;

export async function startScanner(targetEl, onCode) {
  const ZXing = window.ZXing;
  if (!ZXing) {
    throw new Error('ZXing belum dimuat');
  }

  // Create video element
  const video = document.createElement('video');
  video.style.width = '100%';
  video.style.maxHeight = '300px';
  targetEl.appendChild(video);

  codeReader = new ZXing.BrowserMultiFormatReader();

  // Prefer back/environment camera
  const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();
  const backCamera =
    devices.find((d) => /back|rear|environment/i.test(d.label)) ||
    devices[devices.length - 1];
  const deviceId = backCamera?.deviceId;

  let last = '';
  let lastTime = 0;

  await codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
    if (result) {
      const code = result.getText();
      const now = Date.now();
      // Debounce: ignore same code within 1.5 s
      if (code === last && now - lastTime < 1500) return;
      last = code;
      lastTime = now;
      onCode(code);
    }
    // err is normal when no barcode in frame — ignore
  });
}

export function stopScanner() {
  if (codeReader) {
    try {
      codeReader.reset();
    } catch {
      /* noop */
    }
    codeReader = null;
  }
}
