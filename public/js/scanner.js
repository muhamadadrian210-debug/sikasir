/**
 * Barcode scanner via QuaggaJS (global Quagga from CDN)
 */
export function startScanner(targetEl, onCode) {
  if (typeof Quagga === 'undefined') {
    return Promise.reject(new Error('Quagga belum dimuat'));
  }
  return new Promise((resolve, reject) => {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: targetEl,
          constraints: {
            facingMode: 'environment',
            width: { min: 640 },
            height: { min: 480 },
          },
        },
        locator: { patchSize: 'medium', halfSample: true },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'code_39_reader',
          ],
        },
        locate: true,
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        Quagga.start();
        resolve();
      }
    );

    let last = '';
    let t = 0;
    Quagga.onDetected((data) => {
      const code = data?.codeResult?.code;
      if (!code) return;
      const now = Date.now();
      if (code === last && now - t < 1200) return;
      last = code;
      t = now;
      onCode(code);
    });
  });
}

export function stopScanner() {
  if (typeof Quagga !== 'undefined') {
    try {
      Quagga.stop();
    } catch {
      /* noop */
    }
  }
}
