import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';

class ReceiptPrinterService {
  static final _currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  static Future<void> printReceipt({
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
