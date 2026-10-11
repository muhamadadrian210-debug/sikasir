import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

enum AlertType { success, warning, error, info }

class PremiumNotification {
  static OverlayEntry? _activeToast;

  static void showToast(
    BuildContext context, {
    required String title,
    required String message,
    AlertType type = AlertType.success,
    IconData? icon,
    Duration duration = const Duration(milliseconds: 2800),
  }) {
    // Haptic feedback for tactile feel
    try {
      if (type == AlertType.success) {
        HapticFeedback.mediumImpact();
      } else if (type == AlertType.error || type == AlertType.warning) {
        HapticFeedback.heavyImpact();
      } else {
        HapticFeedback.selectionClick();
      }
    } catch (_) {}

    // Clean up previous toast if active
    try {
      _activeToast?.remove();
    } catch (_) {}
    _activeToast = null;

    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (ctx) => Positioned(
        top: MediaQuery.of(context).padding.top + 12,
        left: 16,
        right: 16,
        child: Material(
          color: Colors.transparent,
          child: _AnimatedToastWidget(
            title: title,
            message: message,
            type: type,
            icon: icon,
            duration: duration,
            onDismiss: () {
              if (_activeToast == entry) {
                try {
                  entry.remove();
                } catch (_) {}
                _activeToast = null;
              }
            },
          ),
        ),
      ),
    );

    _activeToast = entry;
    overlay.insert(entry);
  }

  /// Notifikasi Selesai Pembayaran (Simple, Clean, Modern, Bukan Murahan)
  static void showPaymentSuccess(
    BuildContext context, {
    required String invoiceId,
    required double total,
    String? method,
  }) {
    final methodStr = method != null && method.isNotEmpty ? '  ·  $method' : '';
    showToast(
      context,
      title: 'PEMBAYARAN SELESAI',
      message: '#$invoiceId  ·  Rp ${_formatRupiah(total)}$methodStr',
      type: AlertType.success,
      icon: Icons.check_circle_rounded,
      duration: const Duration(milliseconds: 3200),
    );
  }

  /// Notifikasi Pembayaran / Pesanan Dibatalkan (Void / Cancel)
  static void showPaymentCancelled(
    BuildContext context, {
    String reason = 'Pembayaran Dibatalkan',
    double? amount,
  }) {
    final amountStr = amount != null && amount > 0 ? '  ·  Rp ${_formatRupiah(amount)}' : '';
    showToast(
      context,
      title: 'PEMBAYARAN DIBATALKAN',
      message: '$reason$amountStr',
      type: AlertType.warning,
      icon: Icons.remove_circle_outline_rounded,
      duration: const Duration(milliseconds: 3000),
    );
  }

  /// Notifikasi Item Dibatalkan (Void Item)
  static void showItemVoided(
    BuildContext context, {
    required String itemName,
    required double amount,
  }) {
    showToast(
      context,
      title: 'ITEM DIBATALKAN (VOID)',
      message: '$itemName  ·  -Rp ${_formatRupiah(amount)}',
      type: AlertType.error,
      icon: Icons.delete_sweep_rounded,
      duration: const Duration(milliseconds: 2800),
    );
  }

  /// Notifikasi Keranjang Dikosongkan
  static void showCartCleared(
    BuildContext context, {
    required int itemCount,
    required double totalAmount,
  }) {
    showToast(
      context,
      title: 'KERANJANG DIKOSONGKAN',
      message: '$itemCount item dibatalkan  ·  Rp ${_formatRupiah(totalAmount)}',
      type: AlertType.warning,
      icon: Icons.remove_shopping_cart_rounded,
      duration: const Duration(milliseconds: 2800),
    );
  }

  static void showSuccess(BuildContext context, {required String title, required String message}) {
    showToast(context, title: title, message: message, type: AlertType.success);
  }

  static void showWarning(BuildContext context, {required String title, required String message}) {
    showToast(context, title: title, message: message, type: AlertType.warning);
  }

  static void showError(BuildContext context, {required String title, required String message}) {
    showToast(context, title: title, message: message, type: AlertType.error);
  }

  static void showInfo(BuildContext context, {required String title, required String message}) {
    showToast(context, title: title, message: message, type: AlertType.info);
  }

  static void showScanSuccess(BuildContext context, {required String productName, required double price}) {
    showToast(
      context,
      title: 'SCAN BERHASIL!',
      message: '$productName  ·  Rp ${_formatRupiah(price)}',
      type: AlertType.success,
      icon: Icons.qr_code_scanner_rounded,
    );
  }

  static void showAlertModal(
    BuildContext context, {
    required String title,
    required String message,
    AlertType type = AlertType.success,
    String confirmText = 'Mengerti',
    VoidCallback? onConfirm,
  }) {
    showDialog(
      context: context,
      builder: (ctx) => _AnimatedAlertModalWidget(
        title: title,
        message: message,
        type: type,
        confirmText: confirmText,
        onConfirm: onConfirm,
      ),
    );
  }

  static String _formatRupiah(double val) {
    return val.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]}.',
    );
  }
}

