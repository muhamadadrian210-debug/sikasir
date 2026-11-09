import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class LicenseScreen extends StatefulWidget {
  const LicenseScreen({super.key});

  @override
  State<LicenseScreen> createState() => _LicenseScreenState();
}

class _LicenseScreenState extends State<LicenseScreen> {
  final TextEditingController _codeController = TextEditingController();
  bool _isLoading = true;
  bool _isRedeeming = false;
  Map<String, dynamic>? _licenseData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchLicenseStatus();
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _fetchLicenseStatus() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService().get('/license/status');
      if (res.statusCode == 200 && res.data != null) {
        setState(() {
          _licenseData = Map<String, dynamic>.from(res.data);
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = res.data?['error'] ?? 'Gagal memuat status lisensi.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Gagal terhubung ke server: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _redeemCode() async {
    final code = _codeController.text.trim().toUpperCase();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kode lisensi wajib diisi')),
      );
      return;
    }

    setState(() => _isRedeeming = true);

    try {
      final res = await ApiService().post('/license/redeem', data: {'code': code});
      if (!mounted) return;
      if (res.statusCode == 200 && res.data != null) {
        _codeController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.primary,
            content: Text(res.data['message'] ?? 'Lisensi berhasil diperpanjang!'),
          ),
        );
        _fetchLicenseStatus();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.danger,
            content: Text(res.data?['error'] ?? 'Gagal mengaktifkan kode lisensi'),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: AppColors.danger, content: Text('Error: $e')),
      );
    } finally {
      if (mounted) setState(() => _isRedeeming = false);
    }
  }

  Future<void> _openWhatsApp() async {
    final storeName = _licenseData?['store_name'] ?? 'SiKasir Store';
    final text = 'Halo Admin SiKasir, saya ingin memperpanjang lisensi toko "$storeName". Mohon informasi tagihan & kode lisensi terbaru.';
    final uri = Uri.parse('https://wa.me/6281338219957?text=${Uri.encodeComponent(text)}');
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        await Clipboard.setData(const ClipboardData(text: '081338219957'));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Nomor WA 081338219957 telah disalin ke clipboard')),
          );
        }
      }
    } catch (_) {
      await Clipboard.setData(const ClipboardData(text: '081338219957'));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nomor WA 081338219957 telah disalin')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 48),
              const SizedBox(height: 12),
              Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textPrimary)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _fetchLicenseStatus,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    final data = _licenseData ?? {};
    final storeName = data['store_name'] ?? 'Toko Anda';
    final daysRemaining = data['days_remaining'];
    final isExpired = data['is_expired'] == true;
    final isNearExpiry = data['is_near_expiry'] == true;
    final currentCode = data['license_code'] ?? 'SIV-TRIAL-30D';
    final untilStr = data['subscription_until'] != null
        ? DateFormat('d MMMM yyyy, HH:mm', 'id_ID').format(DateTime.parse(data['subscription_until']))
        : 'Belum diatur';

    Color statusColor = AppColors.primary;
    String statusLabel = 'Aktif ($daysRemaining Hari Tersisa)';

    if (isExpired) {
      statusColor = AppColors.danger;
      statusLabel = 'Masa Aktif Berakhir';
    } else if (isNearExpiry) {
      statusColor = AppColors.warning;
      statusLabel = 'Segera Berakhir ($daysRemaining Hari Lagi)';
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      storeName,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      isExpired ? 'Kadaluarsa' : 'Aktif',
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 11.5,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1, color: AppColors.border),
              const SizedBox(height: 14),
              _buildInfoRow('Status Langganan', statusLabel, statusColor, isBold: true),
              const SizedBox(height: 8),
              _buildInfoRow('Masa Aktif Hingga', untilStr, AppColors.textPrimary),
              const SizedBox(height: 8),
              _buildInfoRow('Kode Lisensi Aktif', currentCode, AppColors.textSecondary, isMono: true),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Redeem Input Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Perpanjang dengan Kode Lisensi',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Masukkan kode lisensi resmi yang diawali dengan SIV- (contoh: SIV-30D-XXXX-XXXX).',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _codeController,
                textCapitalization: TextCapitalization.characters,
                style: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.bold, letterSpacing: 1),
                decoration: InputDecoration(
                  hintText: 'SIV-30D-XXXX-XXXX',
                  hintStyle: GoogleFonts.jetBrainsMono(color: Colors.grey.shade400),
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isRedeeming ? null : _redeemCode,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: _isRedeeming
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 18),
                  label: Text(
                    _isRedeeming ? 'Memproses...' : 'Terapkan Kode Lisensi',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Hubungi WhatsApp Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.chat_rounded, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bantuan & Pembelian Lisensi',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF14532D),
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'WhatsApp Billing: 081338219957',
                          style: TextStyle(color: Color(0xFF166534), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _openWhatsApp,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF166534),
                    side: const BorderSide(color: Color(0xFF22C55E)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.send_rounded, size: 16),
                  label: const Text(
                    'Chat WhatsApp (081338219957)',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, Color valueColor, {bool isBold = false, bool isMono = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
        Text(
          value,
          style: isMono
              ? GoogleFonts.jetBrainsMono(color: valueColor, fontWeight: FontWeight.bold, fontSize: 12)
              : TextStyle(
                  color: valueColor,
                  fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12.5,
                ),
        ),
      ],
    );
  }
}
