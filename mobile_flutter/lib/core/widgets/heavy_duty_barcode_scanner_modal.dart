import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class HeavyDutyBarcodeScannerModal extends StatefulWidget {
  final Function(String code) onBarcodeScanned;

  const HeavyDutyBarcodeScannerModal({super.key, required this.onBarcodeScanned});

  static Future<void> show(BuildContext context, Function(String code) onScanned) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => HeavyDutyBarcodeScannerModal(onBarcodeScanned: onScanned),
    );
  }

  @override
  State<HeavyDutyBarcodeScannerModal> createState() => _HeavyDutyBarcodeScannerModalState();
}

class _HeavyDutyBarcodeScannerModalState extends State<HeavyDutyBarcodeScannerModal> {
  late MobileScannerController _scannerController;
  bool _isTorchOn = false;
  bool _hasScanned = false;

  @override
  void initState() {
    super.initState();
    // Inisialisasi High-Performance Vision Controller
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
      returnImage: false,
      formats: const [
        BarcodeFormat.ean13,
        BarcodeFormat.ean8,
        BarcodeFormat.upcA,
        BarcodeFormat.upcE,
        BarcodeFormat.code128,
        BarcodeFormat.code39,
        BarcodeFormat.code93,
        BarcodeFormat.qrCode,
        BarcodeFormat.dataMatrix,
      ],
    );
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _handleBarcode(BarcodeCapture capture) {
    if (_hasScanned) return;
    final List<Barcode> barcodes = capture.barcodes;

    for (final barcode in barcodes) {
      final String? rawValue = barcode.rawValue;
      if (rawValue != null && rawValue.trim().isNotEmpty) {
        setState(() => _hasScanned = true);
        
        // Haptic feedback & panggil callback
        widget.onBarcodeScanned(rawValue.trim());
        Navigator.of(context).pop();
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Container(
      height: size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFF090D16),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.qr_code_scanner, color: Color(0xFF10B981), size: 24),
                    SizedBox(width: 8),
                    Text(
                      'AI Vision Barcode Scanner',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      icon: Icon(_isTorchOn ? Icons.flash_on : Icons.flash_off, color: _isTorchOn ? Colors.amber : Colors.white70),
                      onPressed: () {
                        _scannerController.toggleTorch();
                        setState(() => _isTorchOn = !_isTorchOn);
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white70),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(color: Color(0xFF1E293B), height: 1),

          // Camera Viewport with Viewfinder Overlay
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: _handleBarcode,
                ),

                // Industrial Reticle Overlay
                Container(
                  width: 280,
                  height: 200,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFF10B981), width: 2.5),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withValues(alpha: 0.25),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        height: 2,
                        width: 240,
                        color: const Color(0xFF10B981).withValues(alpha: 0.8),
                      ),
                    ],
                  ),
                ),

                // Hint instruction
                Positioned(
                  bottom: 30,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: const Text(
                      'Arahkan kamera ke barcode barang (Auto-Focus)',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
