import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class ShiftScreen extends StatefulWidget {
  const ShiftScreen({super.key});

  @override
  State<ShiftScreen> createState() => _ShiftScreenState();
}

class _ShiftScreenState extends State<ShiftScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  bool _isLoading = true;
  bool _hasActiveShift = false;
  Map<String, dynamic>? _shiftData;

  final TextEditingController _initialCashController = TextEditingController();
  final TextEditingController _actualCashController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkActiveShift();
  }

  @override
  void dispose() {
    _initialCashController.dispose();
    _actualCashController.dispose();
    super.dispose();
  }

  Future<void> _checkActiveShift() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/shifts/active');
      if (res.statusCode == 200) {
        setState(() {
          _hasActiveShift = res.data['active'] == true;
          _shiftData = res.data['shift'];
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Koneksi shift: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _startShift() async {
    final cash = double.tryParse(_initialCashController.text) ?? 0;
    try {
      final res = await ApiService().post('/shifts/start', data: {'initial_cash': cash});
      if (res.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Shift kasir berhasil dibuka!')));
        _initialCashController.clear();
        _checkActiveShift();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal buka shift: $e')));
    }
  }

  Future<void> _closeShift() async {
    final actual = double.tryParse(_actualCashController.text) ?? 0;
    try {
      final res = await ApiService().post('/shifts/close', data: {'actual_cash': actual});
      if (res.statusCode == 200) {
        final summary = res.data['summary'];
        if (!mounted) return;
        _showShiftReportDialog(summary);
        _actualCashController.clear();
        _checkActiveShift();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal tutup shift: $e')));
    }
  }

  void _showShiftReportDialog(Map<String, dynamic> summary) {
    final variance = (summary['variance'] ?? 0).toDouble();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Rekap Tutup Shift Kasir', style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kasir: ${summary['cashier'] ?? 'Kasir'}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 8),
            const Divider(color: AppColors.border),
            const SizedBox(height: 8),
            _buildReportRow('Modal Awal', _currency.format(summary['initial_cash'] ?? 0)),
            _buildReportRow('Total Penjualan Shift', _currency.format(summary['total_sales'] ?? 0), isHighlighted: true),
            _buildReportRow('Uang Seharusnya (Expected)', _currency.format(summary['expected_cash'] ?? 0)),
            _buildReportRow('Uang Fisik Dihitung Kasir', _currency.format(summary['actual_cash'] ?? 0)),
            const SizedBox(height: 8),
            const Divider(color: AppColors.border),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Selisih (Variance):', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                Text(
                  _currency.format(variance),
                  style: TextStyle(
                    color: variance == 0 ? AppColors.primaryDark : (variance > 0 ? AppColors.secondary : AppColors.danger),
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Selesai'),
          ),
        ],
      ),
    );
  }

  Widget _buildReportRow(String label, String value, {bool isHighlighted = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
          Text(
            value,
            style: TextStyle(
              color: isHighlighted ? AppColors.primaryDark : AppColors.textPrimary,
              fontWeight: isHighlighted ? FontWeight.bold : FontWeight.w600,
              fontSize: 12.5,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _hasActiveShift ? _buildActiveShiftView() : _buildStartShiftView(),
            ),
    );
  }

  Widget _buildStartShiftView() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.lock_open_rounded, color: AppColors.primary, size: 40),
              ),
              const SizedBox(height: 16),
              Text(
                'Buka Shift Kasir Baru',
                style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              const Text(
                'Masukkan jumlah uang modal awal di laci kasir (cash drawer)',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _initialCashController,
                keyboardType: TextInputType.number,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                decoration: const InputDecoration(
                  labelText: 'Modal Awal Kas (Rp)',
                  hintText: 'Contoh: 200000',
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  onPressed: _startShift,
                  child: const Text('BUKA SHIFT KASIR SEKARANG', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveShiftView() {
    final shift = _shiftData ?? {};
    final startTime = shift['start_time'] != null ? DateTime.tryParse(shift['start_time'].toString()) : null;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Shift Sedang Aktif',
                    style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.successLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('AKTIF (OPEN)', style: TextStyle(color: AppColors.primaryDark, fontSize: 11, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
              if (startTime != null) ...[
                const SizedBox(height: 2),
                Text(
                  'Dimulai sejak: ${DateFormat('dd MMMM yyyy, HH:mm').format(startTime)}',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
              const SizedBox(height: 14),
              const Divider(color: AppColors.border),
              const SizedBox(height: 10),

              // KPI Nilai Shift
              _buildMetricTile('Modal Awal Kasir', _currency.format(shift['initial_cash'] ?? 0)),
              _buildMetricTile('Total Penjualan Shift', _currency.format(shift['total_sales'] ?? 0), isPrimary: true),
              _buildMetricTile('Uang Seharusnya (Expected)', _currency.format(shift['expected_cash'] ?? 0), isBold: true),

              const SizedBox(height: 14),
              const Divider(color: AppColors.border),
              const SizedBox(height: 12),

              Text('Tutup Shift & Hitung Kasir Fisik', style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              TextField(
                controller: _actualCashController,
                keyboardType: TextInputType.number,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                decoration: const InputDecoration(
                  labelText: 'Jumlah Uang Fisik di Laci (Rp)',
                  hintText: 'Hitung dan masukkan uang fisik di laci',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                  onPressed: _closeShift,
                  child: const Text('TUTUP SHIFT & HITUNG SELISIH', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, {bool isPrimary = false, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          Text(
            value,
            style: TextStyle(
              color: isPrimary ? AppColors.primaryDark : AppColors.textPrimary,
              fontWeight: isBold || isPrimary ? FontWeight.w800 : FontWeight.w600,
              fontSize: isPrimary ? 15 : 13.5,
            ),
          ),
        ],
      ),
    );
  }
}
