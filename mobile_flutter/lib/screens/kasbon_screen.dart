import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';

class KasbonScreen extends StatefulWidget {
  const KasbonScreen({super.key});

  @override
  State<KasbonScreen> createState() => _KasbonScreenState();
}

class _KasbonScreenState extends State<KasbonScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  List<dynamic> _debts = [];
  bool _isLoading = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchKasbon();
  }

  Future<void> _fetchKasbon() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/transactions');
      if (res.statusCode == 200 && res.data is List) {
        // Filter transactions with payment_method == 'kasbon' or have unpaid debt
        final all = res.data as List;
        setState(() {
          _debts = all.where((t) => (t['payment_method'] ?? '').toString().toLowerCase() == 'kasbon' || (t['debt_amount'] ?? 0) > 0).toList();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat kasbon: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _sendWhatsAppReminder(Map<String, dynamic> debt) {
    final phone = (debt['customer_phone'] ?? debt['phone'] ?? '').toString().replaceAll(RegExp(r'[^0-9]'), '');
    final name = debt['customer_name'] ?? debt['name'] ?? 'Pelanggan';
    final total = _currency.format(debt['total'] ?? debt['debt_amount'] ?? 0);
    final invoice = debt['id'] ?? '-';

    String formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62${formattedPhone.substring(1)}';
    }

    final messageText =
        'Halo Kak *$name*,\n\n'
        'Kami dari *SiKasir Official Store* menginformasikan catatan kasbon/hutang transaksi #$invoice sebesar *$total*.\n\n'
        'Mohon konfirmasi jika ada pertanyaan atau untuk pembayaran. Terima kasih banyak atas kerjasamanya! 🙏';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: const Color(0xFF25D366).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Draf Tagihan WhatsApp', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kirim ke: $name (${formattedPhone.isNotEmpty ? "+$formattedPhone" : "Belum ada no WA"})', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF090D16),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: SelectableText(
                messageText,
                style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
            icon: const Icon(Icons.copy, size: 16, color: Colors.white),
            label: const Text('Salin Pesan WA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('📋 Draf tagihan disalin! Buka WhatsApp pelanggan untuk paste.'),
                  backgroundColor: Color(0xFF10B981),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showAddKasbonDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final noteCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: const Color(0xFFF59E0B).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.credit_card, color: Color(0xFFF59E0B), size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Catat Kasbon Baru', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Nama Pelanggan *', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'No WhatsApp / HP *', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Nominal Hutang (Rp) *', labelStyle: TextStyle(color: Color(0xFF10B981))),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: noteCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Keterangan Barang / Catatan', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
            onPressed: () {
              final name = nameCtrl.text.trim();
              final phone = phoneCtrl.text.trim();
              final amount = double.tryParse(amountCtrl.text) ?? 0;

              if (name.isEmpty || amount <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nama dan nominal wajib diisi!')));
                return;
              }

              setState(() {
                _debts.insert(0, {
                  'id': 'KB-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
                  'customer_name': name,
                  'customer_phone': phone,
                  'total': amount,
                  'notes': noteCtrl.text.trim(),
                  'created_at': DateTime.now().toIso8601String(),
                  'payment_method': 'kasbon',
                });
              });

              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Kasbon pelanggan berhasil dicatat!'), backgroundColor: Color(0xFF10B981)));
            },
            child: const Text('Simpan Kasbon', style: TextStyle(color: Color(0xFF090D16), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _debts.where((d) {
      final q = _searchQuery.toLowerCase();
      final name = (d['customer_name'] ?? d['name'] ?? '').toString().toLowerCase();
      final phone = (d['customer_phone'] ?? d['phone'] ?? '').toString().toLowerCase();
      return name.contains(q) || phone.contains(q);
    }).toList();

    final totalDebt = filtered.fold<double>(0, (sum, it) => sum + (it['total'] ?? it['debt_amount'] ?? 0));

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: Row(
          children: [
            Text('Manajemen Kasbon & Hutang', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchKasbon,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFF59E0B),
        icon: const Icon(Icons.add, color: Color(0xFF090D16)),
        label: const Text('Catat Kasbon', style: TextStyle(color: Color(0xFF090D16), fontWeight: FontWeight.bold)),
        onPressed: _showAddKasbonDialog,
      ),
      body: Column(
        children: [
          // Total Kasbon Header Banner
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFFB45309).withValues(alpha: 0.8), const Color(0xFF78350F)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TOTAL PIUTANG / KASBON AKTIF', style: TextStyle(color: Color(0xFFFDE68A), fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(_currency.format(totalDebt), style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(20)),
                  child: Text('${filtered.length} Catatan', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: '🔍 Cari nama / nomor WhatsApp pelanggan...',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                filled: true,
                fillColor: const Color(0xFF111827),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // List Kasbon
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFF59E0B)))
                : filtered.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 48),
                            SizedBox(height: 10),
                            Text('Tidak ada catatan kasbon yang belum lunas 🎉', style: TextStyle(color: Color(0xFF94A3B8))),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 4, 12, 80),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (ctx, idx) {
                          final d = filtered[idx];
                          final name = d['customer_name'] ?? d['name'] ?? 'Pelanggan Kasbon';
                          final phone = d['customer_phone'] ?? d['phone'] ?? '-';
                          final amount = d['total'] ?? d['debt_amount'] ?? 0;
                          final date = d['created_at'] != null ? DateTime.tryParse(d['created_at'].toString()) : null;

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
                                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.person_pin_circle_rounded, color: Color(0xFFF59E0B), size: 24),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(name, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                      const SizedBox(height: 2),
                                      Text('WA: $phone  ·  ${date != null ? DateFormat('dd/MM/yy').format(date) : '-'}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                      const SizedBox(height: 4),
                                      Text(_currency.format(amount), style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w900, fontSize: 14)),
                                    ],
                                  ),
                                ),
                                // 1-Click WhatsApp Tagih Button
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF25D366),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  icon: const Icon(Icons.chat, size: 16),
                                  label: const Text('Tagih WA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  onPressed: () => _sendWhatsAppReminder(d),
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
