/**
 * Web Worker untuk decode barcode via ZXing
 * Berjalan di thread terpisah — tidak blocking UI
 */
importScripts('https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js');

const ZXing = self.ZXing;
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

self.onmessage = (e) => {
  const { imageData, width, height, id } = e.data;
  try {
    // Buat OffscreenCanvas untuk luminance source
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);

    // Brightness boost via pixel manipulation
    const data = imageData;
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, data[i]     * 1.35);
      data[i + 1] = Math.min(255, data[i + 1] * 1.35);
      data[i + 2] = Math.min(255, data[i + 2] * 1.35);
    }
    ctx.putImageData(new ImageData(data, width, height), 0, 0);

    const luminance = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
    const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
    const result = reader.decode(bitmap);
    self.postMessage({ id, code: result.getText() });
  } catch {
    self.postMessage({ id, code: null });
  }
};
