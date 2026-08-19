import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';

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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Koneksi shift offline: $e')));
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
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Laporan Tutup Shift', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kasir: ${summary['cashier']}', style: const TextStyle(color: Color(0xFF94A3B8))),
            const Divider(color: Color(0xFF1E293B)),
            Text('Modal Awal: ${_currency.format(summary['initial_cash'])}', style: const TextStyle(color: Colors.white)),
            Text('Total Penjualan: ${_currency.format(summary['total_sales'])}', style: const TextStyle(color: Color(0xFF10B981))),
            Text('Uang Seharusnya (Expected): ${_currency.format(summary['expected_cash'])}', style: const TextStyle(color: Colors.white)),
            Text('Uang Fisik Kasir: ${_currency.format(summary['actual_cash'])}', style: const TextStyle(color: Colors.white)),
            const Divider(color: Color(0xFF1E293B)),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Selisih (Variance):', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
                Text(
                  _currency.format(variance),
                  style: TextStyle(
                    color: variance == 0 ? const Color(0xFF10B981) : (variance > 0 ? const Color(0xFF3B82F6) : const Color(0xFFEF4444)),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Selesai', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        title: const Text('Manajemen Shift Kasir', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : Padding(
              padding: const EdgeInsets.all(16),
              child: _hasActiveShift ? _buildActiveShiftView() : _buildStartShiftView(),
            ),
    );
  }

  Widget _buildStartShiftView() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Card(
          color: const Color(0xFF111827),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_open, color: Color(0xFF10B981), size: 48),
                const SizedBox(height: 12),
                const Text('Buka Shift Kasir Baru', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const Text('Masukkan modal awal di laci kasir', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                const SizedBox(height: 20),
                TextField(
                  controller: _initialCashController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    labelText: 'Modal Awal Kas (Rp)',
                    labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFF090D16),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: _startShift,
                    child: const Text('BUKA SHIFT KASIR', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
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
        child: Card(
          color: const Color(0xFF111827),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Shift Sedang Aktif', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFF064E3B), borderRadius: BorderRadius.circular(6)),
                      child: const Text('OPEN', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                if (startTime != null)
                  Text('Dimulai: ${DateFormat('dd MMM yyyy HH:mm').format(startTime)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                const Divider(color: Color(0xFF1E293B), height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Modal Awal:', style: TextStyle(color: Color(0xFF94A3B8))),
                    Text(_currency.format(shift['initial_cash'] ?? 0), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Penjualan Shift:', style: TextStyle(color: Color(0xFF94A3B8))),
                    Text(_currency.format(shift['total_sales'] ?? 0), style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Uang Seharusnya (Expected):', style: TextStyle(color: Color(0xFF94A3B8))),
                    Text(_currency.format(shift['expected_cash'] ?? 0), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
                const Divider(color: Color(0xFF1E293B), height: 24),
                const Text('Tutup Shift & Hitung Kas Fisik', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(
                  controller: _actualCashController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    labelText: 'Jumlah Uang Fisik di Laci (Rp)',
                    labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFF090D16),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEF4444),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: _closeShift,
                    child: const Text('TUTUP SHIFT & CETAK REKAP', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
