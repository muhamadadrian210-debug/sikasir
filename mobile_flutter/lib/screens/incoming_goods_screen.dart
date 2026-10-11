import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class IncomingGoodsScreen extends StatefulWidget {
  const IncomingGoodsScreen({super.key});

  @override
  State<IncomingGoodsScreen> createState() => _IncomingGoodsScreenState();
}

class _IncomingGoodsScreenState extends State<IncomingGoodsScreen> {
  List<dynamic> _logs = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchIncoming();
  }

  Future<void> _fetchIncoming() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/incoming-goods');
      if (res.statusCode == 200) {
        setState(() {
          _logs = res.data is List ? res.data : [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat barang masuk: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddIncomingModal() {
    final descCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    final unitCtrl = TextEditingController(text: 'pcs');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Catat Barang Masuk (Restock)', style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: descCtrl,
              style: const TextStyle(fontSize: 13),
              decoration: const InputDecoration(labelText: 'Deskripsi Barang / Supplier *'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(labelText: 'Jumlah Kuantitas Masuk *'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: unitCtrl,
              style: const TextStyle(fontSize: 13),
              decoration: const InputDecoration(labelText: 'Satuan (pcs, box, dus)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              final qty = int.tryParse(qtyCtrl.text) ?? 0;
              if (descCtrl.text.trim().isEmpty || qty <= 0) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Deskripsi dan jumlah wajib diisi!')));
                return;
              }

              try {
                await ApiService().post('/incoming-goods', data: {
                  'description': descCtrl.text.trim(),
                  'quantity': qty,
                  'unit': unitCtrl.text.trim(),
                });
                if (ctx.mounted) {
                  Navigator.of(ctx).pop();
                  _fetchIncoming();
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Gagal catat barang masuk: $e')));
                }
              }
            },
            child: const Text('Simpan Log'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Catat Masuk', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: _showAddIncomingModal,
      ),
      body: Column(
        children: [
          // Header Info
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Riwayat Restock & Barang Masuk (${_logs.length})',
                  style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
                  onPressed: _fetchIncoming,
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _logs.isEmpty
                    ? const Center(child: Text('Belum ada log barang masuk', style: TextStyle(color: AppColors.textSecondary)))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                        itemCount: _logs.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final it = _logs[idx];
                          final date = it['created_at'] != null ? DateTime.tryParse(it['created_at'].toString()) : null;

                          return Container(
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
                                  child: const Icon(Icons.move_to_inbox_rounded, color: AppColors.primaryDark, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        it['description'] ?? it['product_name'] ?? 'Barang Masuk',
                                        style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Petugas: ${it['created_by_name'] ?? 'Admin'} · ${date != null ? DateFormat('dd MMM yyyy, HH:mm').format(date) : '-'}',
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.successLight,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '+${it['quantity']} ${it['unit'] ?? 'pcs'}',
                                    style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w800, fontSize: 13),
                                  ),
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