class _AnimatedToastWidget extends StatefulWidget {
  final String title;
  final String message;
  final AlertType type;
  final IconData? icon;
  final Duration duration;
  final VoidCallback onDismiss;

  const _AnimatedToastWidget({
    required this.title,
    required this.message,
    required this.type,
    this.icon,
    this.duration = const Duration(milliseconds: 2800),
    required this.onDismiss,
  });

  @override
  State<_AnimatedToastWidget> createState() => _AnimatedToastWidgetState();
}

class _AnimatedToastWidgetState extends State<_AnimatedToastWidget> with TickerProviderStateMixin {
  late AnimationController _slideController;
  late AnimationController _progressController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );

    _progressController = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _scaleAnimation = CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic);
    _fadeAnimation = CurvedAnimation(parent: _slideController, curve: Curves.easeIn);
    _slideAnimation = Tween<Offset>(begin: const Offset(0, -0.6), end: Offset.zero).animate(
      CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic),
    );

    _slideController.forward();
    _progressController.forward();

    // Auto dismiss after duration
    Future.delayed(widget.duration, () async {
      if (mounted) {
        await _dismissGracefully();
      }
    });
  }

  Future<void> _dismissGracefully() async {
    if (!mounted) return;
    await _slideController.reverse();
    if (mounted) {
      widget.onDismiss();
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  Color get _primaryColor {
    switch (widget.type) {
      case AlertType.success: return const Color(0xFF10B981);
      case AlertType.warning: return const Color(0xFFF59E0B);
      case AlertType.error: return const Color(0xFFEF4444);
      case AlertType.info: return const Color(0xFF3B82F6);
    }
  }

  Color get _bgColor {
    switch (widget.type) {
      case AlertType.success: return const Color(0xFFECFDF5);
      case AlertType.warning: return const Color(0xFFFFFBEB);
      case AlertType.error: return const Color(0xFFFEF2F2);
      case AlertType.info: return const Color(0xFFEFF6FF);
    }
  }

  IconData get _defaultIcon {
    if (widget.icon != null) return widget.icon!;
    switch (widget.type) {
      case AlertType.success: return Icons.check_circle_rounded;
      case AlertType.warning: return Icons.warning_amber_rounded;
      case AlertType.error: return Icons.cancel_rounded;
      case AlertType.info: return Icons.info_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onVerticalDragUpdate: (details) {
        if (details.primaryDelta != null && details.primaryDelta! < -4) {
          _dismissGracefully();
        }
      },
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _primaryColor.withValues(alpha: 0.35), width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                    BoxShadow(
                      color: _primaryColor.withValues(alpha: 0.12),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: _bgColor,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(_defaultIcon, color: _primaryColor, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  widget.title,
                                  style: GoogleFonts.plusJakartaSans(
                                    color: _primaryColor,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 11,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                                const SizedBox(height: 1.5),
                                Text(
                                  widget.message,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.plusJakartaSans(
                                    color: AppColors.textPrimary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, size: 16, color: AppColors.textMuted),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                            onPressed: _dismissGracefully,
                          ),
                        ],
                      ),
                    ),
                    // Micro Progress Bar at the bottom edge
                    AnimatedBuilder(
                      animation: _progressController,
                      builder: (context, child) {
                        return Container(
                          height: 2,
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor: 1.0 - _progressController.value,
                            child: Container(
                              color: _primaryColor.withValues(alpha: 0.5),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AnimatedAlertModalWidget extends StatefulWidget {
  final String title;
  final String message;
  final AlertType type;
  final String confirmText;
  final VoidCallback? onConfirm;

  const _AnimatedAlertModalWidget({
    required this.title,
    required this.message,
    required this.type,
    required this.confirmText,
    this.onConfirm,
  });

  @override
  State<_AnimatedAlertModalWidget> createState() => _AnimatedAlertModalWidgetState();
}

class _AnimatedAlertModalWidgetState extends State<_AnimatedAlertModalWidget> with SingleTickerProviderStateMixin {
  late AnimationController _badgeController;
  late Animation<double> _badgeScale;

  @override
  void initState() {
    super.initState();
    _badgeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _badgeScale = CurvedAnimation(parent: _badgeController, curve: Curves.easeOutBack);
    _badgeController.forward();
  }

  @override
  void dispose() {
    _badgeController.dispose();
    super.dispose();
  }

  Color get _primaryColor {
    switch (widget.type) {
      case AlertType.success: return AppColors.primary;
      case AlertType.warning: return AppColors.warning;
      case AlertType.error: return AppColors.danger;
      case AlertType.info: return AppColors.secondary;
    }
  }

  Color get _bgColor {
    switch (widget.type) {
      case AlertType.success: return AppColors.primaryLight;
      case AlertType.warning: return AppColors.warningLight;
      case AlertType.error: return AppColors.dangerLight;
      case AlertType.info: return AppColors.secondaryLight;
    }
  }

  IconData get _icon {
    switch (widget.type) {
      case AlertType.success: return Icons.check_rounded;
      case AlertType.warning: return Icons.warning_rounded;
      case AlertType.error: return Icons.priority_high_rounded;
      case AlertType.info: return Icons.lightbulb_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ScaleTransition(
              scale: _badgeScale,
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: _bgColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(_icon, color: _primaryColor, size: 34),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              widget.title,
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 17,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  Navigator.of(context).pop();
                  widget.onConfirm?.call();
                },
                child: Text(
                  widget.confirmText,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AnimatedSuccessCheckoutModal extends StatefulWidget {
  final String invoiceId;
  final double total;
  final double paid;
  final double change;
  final List<Map<String, dynamic>> items;
  final VoidCallback onPrint;
  final VoidCallback? onWhatsApp;
  final VoidCallback onNewTransaction;

  const AnimatedSuccessCheckoutModal({
    super.key,
    required this.invoiceId,
    required this.total,
    required this.paid,
    required this.change,
    required this.items,
    required this.onPrint,
    this.onWhatsApp,
    required this.onNewTransaction,
  });

  @override
  State<AnimatedSuccessCheckoutModal> createState() => _AnimatedSuccessCheckoutModalState();
}

class _AnimatedSuccessCheckoutModalState extends State<AnimatedSuccessCheckoutModal> with SingleTickerProviderStateMixin {
  late AnimationController _badgeController;
  late Animation<double> _badgeScale;

  @override
  void initState() {
    super.initState();
    _badgeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );
    _badgeScale = CurvedAnimation(parent: _badgeController, curve: Curves.easeOutBack);
    _badgeController.forward();
  }

  @override
  void dispose() {
    _badgeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ScaleTransition(
              scale: _badgeScale,
              child: Container(
                width: 68,
                height: 68,
                decoration: const BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_rounded, color: AppColors.primary, size: 40),
              ),
            ),
            const SizedBox(height: 14),

            Text(
              'Pembayaran Berhasil!',
              style: GoogleFonts.plusJakartaSans(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w900,
                fontSize: 19,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Invoice #${widget.invoiceId}',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Card Kembalian Bersih
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Column(
                children: [
                  const Text(
                    'UANG KEMBALIAN',
                    style: TextStyle(color: AppColors.primaryDark, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Rp ${widget.change.toStringAsFixed(0)}',
                    style: GoogleFonts.plusJakartaSans(
                      color: AppColors.primaryDark,
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const Divider(color: AppColors.border, height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Total: Rp ${widget.total.toStringAsFixed(0)}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      Text('Bayar: Rp ${widget.paid.toStringAsFixed(0)}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Tombol Cetak Struk
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.print_rounded, size: 18),
                label: const Text('Cetak Struk (Printer Thermal)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                onPressed: widget.onPrint,
              ),
            ),
            if (widget.onWhatsApp != null) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.chat_rounded, size: 18),
                  label: const Text('Kirim Struk WhatsApp (Paperless)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                  onPressed: widget.onWhatsApp,
                ),
              ),
            ],
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textPrimary,
                  side: const BorderSide(color: AppColors.border),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: widget.onNewTransaction,
                child: const Text('Selesai / Transaksi Baru', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
