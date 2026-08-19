import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  String _period = 'monthly';
  Map<String, dynamic>? _marginData;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchReport();
  }

  Future<void> _fetchReport() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/reports/margin?period=$_period');
      if (res.statusCode == 200) {
        setState(() => _marginData = res.data);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat laporan: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rev = _marginData?['total_revenue'] ?? 0;
    final cost = _marginData?['total_cost'] ?? 0;
    final profit = _marginData?['total_profit'] ?? 0;
    final exp = _marginData?['total_expenses'] ?? 0;
    final netProfit = _marginData?['net_profit'] ?? profit;
    final products = (_marginData?['products'] as List?) ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: const Text('Laporan Omset & Margin Untung', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          DropdownButton<String>(
            value: _period,
            dropdownColor: const Color(0xFF1E293B),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            underline: const SizedBox(),
            items: const [
              DropdownMenuItem(value: 'daily', child: Text('Hari Ini')),
              DropdownMenuItem(value: 'weekly', child: Text('7 Hari Terakhir')),
              DropdownMenuItem(value: 'monthly', child: Text('Bulan Ini')),
            ],
            onChanged: (val) {
              if (val != null) {
                setState(() => _period = val);
                _fetchReport();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchReport,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // KPI Cards Row
                  Row(
                    children: [
                      Expanded(
                        child: _buildKpiCard('Total Omset', _currency.format(rev), const Color(0xFF3B82F6), Icons.payments),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildKpiCard('Laba Bersih', _currency.format(netProfit), const Color(0xFF10B981), Icons.trending_up),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildKpiCard('Total HPP (Modal)', _currency.format(cost), const Color(0xFF94A3B8), Icons.inventory_2),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildKpiCard('Pengeluaran/Biaya', _currency.format(exp), const Color(0xFFEF4444), Icons.receipt),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  const Text(
                    'Peringkat Produk Paling Menguntungkan',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),

                  if (products.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text('Belum ada data penjualan pada periode ini', style: TextStyle(color: Color(0xFF64748B))),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: products.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 8),
                      itemBuilder: (ctx, idx) {
                        final p = products[idx];
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF111827),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF1E293B)),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: const Color(0xFF1E293B),
                                child: Text('${idx + 1}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      p['name'] ?? '',
                                      style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Text(
                                      'Terjual: ${p['qty_sold']} pcs | Omset: ${_currency.format(p['revenue'] ?? 0)}',
                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('Untung Bersih', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                  Text(
                                    _currency.format(p['profit'] ?? 0),
                                    style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildKpiCard(String label, String value, Color accentColor, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600)),
              Icon(icon, color: accentColor, size: 18),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}
