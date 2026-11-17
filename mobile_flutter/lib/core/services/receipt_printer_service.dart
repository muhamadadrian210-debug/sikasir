import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../theme/app_theme.dart';

class ReceiptPrinterService {
  static final _currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  /**
   * Cetak struk POS langsung via Bluetooth thermal printer bawaan (ESC/POS).
   * Nol aplikasi pihak ketiga. Jika bluetooth tidak aktif/batal, fallback ke pratinjau PDF sistem.
   */
  static Future<void> printReceipt({
    BuildContext? context,
    required String storeName,
    required String invoiceId,
    required String cashierName,
    required DateTime time,
    required List<Map<String, dynamic>> items,
    required double total,
    required double paid,
    required double change,
  }) async {
    // 1. Coba cetak langsung via Bluetooth Thermal bawaan APK
    final bool btSuccess = await _tryPrintBluetooth(
      context: context,
      storeName: storeName,
      invoiceId: invoiceId,
      cashierName: cashierName,
      time: time,
      items: items,
      total: total,
      paid: paid,
      change: change,
    );

    if (btSuccess) {
      if (context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Struk berhasil dicetak ke printer Bluetooth!'),
            backgroundColor: AppColors.primary,
            duration: Duration(seconds: 2),
          ),
        );
      }
      return;
    }

    // 2. Fallback: Buka dialog cetak / spooler PDF bawaan Android
    await _printViaSystemPdf(
      storeName: storeName,
      invoiceId: invoiceId,
      cashierName: cashierName,
      time: time,
      items: items,
      total: total,
      paid: paid,
      change: change,
    );
  }

  static Future<bool> _tryPrintBluetooth({
    BuildContext? context,
    required String storeName,
    required String invoiceId,
    required String cashierName,
    required DateTime time,
    required List<Map<String, dynamic>> items,
    required double total,
    required double paid,
    required double change,
  }) async {
    try {
      final bool isGranted = await PrintBluetoothThermal.isPermissionBluetoothGranted;
      if (!isGranted) {
        return false;
      }

      final bool isEnabled = await PrintBluetoothThermal.bluetoothEnabled;
      if (!isEnabled) {
        return false;
      }

      bool isConnected = await PrintBluetoothThermal.connectionStatus;
      final prefs = await SharedPreferences.getInstance();

      // Jika belum terhubung, coba sambungkan ke printer yang tersimpan
      if (!isConnected) {
        final String? savedMac = prefs.getString('sikasir_bt_printer_mac');
        if (savedMac != null && savedMac.isNotEmpty) {
          isConnected = await PrintBluetoothThermal.connect(macPrinterAddress: savedMac);
        }

        // Jika belum terhubung dan ada konteks UI, tampilkan dialog pemilihan printer
        if (!isConnected && context != null && context.mounted) {
          final List<BluetoothInfo> devices = await PrintBluetoothThermal.pairedBluetooths;
          if (devices.isNotEmpty) {
            final BluetoothInfo? selected = await showModalBottomSheet<BluetoothInfo>(
              context: context,
              backgroundColor: Colors.white,
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
              builder: (bCtx) => _buildPrinterPickerSheet(bCtx, devices),
            );

            if (selected != null) {
              isConnected = await PrintBluetoothThermal.connect(macPrinterAddress: selected.macAdress);
              if (isConnected) {
                await prefs.setString('sikasir_bt_printer_mac', selected.macAdress);
                await prefs.setString('sikasir_bt_printer_name', selected.name);
              }
            }
          }
        }
      }

      if (isConnected) {
        final List<int> bytes = _buildEscPosBytes(
          storeName: storeName,
          invoiceId: invoiceId,
          cashierName: cashierName,
          time: time,
          items: items,
          total: total,
          paid: paid,
          change: change,
        );
        final bool printed = await PrintBluetoothThermal.writeBytes(bytes);
        return printed;
      }
    } catch (e) {
      debugPrint('[ReceiptPrinterService] Bluetooth thermal error: $e');
    }
    return false;
  }

  static Widget _buildPrinterPickerSheet(BuildContext context, List<BluetoothInfo> devices) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.bluetooth_connected_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pilih Printer Kasir',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                    ),
                    Text(
                      'Pilih perangkat Bluetooth untuk cetak struk langsung',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 260),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: devices.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (ctx, index) {
                final d = devices[index];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                  leading: const Icon(Icons.print_rounded, color: AppColors.primary),
                  title: Text(
                    d.name.isNotEmpty ? d.name : 'Printer Thermal',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: Text(d.macAdress, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                  onTap: () => Navigator.pop(ctx, d),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Batal / Gunakan Dialog Sistem'),
            ),
          ),
        ],
      ),
    );
  }

  static List<int> _buildEscPosBytes({
    required String storeName,
    required String invoiceId,
    required String cashierName,
    required DateTime time,
    required List<Map<String, dynamic>> items,
    required double total,
    required double paid,
    required double change,
  }) {
    List<int> bytes = [];

    // ESC @ : Inisialisasi printer
    bytes.addAll([0x1B, 0x40]);

    // Rata Tengah (ESC a 1)
    bytes.addAll([0x1B, 0x61, 0x01]);

    // Bold On + Judul Toko
    bytes.addAll([0x1B, 0x45, 0x01]);
    bytes.addAll(utf8.encode('${storeName.toUpperCase()}\n'));
    bytes.addAll([0x1B, 0x45, 0x00]);

    bytes.addAll(utf8.encode('Struk Pembelian Resmi\n'));
    bytes.addAll(utf8.encode('No: #$invoiceId\n'));
    bytes.addAll(utf8.encode('${DateFormat('dd/MM/yyyy HH:mm').format(time)}\n'));
    bytes.addAll(utf8.encode('Kasir: $cashierName\n'));

    // Rata Kiri (ESC a 0)
    bytes.addAll([0x1B, 0x61, 0x00]);
    bytes.addAll(utf8.encode('--------------------------------\n'));

    // Items
    for (final it in items) {
      final name = it['name'] ?? 'Item';
      final qty = it['qty'] ?? 1;
      final price = (it['sale_price'] ?? 0).toDouble();
      final subtotal = qty * price;

      bytes.addAll(utf8.encode('$name\n'));
      final lineCalc = '$qty x ${_currencyFormat.format(price)}';
      final lineSub = _currencyFormat.format(subtotal);
      final spaces = 32 - lineCalc.length - lineSub.length;
      final padding = spaces > 0 ? ' ' * spaces : ' ';
      bytes.addAll(utf8.encode('$lineCalc$padding$lineSub\n'));
    }

    bytes.addAll(utf8.encode('--------------------------------\n'));

    // Total
    final totalStr = _currencyFormat.format(total);
    final totalSpaces = 32 - 5 - totalStr.length;
    bytes.addAll([0x1B, 0x45, 0x01]); // Bold
    bytes.addAll(utf8.encode('TOTAL${totalSpaces > 0 ? ' ' * totalSpaces : ' '}$totalStr\n'));
    bytes.addAll([0x1B, 0x45, 0x00]);

    // Bayar
    final paidStr = _currencyFormat.format(paid);
    final paidSpaces = 32 - 5 - paidStr.length;
    bytes.addAll(utf8.encode('Bayar${paidSpaces > 0 ? ' ' * paidSpaces : ' '}$paidStr\n'));

    // Kembali
    final changeStr = _currencyFormat.format(change);
    final changeSpaces = 32 - 7 - changeStr.length;
    bytes.addAll(utf8.encode('Kembali${changeSpaces > 0 ? ' ' * changeSpaces : ' '}$changeStr\n'));

    bytes.addAll(utf8.encode('================================\n'));

    // Footer (Rata Tengah)
    bytes.addAll([0x1B, 0x61, 0x01]);
    bytes.addAll(utf8.encode('Terima Kasih Telah Berbelanja!\n'));
    bytes.addAll(utf8.encode('SiKasir by Sivilize Corp\n\n\n\n'));

    // Autocut (GS V 66 0)
    bytes.addAll([0x1D, 0x56, 0x42, 0x00]);

    return bytes;
  }

  static Future<void> _printViaSystemPdf({
    required String storeName,
    required String invoiceId,
    required String cashierName,
    required DateTime time,
    required List<Map<String, dynamic>> items,
    required double total,
    required double paid,
    required double change,
  }) async {
    final pdf = pw.Document();
    final roll58 = PdfPageFormat(58 * PdfPageFormat.mm, double.infinity, marginAll: 4 * PdfPageFormat.mm);

    pdf.addPage(
      pw.Page(
        pageFormat: roll58,
        margin: const pw.EdgeInsets.all(4),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                storeName.toUpperCase(),
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13),
              ),
              pw.SizedBox(height: 2),
              pw.Text('SiKasir POS System', style: const pw.TextStyle(fontSize: 8)),
              pw.SizedBox(height: 4),
              pw.Text('Invoice: #$invoiceId', style: const pw.TextStyle(fontSize: 8)),
              pw.Text(DateFormat('dd/MM/yyyy HH:mm').format(time), style: const pw.TextStyle(fontSize: 8)),
              pw.Text('Kasir: $cashierName', style: const pw.TextStyle(fontSize: 8)),
              pw.Divider(thickness: 0.5, borderStyle: pw.BorderStyle.dashed),

              // Items
              pw.ListView.builder(
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final it = items[index];
                  final name = it['name'] ?? 'Item';
                  final qty = it['qty'] ?? 1;
                  final price = (it['sale_price'] ?? 0).toDouble();
                  final subtotal = qty * price;

                  return pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 2),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(name, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('$qty x ${_currencyFormat.format(price)}', style: const pw.TextStyle(fontSize: 8)),
                            pw.Text(_currencyFormat.format(subtotal), style: const pw.TextStyle(fontSize: 8)),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),

              pw.Divider(thickness: 0.5, borderStyle: pw.BorderStyle.dashed),

              // Totals
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Total:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                  pw.Text(_currencyFormat.format(total), style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                ],
              ),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Bayar:', style: const pw.TextStyle(fontSize: 8)),
                  pw.Text(_currencyFormat.format(paid), style: const pw.TextStyle(fontSize: 8)),
                ],
              ),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Kembali:', style: const pw.TextStyle(fontSize: 8)),
                  pw.Text(_currencyFormat.format(change), style: const pw.TextStyle(fontSize: 8)),
                ],
              ),

              pw.SizedBox(height: 8),
              pw.Text('Terima Kasih Telah Berbelanja!', style: pw.TextStyle(fontSize: 7, fontStyle: pw.FontStyle.italic)),
              pw.Text('Powered by Sivilize Corp', style: const pw.TextStyle(fontSize: 6, color: PdfColors.grey700)),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}
