import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.chat_rounded, color: Color(0xFF16A34A), size: 20),
            ),
            const SizedBox(width: 10),
            Text('Draf Tagihan WhatsApp', style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kirim ke: $name (${formattedPhone.isNotEmpty ? "+$formattedPhone" : "Belum ada nomor WA"})',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: SelectableText(
                messageText,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, height: 1.4),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup', style: TextStyle(color: AppColors.textSecondary)),
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
                  backgroundColor: AppColors.primary,
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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: AppColors.warningLight, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.credit_card, color: AppColors.warning, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Catat Kasbon Baru', style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(labelText: 'Nama Pelanggan *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(labelText: 'Nomor WhatsApp / HP *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                decoration: const InputDecoration(labelText: 'Nominal Hutang (Rp) *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: noteCtrl,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(labelText: 'Keterangan Barang / Catatan'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
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
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Kasbon pelanggan berhasil dicatat!'), backgroundColor: AppColors.primary));
            },
            child: const Text('Simpan Kasbon', style: TextStyle(fontWeight: FontWeight.bold)),
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
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Catat Kasbon', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: _showAddKasbonDialog,
      ),
      body: Column(
        children: [
          // Total Kasbon Header Banner
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TOTAL KASBON / PIUTANG BELUM LUNAS', style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(_currency.format(totalDebt), style: GoogleFonts.plusJakartaSans(color: AppColors.danger, fontSize: 22, fontWeight: FontWeight.w900)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: AppColors.warningLight, borderRadius: BorderRadius.circular(20)),
                  child: Text('${filtered.length} Catatan', style: const TextStyle(color: AppColors.warning, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
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
                  hintText: 'Cari nama atau nomor WhatsApp...',
                  prefixIcon: Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 20),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 11),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // List Kasbon
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : filtered.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle_outline, color: AppColors.primary, size: 48),
                            SizedBox(height: 10),
                            Text('Tidak ada catatan kasbon yang belum lunas 🎉', style: TextStyle(color: AppColors.textSecondary)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                        itemCount: filtered.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final d = filtered[idx];
                          final name = d['customer_name'] ?? d['name'] ?? 'Pelanggan Kasbon';
                          final phone = d['customer_phone'] ?? d['phone'] ?? '-';
                          final amount = d['total'] ?? d['debt_amount'] ?? 0;
                          final date = d['created_at'] != null ? DateTime.tryParse(d['created_at'].toString()) : null;

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: AppTheme.cardDecoration(),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.warningLight,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.person_pin_circle_rounded, color: AppColors.warning, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(name, style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                                      const SizedBox(height: 2),
                                      Text('WA: $phone  ·  ${date != null ? DateFormat('dd/MM/yy').format(date) : '-'}',
                                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5)),
                                      const SizedBox(height: 4),
                                      Text(_currency.format(amount),
                                          style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w900, fontSize: 14)),
                                    ],
                                  ),
                                ),
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
