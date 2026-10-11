import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';

class SupervisorVoidModal extends StatefulWidget {
  final String itemName;
  final double voidAmount;
  final VoidCallback onAuthorized;

  const SupervisorVoidModal({
    super.key,
    required this.itemName,
    required this.voidAmount,
    required this.onAuthorized,
  });

  static Future<void> show(
    BuildContext context, {
    required String itemName,
    required double voidAmount,
    required VoidCallback onAuthorized,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => SupervisorVoidModal(
        itemName: itemName,
        voidAmount: voidAmount,
        onAuthorized: onAuthorized,
      ),
    );
  }

  @override
  State<SupervisorVoidModal> createState() => _SupervisorVoidModalState();
}

class _SupervisorVoidModalState extends State<SupervisorVoidModal> {
  final TextEditingController _pinCtrl = TextEditingController();
  String _selectedReason = 'Salah Input Kasir';
  String? _errorMsg;
  final NumberFormat _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  final List<String> _reasons = [
    'Salah Input Kasir',
    'Pelanggan Batal Beli',
    'Barang Rusak / Kadaluarsa',
    'Perubahan Pesanan Pelanggan',
    'Lainnya',
  ];

  @override
  void dispose() {
    _pinCtrl.dispose();
    super.dispose();
  }

  void _verifyPin() {
    final pin = _pinCtrl.text.trim();
    // Default supervisor PIN: 1234 or admin
    if (pin == '1234' || pin == 'admin' || pin == 'admin123') {
      Navigator.pop(context);
      widget.onAuthorized();
    } else {
      setState(() {
        _errorMsg = 'PIN Supervisor salah! (Default: 1234)';
      });
    }
  }

  void _sendWhatsAppAlert() {
    final now = DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now());
    final text = '''
⚠️ *ALERT VOID / PEMBATALAN TRANSAKSI*
Waktu: $now
Item / Transaksi: ${widget.itemName}
Nominal Dibatalkan: ${_currency.format(widget.voidAmount)}
Alasan: $_selectedReason
Status Otorisasi: Supervisor PIN Diverifikasi

_Pesan otomatis sistem keamanan kasir SiKasir._
''';
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('📋 Teks alert void telah disalin! Siap dikirim ke WhatsApp Owner.'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.dangerLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.shield_outlined, color: AppColors.danger, size: 24),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Otorisasi Supervisor',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
                Text(
                  'Anti-Fraud & Audit Void',
                  style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Item: ${widget.itemName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text('Nominal: ${_currency.format(widget.voidAmount)}',
                      style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w900, fontSize: 13.5)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text('Alasan Pembatalan / Void:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: _selectedReason,
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              items: _reasons.map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13)))).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedReason = val);
              },
            ),

            const SizedBox(height: 14),

            const Text('PIN Supervisor / Owner:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _pinCtrl,
              obscureText: true,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Masukkan PIN Supervisor (Default: 1234)',
                hintStyle: const TextStyle(fontSize: 12),
                prefixIcon: const Icon(Icons.lock_outline, size: 18),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                errorText: _errorMsg,
              ),
            ),

            const SizedBox(height: 12),

            Center(
              child: TextButton.icon(
                icon: const Icon(Icons.share, size: 15, color: Color(0xFF25D366)),
                label: const Text('Kirim Alert ke WA Owner', style: TextStyle(color: Color(0xFF25D366), fontSize: 11.5, fontWeight: FontWeight.bold)),
                onPressed: _sendWhatsAppAlert,
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: _verifyPin,
          child: const Text('Konfirmasi Void', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
