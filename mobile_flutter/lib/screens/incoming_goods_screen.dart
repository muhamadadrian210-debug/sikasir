import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';

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
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
        title: const Text('Catat Barang Masuk (Restock)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: descCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Deskripsi Barang / Supplier', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Jumlah Kuantitas Masuk', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: unitCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Satuan (pcs, box, dus)', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () async {
              try {
                await ApiService().post('/incoming-goods', data: {
                  'description': descCtrl.text.trim(),
                  'quantity': int.tryParse(qtyCtrl.text) ?? 1,
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
            child: const Text('Simpan Log', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
        elevation: 1,
        title: const Text('Log Barang Masuk (Restock)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Color(0xFF10B981)),
            onPressed: _showAddIncomingModal,
            tooltip: 'Tambah Barang Masuk',
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchIncoming,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : _logs.isEmpty
              ? const Center(child: Text('Belum ada log barang masuk', style: TextStyle(color: Color(0xFF64748B))))
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: _logs.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (ctx, idx) {
                    final it = _logs[idx];
                    final date = it['created_at'] != null ? DateTime.tryParse(it['created_at'].toString()) : null;
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
                              color: const Color(0xFF064E3B),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.move_to_inbox, color: Color(0xFF34D399), size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  it['description'] ?? it['product_name'] ?? 'Barang Masuk',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Penerima: ${it['created_by_name'] ?? 'Admin'} | ${date != null ? DateFormat('dd MMM yyyy, HH:mm').format(date) : '-'}',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '+${it['quantity']} ${it['unit'] ?? 'pcs'}',
                              style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
