import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';

class WhatsAppReceiptService {
  static final NumberFormat _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  static String generateReceiptText({
    required String storeName,
    required String transactionId,
    required DateTime date,
    required String cashierName,
    required List<Map<String, dynamic>> items,
    required double subtotal,
    required double discount,
    required double tax,
    required double grandTotal,
    required String paymentMethod,
    String? tableName,
    String? verificationCode,
  }) {
    final dateStr = DateFormat('dd/MM/yyyy HH:mm').format(date);
    final sb = StringBuffer();

    sb.writeln('🧾 *STRUK PEMBELIAN RESMI*');
    sb.writeln('🏪 *$storeName*');
    sb.writeln('No. Transaksi: #$transactionId');
    sb.writeln('Waktu: $dateStr');
    sb.writeln('Kasir: $cashierName');
    if (tableName != null && tableName.trim().isNotEmpty && tableName != 'Takeaway') {
      sb.writeln('Meja / Lokasi: $tableName');
    }
    sb.writeln('----------------------------------------');

    for (final it in items) {
      final name = it['name'] ?? 'Item';
      final qty = it['qty'] ?? 1;
      final price = (it['price'] ?? 0).toDouble();
      final itemSubtotal = (it['subtotal'] ?? (qty * price)).toDouble();
      final mods = it['modifiers'] as List?;

      sb.writeln('$qty x $name  ${_currency.format(itemSubtotal)}');
      if (mods != null && mods.isNotEmpty) {
        sb.writeln('   └─ ${mods.join(', ')}');
      }
    }

    sb.writeln('----------------------------------------');
    sb.writeln('Subtotal: ${_currency.format(subtotal)}');

    if (discount > 0) {
      sb.writeln('Diskon Promo: -${_currency.format(discount)}');
    }
    if (tax > 0) {
      sb.writeln('Pajak PB1 (10%): ${_currency.format(tax)}');
    }

    sb.writeln('*TOTAL: ${_currency.format(grandTotal)}*');
    sb.writeln('Metode Bayar: ${paymentMethod.toUpperCase()} (LUNAS)');

    if (verificationCode != null && verificationCode.isNotEmpty) {
      sb.writeln('Kode Verifikasi: #$verificationCode');
    }

    sb.writeln('----------------------------------------');
    sb.writeln('Terima kasih atas kunjungan Anda! 🙏');
    sb.writeln('_Struk digital paperless resmi SiKasir POS._');

    return sb.toString();
  }

  static String _cleanPhoneNumber(String raw) {
    String clean = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean.startsWith('0')) {
      clean = '62${clean.substring(1)}';
    } else if (clean.startsWith('8')) {
      clean = '62$clean';
    }
    return clean;
  }

  static Future<void> sendDirectWhatsApp({
    required BuildContext context,
    required String rawPhone,
    required String message,
  }) async {
    final cleanPhone = _cleanPhoneNumber(rawPhone);
    if (cleanPhone.length < 9) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ Masukkan nomor WhatsApp yang valid (contoh: 08123456789)'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    final encodedText = Uri.encodeComponent(message);
    final waUrl = Uri.parse('https://wa.me/$cleanPhone?text=$encodedText');

    try {
      final launched = await launchUrl(waUrl, mode: LaunchMode.externalApplication);
      if (!launched) {
        // Fallback copy to clipboard
        await Clipboard.setData(ClipboardData(text: message));
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('📋 WhatsApp tidak dapat dibuka otomatis. Struk telah disalin ke clipboard!'),
              backgroundColor: AppColors.primary,
            ),
          );
        }
      }
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: message));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('📋 Struk digital disalin ke clipboard! Tempelkan di WhatsApp pelanggan.'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    }
  }

  static void showSendReceiptDialog(
    BuildContext context, {
    required String storeName,
    required String transactionId,
    required DateTime date,
    required String cashierName,
    required List<Map<String, dynamic>> items,
    required double subtotal,
    required double discount,
    required double tax,
    required double grandTotal,
    required String paymentMethod,
    String? tableName,
    String? defaultPhone,
    String? verificationCode,
  }) {
    final phoneCtrl = TextEditingController(text: defaultPhone ?? '');
    final receiptText = generateReceiptText(
      storeName: storeName,
      transactionId: transactionId,
      date: date,
      cashierName: cashierName,
      items: items,
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      grandTotal: grandTotal,
      paymentMethod: paymentMethod,
      tableName: tableName,
      verificationCode: verificationCode,
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.chat_rounded, color: Color(0xFF16A34A), size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kirim Struk WhatsApp',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  Text(
                    'Hemat Kertas (Paperless) Zero-Cost',
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
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'Nomor WhatsApp Pelanggan (08xx / 628xx)',
                  hintText: 'Contoh: 08123456789',
                  prefixIcon: const Icon(Icons.phone_android_rounded, size: 20, color: AppColors.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 14),

              const Text('Pratinjau Nota Digital:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),

              Container(
                constraints: const BoxConstraints(maxHeight: 180),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    receiptText,
                    style: const TextStyle(fontSize: 11.5, height: 1.4, fontFamily: 'monospace', color: AppColors.textPrimary),
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.textPrimary,
              side: const BorderSide(color: AppColors.border),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.copy_rounded, size: 16),
            label: const Text('Salin Teks', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: receiptText));
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('📋 Struk digital berhasil disalin ke clipboard!'),
                  backgroundColor: AppColors.primary,
                ),
              );
            },
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF25D366),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.send_rounded, size: 16),
            label: const Text('Kirim ke WA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            onPressed: () {
              final phone = phoneCtrl.text.trim();
              Navigator.pop(ctx);
              sendDirectWhatsApp(
                context: context,
                rawPhone: phone,
                message: receiptText,
              );
            },
          ),
        ],
      ),
    );
  }
}
