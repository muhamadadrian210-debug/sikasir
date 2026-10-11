import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';
import '../core/services/receipt_printer_service.dart';
import '../core/theme/app_theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  List<dynamic> _transactions = [];
  bool _isLoading = false;
  String _selectedMethod = 'all'; // all, cash, qris, kasbon
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/transactions');
      if (res.statusCode == 200) {
        setState(() {
          _transactions = res.data is List ? res.data : [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat riwayat: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showTransactionDetails(Map<String, dynamic> tx) {
    final date = tx['created_at'] != null ? DateTime.tryParse(tx['created_at'].toString()) : null;
    final items = (tx['items'] as List?) ?? [];
    final total = (tx['total'] is num) ? (tx['total'] as num).toDouble() : double.tryParse(tx['total']?.toString() ?? '0') ?? 0;
    final paid = (tx['paid'] is num) ? (tx['paid'] as num).toDouble() : double.tryParse(tx['paid']?.toString() ?? '0') ?? total;
    final change = (tx['change'] is num) ? (tx['change'] as num).toDouble() : double.tryParse(tx['change']?.toString() ?? '0') ?? (paid - total);
    final invoiceId = (tx['id'] ?? tx['invoice_id'] ?? '-').toString();
    final paymentMethod = (tx['payment_method'] ?? 'cash').toString().toUpperCase();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Invoice #$invoiceId',
                        style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        date != null ? DateFormat('dd MMMM yyyy, HH:mm').format(date) : '-',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                  _buildPaymentBadge(paymentMethod),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(color: AppColors.border),
              const SizedBox(height: 8),

              // Items
              if (items.isNotEmpty) ...[
                const Text('Detail Barang Dibeli:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...items.map((it) {
                  final name = it['name'] ?? it['product_name'] ?? 'Produk';
                  final qty = it['qty'] ?? 1;
                  final price = (it['price'] ?? it['sale_price'] ?? 0).toDouble();
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('$name  × $qty', style: const TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                        Text(_currency.format(price * qty), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 8),
                const Divider(color: AppColors.border),
              ],

              // Ringkasan Pembayaran
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Transaksi', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  Text(_currency.format(total), style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w900, fontSize: 16)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Nominal Bayar', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  Text(_currency.format(paid), style: const TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
              if (change > 0) ...[
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Kembalian', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    Text(_currency.format(change), style: const TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
              const SizedBox(height: 18),

              // Tombol Cetak Ulang Struk
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.print_rounded, size: 18),
                  label: const Text('Cetak Struk Kasir (Printer Thermal)', style: TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () {
                    final itemsList = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
                    ReceiptPrinterService.printReceipt(
                      storeName: 'SiKasir POS',
                      invoiceId: invoiceId,
                      cashierName: 'Kasir',
                      time: date ?? DateTime.now(),
                      items: itemsList,
                      total: total,
                      paid: paid,
                      change: change,
                    );
                    Navigator.pop(ctx);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentBadge(String method) {
    Color bg = AppColors.successLight;
    Color fg = AppColors.primaryDark;
    if (method.contains('QRIS')) {
      bg = AppColors.infoLight;
      fg = AppColors.info;
    } else if (method.contains('KASBON')) {
      bg = AppColors.warningLight;
      fg = AppColors.warning;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(method, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _transactions.where((tx) {
      final method = (tx['payment_method'] ?? 'cash').toString().toLowerCase();
      final id = (tx['id'] ?? tx['invoice_id'] ?? '').toString().toLowerCase();
      final cust = (tx['customer_name'] ?? '').toString().toLowerCase();

      final matchesQuery = _searchQuery.isEmpty || id.contains(_searchQuery.toLowerCase()) || cust.contains(_searchQuery.toLowerCase());
      final matchesMethod = _selectedMethod == 'all' || method.contains(_selectedMethod);
      return matchesQuery && matchesMethod;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Search & Refresh
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: TextField(
                      onChanged: (val) => setState(() => _searchQuery = val),
                      style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                      decoration: const InputDecoration(
                        hintText: 'Cari nomor invoice atau pelanggan...',
                        prefixIcon: Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 20),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 11),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
                  onPressed: _fetchHistory,
                  tooltip: 'Sinkronkan',
                ),
              ],
            ),
          ),

          // Filter Metodes Chips
          Container(
            height: 36,
            margin: const EdgeInsets.only(bottom: 8),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildMethodFilterChip('Semua Transaksi', 'all'),
                const SizedBox(width: 8),
                _buildMethodFilterChip('💵 Tunai (Cash)', 'cash'),
                const SizedBox(width: 8),
                _buildMethodFilterChip('📱 QRIS', 'qris'),
                const SizedBox(width: 8),
                _buildMethodFilterChip('💳 Kasbon', 'kasbon'),
              ],
            ),
          ),

          // List Riwayat
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : filtered.isEmpty
                    ? const Center(
                        child: Text('Belum ada riwayat transaksi yang cocok', style: TextStyle(color: AppColors.textSecondary)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                        itemCount: filtered.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final tx = filtered[idx];
                          final date = tx['created_at'] != null ? DateTime.tryParse(tx['created_at'].toString()) : null;
                          final method = (tx['payment_method'] ?? 'cash').toString().toUpperCase();

                          return InkWell(
                            onTap: () => _showTransactionDetails(tx),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: AppTheme.cardDecoration(),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryLight,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.receipt_long_rounded, color: AppColors.primary, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Invoice #${tx['id']}',
                                          style: GoogleFonts.plusJakartaSans(
                                            color: AppColors.textPrimary,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          date != null ? DateFormat('dd MMM yyyy, HH:mm').format(date) : '-',
                                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                                        ),
                                        const SizedBox(height: 4),
                                        _buildPaymentBadge(method),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        _currency.format(tx['total'] ?? 0),
                                        style: const TextStyle(
                                          color: AppColors.primaryDark,
                                          fontWeight: FontWeight.w900,
                                          fontSize: 15,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      const Row(
                                        children: [
                                          Text('Detail', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                                          Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.textMuted),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildMethodFilterChip(String label, String value) {
    final isSelected = _selectedMethod == value;
    return InkWell(
      onTap: () => setState(() => _selectedMethod = value),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
