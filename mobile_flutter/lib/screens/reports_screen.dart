import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  String _period = 'monthly'; // daily, weekly, monthly
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
    final rev = (_marginData?['total_revenue'] ?? 0).toDouble();
    final cost = (_marginData?['total_cost'] ?? 0).toDouble();
    final profit = (_marginData?['total_profit'] ?? 0).toDouble();
    final exp = (_marginData?['total_expenses'] ?? 0).toDouble();
    final netProfit = (_marginData?['net_profit'] ?? profit).toDouble();
    final products = (_marginData?['products'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Period Selector Chips (Majoo Style)
                  Row(
                    children: [
                      _buildPeriodChip('Hari Ini', 'daily'),
                      const SizedBox(width: 8),
                      _buildPeriodChip('7 Hari Terakhir', 'weekly'),
                      const SizedBox(width: 8),
                      _buildPeriodChip('Bulan Ini', 'monthly'),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
                        onPressed: _fetchReport,
                        tooltip: 'Sinkronkan',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 4 KPI Cards Grid
                  Row(
                    children: [
                      Expanded(
                        child: _buildKpiCard(
                          label: 'Total Omset',
                          value: _currency.format(rev),
                          icon: Icons.payments_rounded,
                          accentColor: const Color(0xFF0284C7),
                          bgColor: const Color(0xFFF0F9FF),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildKpiCard(
                          label: 'Laba Bersih',
                          value: _currency.format(netProfit),
                          icon: Icons.trending_up_rounded,
                          accentColor: AppColors.primaryDark,
                          bgColor: AppColors.primaryLight,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildKpiCard(
                          label: 'Total HPP (Modal)',
                          value: _currency.format(cost),
                          icon: Icons.inventory_2_outlined,
                          accentColor: const Color(0xFF64748B),
                          bgColor: const Color(0xFFF1F5F9),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildKpiCard(
                          label: 'Biaya Kas Keluar',
                          value: _currency.format(exp),
                          icon: Icons.receipt_long_outlined,
                          accentColor: AppColors.danger,
                          bgColor: AppColors.dangerLight,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Top Products Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Peringkat Produk Terlaris & Untung',
                        style: GoogleFonts.plusJakartaSans(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        '${products.length} Produk',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (products.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: AppTheme.cardDecoration(),
                      child: const Center(
                        child: Column(
                          children: [
                            Icon(Icons.bar_chart_rounded, size: 40, color: AppColors.textMuted),
                            SizedBox(height: 8),
                            Text('Belum ada transaksi penjualan pada periode ini', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                          ],
                        ),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: products.length,
                      separatorBuilder: (_, i) => const SizedBox(height: 8),
                      itemBuilder: (ctx, idx) {
                        final p = products[idx];
                        Color rankColor = const Color(0xFF64748B);
                        Color rankBg = const Color(0xFFF1F5F9);
                        if (idx == 0) {
                          rankColor = const Color(0xFFD97706);
                          rankBg = const Color(0xFFFEF3C7);
                        } else if (idx == 1) {
                          rankColor = const Color(0xFF475569);
                          rankBg = const Color(0xFFE2E8F0);
                        } else if (idx == 2) {
                          rankColor = const Color(0xFFB45309);
                          rankBg = const Color(0xFFFFEDD5);
                        }

                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: AppTheme.cardDecoration(),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: rankBg,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(
                                  child: Text(
                                    '#${idx + 1}',
                                    style: TextStyle(color: rankColor, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      p['name'] ?? '',
                                      style: GoogleFonts.plusJakartaSans(
                                        color: AppColors.textPrimary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Terjual: ${p['qty_sold']} pcs · Omset: ${_currency.format(p['revenue'] ?? 0)}',
                                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('Untung Bersih', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                                  Text(
                                    _currency.format(p['profit'] ?? 0),
                                    style: const TextStyle(
                                      color: AppColors.primaryDark,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13.5,
                                    ),
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

  Widget _buildPeriodChip(String label, String value) {
    final isSelected = _period == value;
    return InkWell(
      onTap: () {
        setState(() => _period = value);
        _fetchReport();
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildKpiCard({
    required String label,
    required String value,
    required IconData icon,
    required Color accentColor,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: AppTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5, fontWeight: FontWeight.w600),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: accentColor, size: 16),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: GoogleFonts.plusJakartaSans(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w900,
              fontSize: 15.5,
            ),
          ),
        ],
      ),
    );
  }
}
