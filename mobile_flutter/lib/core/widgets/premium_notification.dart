import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

enum AlertType { success, warning, error, info }

class PremiumNotification {
  static void showToast(
    BuildContext context, {
    required String title,
    required String message,
    AlertType type = AlertType.success,
    IconData? icon,
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (ctx) => Positioned(
        top: MediaQuery.of(context).padding.top + 16,
        left: 16,
        right: 16,
        child: Material(
          color: Colors.transparent,
          child: _AnimatedToastWidget(
            title: title,
            message: message,
            type: type,
            icon: icon,
            onDismiss: () => entry.remove(),
          ),
        ),
      ),
    );

    overlay.insert(entry);
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
      message: '$productName  ·  Rp ${price.toStringAsFixed(0)}',
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
}

class _AnimatedToastWidget extends StatefulWidget {
  final String title;
  final String message;
  final AlertType type;
  final IconData? icon;
  final VoidCallback onDismiss;

  const _AnimatedToastWidget({
    required this.title,
    required this.message,
    required this.type,
    this.icon,
    required this.onDismiss,
  });

  @override
  State<_AnimatedToastWidget> createState() => _AnimatedToastWidgetState();
}

class _AnimatedToastWidgetState extends State<_AnimatedToastWidget> with TickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late AnimationController _pulseController;
  late Animation<double> _pulseGlow;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );

    _scaleAnimation = CurvedAnimation(parent: _controller, curve: Curves.elasticOut);
    _fadeAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _slideAnimation = Tween<Offset>(begin: const Offset(0, -0.6), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    _pulseGlow = Tween<double>(begin: 4.0, end: 14.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _controller.forward();

    // Auto dismiss after 2.8s
    Future.delayed(const Duration(milliseconds: 2800), () async {
      if (mounted) {
        await _controller.reverse();
        widget.onDismiss();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Color get _primaryColor {
    switch (widget.type) {
      case AlertType.success: return const Color(0xFF10B981);
      case AlertType.warning: return const Color(0xFFF59E0B);
      case AlertType.error: return const Color(0xFFEF4444);
      case AlertType.info: return const Color(0xFF38BDF8);
    }
  }

  Color get _bgGradientStart {
    switch (widget.type) {
      case AlertType.success: return const Color(0xFF064E3B);
      case AlertType.warning: return const Color(0xFF78350F);
      case AlertType.error: return const Color(0xFF7F1D1D);
      case AlertType.info: return const Color(0xFF0C4A6E);
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
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: AnimatedBuilder(
            animation: _pulseGlow,
            builder: (ctx, child) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_bgGradientStart, const Color(0xFF111827)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _primaryColor, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: _primaryColor.withValues(alpha: 0.35),
                    blurRadius: _pulseGlow.value,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _primaryColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: _primaryColor.withValues(alpha: 0.6),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Icon(_defaultIcon, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.title.toUpperCase(),
                          style: GoogleFonts.plusJakartaSans(
                            color: _primaryColor,
                            fontWeight: FontWeight.w900,
                            fontSize: 12,
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.message,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    widget.type == AlertType.success ? Icons.auto_awesome : Icons.notifications_active_rounded,
                    color: _primaryColor.withValues(alpha: 0.8),
                    size: 18,
                  ),
                ],
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

class _AnimatedAlertModalWidgetState extends State<_AnimatedAlertModalWidget> with TickerProviderStateMixin {
  late AnimationController _badgeController;
  late Animation<double> _badgeScale;
  late AnimationController _pulseController;
  late Animation<double> _pulseGlow;

  @override
  void initState() {
    super.initState();
    _badgeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _badgeScale = CurvedAnimation(parent: _badgeController, curve: Curves.elasticOut);

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseGlow = Tween<double>(begin: 8.0, end: 22.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _badgeController.forward();
  }

  @override
  void dispose() {
    _badgeController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Color get _primaryColor {
    switch (widget.type) {
      case AlertType.success: return const Color(0xFF10B981);
      case AlertType.warning: return const Color(0xFFF59E0B);
      case AlertType.error: return const Color(0xFFEF4444);
      case AlertType.info: return const Color(0xFF38BDF8);
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: BorderSide(color: _primaryColor.withValues(alpha: 0.4))),
      backgroundColor: const Color(0xFF111827),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedBuilder(
              animation: _pulseGlow,
              builder: (ctx, child) => ScaleTransition(
                scale: _badgeScale,
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    color: _primaryColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: _primaryColor.withValues(alpha: 0.5),
                        blurRadius: _pulseGlow.value,
                        spreadRadius: 3,
                      ),
                    ],
                  ),
                  child: Icon(_icon, color: Colors.white, size: 38),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              widget.title,
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.of(context).pop();
                  widget.onConfirm?.call();
                },
                child: Text(
                  widget.confirmText,
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
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
  final VoidCallback onNewTransaction;

  const AnimatedSuccessCheckoutModal({
    super.key,
    required this.invoiceId,
    required this.total,
    required this.paid,
    required this.change,
    required this.items,
    required this.onPrint,
    required this.onNewTransaction,
  });

  @override
  State<AnimatedSuccessCheckoutModal> createState() => _AnimatedSuccessCheckoutModalState();
}

class _AnimatedSuccessCheckoutModalState extends State<AnimatedSuccessCheckoutModal> with TickerProviderStateMixin {
  late AnimationController _badgeController;
  late Animation<double> _badgeScale;
  late AnimationController _pulseController;
  late Animation<double> _pulseGlow;

  @override
  void initState() {
    super.initState();
    _badgeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _badgeScale = CurvedAnimation(parent: _badgeController, curve: Curves.elasticOut);

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseGlow = Tween<double>(begin: 8.0, end: 24.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _badgeController.forward();
  }

  @override
  void dispose() {
    _badgeController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: const BorderSide(color: Color(0xFF1E293B))),
      backgroundColor: const Color(0xFF111827),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Glowing Animated Green Checkmark
            AnimatedBuilder(
              animation: _pulseGlow,
              builder: (ctx, child) => ScaleTransition(
                scale: _badgeScale,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF10B981), Color(0xFF059669)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withValues(alpha: 0.5),
                        blurRadius: _pulseGlow.value,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.check_rounded, color: Colors.white, size: 44),
                ),
              ),
            ),
            const SizedBox(height: 16),

            Text(
              'TRANSAKSI SUKSES!',
              style: GoogleFonts.plusJakartaSans(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 20,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Invoice #${widget.invoiceId}',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Card Nominal Kembalian Jumbo
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF090D16),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
              ),
              child: Column(
                children: [
                  const Text(
                    'UANG KEMBALIAN',
                    style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Rp ${widget.change.toStringAsFixed(0)}',
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF10B981),
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Total: Rp ${widget.total.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      Text('Bayar: Rp ${widget.paid.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Buttons
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 4,
                ),
                icon: const Icon(Icons.print_rounded, size: 20),
                label: const Text('Cetak Struk Thermal (58mm)', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                onPressed: widget.onPrint,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF334155)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: widget.onNewTransaction,
                child: const Text('Selesai & Transaksi Baru', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
