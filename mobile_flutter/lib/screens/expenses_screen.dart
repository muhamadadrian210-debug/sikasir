import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  List<dynamic> _expenses = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  Future<void> _fetchExpenses() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/expenses?period=monthly');
      if (res.statusCode == 200) {
        setState(() {
          _expenses = res.data is List ? res.data : [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat kas keluar: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddExpenseModal() {
    final sourceCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String category = 'Supplier';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Catat Kas Keluar / Nota', style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: sourceCtrl,
                  style: const TextStyle(fontSize: 13),
                  decoration: const InputDecoration(labelText: 'Toko / Supplier / Keperluan *'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  dropdownColor: AppColors.surface,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(labelText: 'Kategori Biaya'),
                  items: const [
                    DropdownMenuItem(value: 'Supplier', child: Text('Belanja Supplier / Restock')),
                    DropdownMenuItem(value: 'Operasional', child: Text('Operasional & Listrik Toko')),
                    DropdownMenuItem(value: 'Gaji', child: Text('Gaji Karyawan')),
                    DropdownMenuItem(value: 'Lainnya', child: Text('Keperluan Lain-lain')),
                  ],
                  onChanged: (val) => setModalState(() => category = val ?? 'Supplier'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  decoration: const InputDecoration(labelText: 'Nominal Biaya (Rp) *'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: notesCtrl,
                  style: const TextStyle(fontSize: 13),
                  decoration: const InputDecoration(labelText: 'Catatan / Keterangan'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
              onPressed: () async {
                final amount = double.tryParse(amountCtrl.text) ?? 0;
                if (sourceCtrl.text.trim().isEmpty || amount <= 0) {
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Keperluan dan nominal wajib diisi!')));
                  return;
                }

                final payload = {
                  'store_source': sourceCtrl.text.trim(),
                  'category': category,
                  'amount': amount,
                  'notes': notesCtrl.text.trim(),
                };

                try {
                  await ApiService().post('/expenses', data: payload);
                  if (ctx.mounted) {
                    Navigator.of(ctx).pop();
                    _fetchExpenses();
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Gagal catat kas keluar: $e')));
                  }
                }
              },
              child: const Text('Simpan Kas Keluar'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalExpense = _expenses.fold<double>(0, (sum, it) => sum + ((it['amount'] is num) ? (it['amount'] as num).toDouble() : 0));

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.danger,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Catat Pengeluaran', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: _showAddExpenseModal,
      ),
      body: Column(
        children: [
          // Banner Total Kas Keluar Bulan Ini
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(18),
            decoration: AppTheme.cardDecoration(),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TOTAL KAS KELUAR BULAN INI', style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      _currency.format(totalExpense),
                      style: GoogleFonts.plusJakartaSans(color: AppColors.danger, fontSize: 22, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
                  onPressed: _fetchExpenses,
                ),
              ],
            ),
          ),

          // List Pengeluaran
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _expenses.isEmpty
                    ? const Center(
                        child: Text('Belum ada catatan kas keluar bulan ini', style: TextStyle(color: AppColors.textSecondary)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                        itemCount: _expenses.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final ex = _expenses[idx];
                          final date = ex['created_at'] != null ? DateTime.tryParse(ex['created_at'].toString()) : null;

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: AppTheme.cardDecoration(),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.dangerLight,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.receipt_outlined, color: AppColors.danger, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        ex['store_source'] ?? '',
                                        style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Kategori: ${ex['category'] ?? '-'} · ${date != null ? DateFormat('dd MMM yyyy, HH:mm').format(date) : '-'}',
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                      ),
                                      if (ex['notes'] != null && ex['notes'].toString().isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          ex['notes'],
                                          style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontStyle: FontStyle.italic),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                Text(
                                  _currency.format(ex['amount'] ?? 0),
                                  style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w900, fontSize: 14),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
