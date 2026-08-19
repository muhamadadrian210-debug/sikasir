import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';

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
          backgroundColor: const Color(0xFF111827),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
          title: const Text('Catat Pengeluaran / Bayar Nota', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: sourceCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: 'Toko / Supplier / Keperluan', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: 'Kategori', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                  items: const [
                    DropdownMenuItem(value: 'Supplier', child: Text('Belanja Supplier / Restock')),
                    DropdownMenuItem(value: 'Operasional', child: Text('Operasional & Listrik')),
                    DropdownMenuItem(value: 'Gaji', child: Text('Gaji Karyawan')),
                    DropdownMenuItem(value: 'Lainnya', child: Text('Keperluan Lain')),
                  ],
                  onChanged: (val) => setModalState(() => category = val ?? 'Supplier'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: 'Nominal Biaya (Rp)', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: notesCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: 'Catatan / Keterangan', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
              onPressed: () async {
                final payload = {
                  'store_source': sourceCtrl.text.trim(),
                  'category': category,
                  'amount': double.tryParse(amountCtrl.text) ?? 0,
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
                    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Gagal catat pengeluaran: $e')));
                  }
                }
              },
              child: const Text('Simpan Kas Keluar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: const Text('Bayar Nota & Kas Keluar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Color(0xFFEF4444)),
            onPressed: _showAddExpenseModal,
            tooltip: 'Tambah Pengeluaran',
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchExpenses,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : _expenses.isEmpty
              ? const Center(child: Text('Belum ada catatan kas keluar bulan ini', style: TextStyle(color: Color(0xFF64748B))))
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: _expenses.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (ctx, idx) {
                    final ex = _expenses[idx];
                    final date = ex['created_at'] != null ? DateTime.tryParse(ex['created_at'].toString()) : null;
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF111827),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF7F1D1D).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.receipt_outlined, color: Color(0xFFEF4444), size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ex['store_source'] ?? '',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Kategori: ${ex['category'] ?? '-'} | ${date != null ? DateFormat('dd MMM yyyy, HH:mm').format(date) : '-'}',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                ),
                                if (ex['notes'] != null && ex['notes'].toString().isNotEmpty)
                                  Text(
                                    ex['notes'],
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontStyle: FontStyle.italic),
                                  ),
                              ],
                            ),
                          ),
                          Text(
                            _currency.format(ex['amount'] ?? 0),
                            style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w900, fontSize: 14),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
