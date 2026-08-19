import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/pos_provider.dart';
import '../core/services/api_service.dart';
import '../core/services/local_cache_service.dart';
import '../core/services/receipt_printer_service.dart';
import '../core/widgets/heavy_duty_barcode_scanner_modal.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  final TextEditingController _paidController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _kasbonNameController = TextEditingController();
  final TextEditingController _kasbonPhoneController = TextEditingController();
  
  double _paidAmount = 0;
  String _paymentMethod = 'CASH'; // CASH, QRIS, KASBON
  bool _applyPB1 = false;
  int _splitWays = 1;
  final List<List<CartItem>> _heldBills = [];

  @override
  void initState() {
    super.initState();
    _loadProducts();
    _paidController.addListener(() {
      setState(() {
        _paidAmount = double.tryParse(_paidController.text.replaceAll(RegExp(r'\D'), '')) ?? 0;
      });
    });
  }

  void _holdCurrentBill() {
    final pos = context.read<PosProvider>();
    if (pos.cart.isEmpty) return;
    setState(() {
      _heldBills.add(List.from(pos.cart));
      pos.clearCart();
      _paidController.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('⏸️ Tagihan disimpan ke antrean Hold (${_heldBills.length} antrean).')),
    );
  }

  void _loadHeldBill() {
    if (_heldBills.isEmpty) return;
    final pos = context.read<PosProvider>();
    setState(() {
      final restored = _heldBills.removeLast();
      pos.clearCart();
      for (final item in restored) {
        pos.addToCart(item.product);
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('📂 Antrean tagihan berhasil dimuat kembali!')),
    );
  }

  Future<void> _loadProducts() async {
    final pos = context.read<PosProvider>();
    pos.setLoading(true);

    try {
      final res = await ApiService().get('/products');
      if (res.statusCode == 200 && res.data is List) {
        final list = (res.data as List).map((e) => Product.fromJson(e)).toList();
        pos.setProducts(list);
        await LocalCacheService.saveProducts((res.data as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {
      // Fallback offline cache
      final cached = await LocalCacheService.getCachedProducts();
      if (cached.isNotEmpty) {
        final list = cached.map((e) => Product.fromJson(e)).toList();
        pos.setProducts(list);
      }
    } finally {
      pos.setLoading(false);
    }
  }

  void _onCheckout() async {
    final pos = context.read<PosProvider>();
    final subtotal = pos.totalAmount;
    final tax = _applyPB1 ? (subtotal * 0.10) : 0.0;
    final total = subtotal + tax;

    if (pos.cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Keranjang belanja kosong!')));
      return;
    }

    if (_paymentMethod == 'KASBON') {
      if (_kasbonNameController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nama pelanggan kasbon wajib diisi!')));
        return;
      }
      _paidAmount = total; // Kasbon di-cover penuh ke akun hutang
    } else if (_paymentMethod == 'QRIS') {
      _paidAmount = total; // QRIS pas sesuai nominal
    } else {
      if (_paidAmount < total) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uang pembayaran tunai masih kurang!')));
        return;
      }
    }

    final change = _paidAmount - total;
    final itemsPayload = pos.cart.map((it) => {
      'product_id': it.product.id,
      'name': it.product.name,
      'qty': it.qty,
      'sale_price': it.product.salePrice,
    }).toList();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: Color(0xFF10B981))),
    );

    String invoiceId = 'TRX-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';

    try {
      final res = await ApiService().post('/transactions/checkout', data: {
        'items': itemsPayload,
        'paid': _paidAmount,
        'payment_method': _paymentMethod.toLowerCase(),
        'customer_name': _kasbonNameController.text.trim(),
        'customer_phone': _kasbonPhoneController.text.trim(),
        'tax_amount': tax,
      });
      if (res.statusCode == 200 && res.data != null && res.data['transaction_id'] != null) {
        invoiceId = res.data['transaction_id'].toString();
      }
    } catch (_) {
      await LocalCacheService.queueOfflineTransaction({
        'invoice_id': invoiceId,
        'items': itemsPayload,
        'paid': _paidAmount,
        'total': total,
        'change': change,
        'payment_method': _paymentMethod,
      });
    }

    if (!mounted) return;
    Navigator.of(context).pop(); // Tutup loading

    // Tampilkan Modal Sukses Transaksi Kembalian
    _showSuccessDialog(invoiceId, total, _paidAmount, change, itemsPayload);

    pos.clearCart();
    _paidController.clear();
    _kasbonNameController.clear();
    _kasbonPhoneController.clear();
  }

  void _showSuccessDialog(String invoiceId, double total, double paid, double change, List<Map<String, dynamic>> items) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: const Color(0xFF111827),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF10B981), width: 2),
                ),
                child: const Icon(Icons.check, color: Color(0xFF10B981), size: 32),
              ),
              const SizedBox(height: 12),
              const Text(
                'Transaksi Sukses!',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
              ),
              Text(
                'Invoice #$invoiceId',
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF090D16),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  children: [
                    const Text(
                      'UANG KEMBALIAN',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _currency.format(change),
                      style: const TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const Divider(color: Color(0xFF1E293B), height: 16),
                    Text(
                      'Total: ${_currency.format(total)}  ·  Bayar: ${_currency.format(paid)}',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.print, size: 18),
                  label: const Text('Cetak Struk Thermal (58mm)', style: TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () {
                    ReceiptPrinterService.printReceipt(
                      storeName: 'SiKasir POS',
                      invoiceId: invoiceId,
                      cashierName: 'Kasir',
                      time: DateTime.now(),
                      items: items,
                      total: total,
                      paid: paid,
                      change: change,
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF334155)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Transaksi Baru'),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isWideScreen = MediaQuery.of(context).size.width >= 900;
    final pos = context.watch<PosProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: const Row(
          children: [
            Text('SiKasir POS', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white)),
            SizedBox(width: 8),
            Chip(
              label: Text('OFFLINE READY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
              backgroundColor: Color(0xFF064E3B),
              padding: EdgeInsets.zero,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: Color(0xFF10B981)),
            onPressed: () {
              HeavyDutyBarcodeScannerModal.show(context, (code) {
                _searchController.text = code;
                pos.setSearchQuery(code);
                // Jika produk persis ditemukan, auto tambahkan ke cart
                final matches = pos.products.where((p) => p.barcode == code).toList();
                if (matches.isNotEmpty) {
                  pos.addToCart(matches.first);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('✅ Ditambahkan: ${matches.first.name}'),
                      backgroundColor: const Color(0xFF064E3B),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                }
              });
            },
            tooltip: 'AI Barcode Scanner',
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _loadProducts,
            tooltip: 'Sinkronkan Data Produk',
          ),
        ],
      ),
      body: isWideScreen ? _buildSplitLayout(pos) : _buildMobileLayout(pos),
    );
  }

  // Layout 2 Kolom untuk Tablet / PC Desktop
  Widget _buildSplitLayout(PosProvider pos) {
    return Row(
      children: [
        Expanded(flex: 6, child: _buildCatalogSection(pos)),
        Container(width: 1, color: const Color(0xFF1E293B)),
        Expanded(flex: 4, child: _buildCartSection(pos)),
      ],
    );
  }

  // Layout 1 Kolom untuk HP Smartphone
  Widget _buildMobileLayout(PosProvider pos) {
    return Column(
      children: [
        Expanded(child: _buildCatalogSection(pos)),
        _buildMobileBottomCart(pos),
      ],
    );
  }

  Widget _buildCatalogSection(PosProvider pos) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  onChanged: pos.setSearchQuery,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: '🔍 Cari barang atau scan barcode...',
                    hintStyle: const TextStyle(color: Color(0xFF64748B)),
                    filled: true,
                    fillColor: const Color(0xFF111827),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () {
                  HeavyDutyBarcodeScannerModal.show(context, (code) {
                    _searchController.text = code;
                    pos.setSearchQuery(code);
                    final matches = pos.products.where((p) => p.barcode == code).toList();
                    if (matches.isNotEmpty) {
                      pos.addToCart(matches.first);
                    }
                  });
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF10B981)),
                  ),
                  child: const Icon(Icons.camera_alt, color: Color(0xFF10B981), size: 22),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: pos.isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
              : pos.products.isEmpty
                  ? const Center(child: Text('Tidak ada produk.', style: TextStyle(color: Color(0xFF64748B))))
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 180,
                        childAspectRatio: 0.88,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                      itemCount: pos.products.length,
                      itemBuilder: (context, idx) {
                        final p = pos.products[idx];
                        return _buildProductCard(p, pos);
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildProductCard(Product p, PosProvider pos) {
    final isOut = p.stock <= 0;

    return InkWell(
      onTap: isOut ? null : () => pos.addToCart(p),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFF1A2234),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              p.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _currency.format(p.salePrice),
                  style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.w900, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  isOut ? 'Habis' : '${p.stock} pcs',
                  style: TextStyle(
                    color: isOut ? const Color(0xFFEF4444) : (p.stock > 5 ? const Color(0xFF10B981) : const Color(0xFFF59E0B)),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartSection(PosProvider pos) {
    final subtotal = pos.totalAmount;
    final tax = _applyPB1 ? (subtotal * 0.10) : 0.0;
    final total = subtotal + tax;
    final change = _paidAmount >= total ? _paidAmount - total : 0.0;
    final perPerson = _splitWays > 1 ? (total / _splitWays) : total;

    return Container(
      color: const Color(0xFF111827),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Cart + Hold/Load Bill Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('🛒 Keranjang Kasir', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              Row(
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      side: const BorderSide(color: Color(0xFF38BDF8)),
                    ),
                    icon: const Icon(Icons.pause, size: 14, color: Color(0xFF38BDF8)),
                    label: const Text('Hold', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11)),
                    onPressed: pos.cart.isEmpty ? null : _holdCurrentBill,
                  ),
                  const SizedBox(width: 6),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    ),
                    icon: const Icon(Icons.folder_open, size: 14, color: Colors.white),
                    label: Text('Muat (${_heldBills.length})', style: const TextStyle(color: Colors.white, fontSize: 11)),
                    onPressed: _heldBills.isEmpty ? null : _loadHeldBill,
                  ),
                  if (pos.cart.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    IconButton(
                      icon: const Icon(Icons.delete_sweep, color: Color(0xFFEF4444), size: 20),
                      onPressed: pos.clearCart,
                      tooltip: 'Kosongkan Keranjang',
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Items List
          Expanded(
            child: pos.cart.isEmpty
                ? const Center(child: Text('Keranjang masih kosong\nSentuh produk di katalog untuk menambahkan', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B), fontSize: 12)))
                : ListView.separated(
                    itemCount: pos.cart.length,
                    separatorBuilder: (context, index) => const Divider(color: Color(0xFF1E293B), height: 8),
                    itemBuilder: (context, idx) {
                      final it = pos.cart[idx];
                      return Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(it.product.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                Text('${it.qty} x ${_currency.format(it.product.salePrice)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF94A3B8), size: 20),
                                onPressed: () => pos.updateQty(idx, -1),
                              ),
                              Text('${it.qty}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: Color(0xFF10B981), size: 20),
                                onPressed: () => pos.updateQty(idx, 1),
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
          ),
          const Divider(color: Color(0xFF1E293B)),

          // PB1 Pajak & Split Bill Controls
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(8)),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () => setState(() => _applyPB1 = !_applyPB1),
                      child: Row(
                        children: [
                          Checkbox(
                            value: _applyPB1,
                            activeColor: const Color(0xFF10B981),
                            onChanged: (v) => setState(() => _applyPB1 = v ?? false),
                          ),
                          const Text('Pajak PB1 Resto (10%)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                        ],
                      ),
                    ),
                    Text(_currency.format(tax), style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('👥 Split Bill (Bagi Bon):', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    Row(
                      children: [
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.remove, color: Colors.white70, size: 16),
                          onPressed: _splitWays > 1 ? () => setState(() => _splitWays--) : null,
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: Text('$_splitWays Orang', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.add, color: Colors.white70, size: 16),
                          onPressed: () => setState(() => _splitWays++),
                        ),
                      ],
                    ),
                  ],
                ),
                if (_splitWays > 1)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Bayar per orang: ${_currency.format(perPerson)}',
                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Total Display
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Tagihan', style: TextStyle(color: Colors.white70, fontSize: 13)),
              Text(_currency.format(total), style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 18)),
            ],
          ),
          const SizedBox(height: 8),

          // Metode Pembayaran Selector
          Row(
            children: [
              Expanded(
                child: _buildPaymentMethodTab('💵 Tunai', 'CASH'),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: _buildPaymentMethodTab('📱 QRIS', 'QRIS'),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: _buildPaymentMethodTab('💳 Kasbon', 'KASBON'),
              ),
            ],
          ),
          const SizedBox(height: 8),

          if (_paymentMethod == 'KASBON') ...[
            TextField(
              controller: _kasbonNameController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: const InputDecoration(
                labelText: 'Nama Pelanggan Kasbon *',
                labelStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                filled: true,
                fillColor: Color(0xFF090D16),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _kasbonPhoneController,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: const InputDecoration(
                labelText: 'No WhatsApp / HP Pelanggan',
                labelStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                filled: true,
                fillColor: Color(0xFF090D16),
                border: OutlineInputBorder(),
              ),
            ),
          ] else if (_paymentMethod == 'CASH') ...[
            TextField(
              controller: _paidController,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
              decoration: InputDecoration(
                labelText: 'Nominal Tunai Diterima (Rp)',
                labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                filled: true,
                fillColor: const Color(0xFF090D16),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              ),
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              children: [
                _buildQuickCashBtn('Uang Pas', total),
                _buildQuickCashBtn('50rb', 50000),
                _buildQuickCashBtn('100rb', 100000),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Kembalian:', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Text(_currency.format(change), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
              ],
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(8)),
              child: const Row(
                children: [
                  Icon(Icons.qr_code_2_rounded, color: Color(0xFF38BDF8), size: 28),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text('Tunjukkan QRIS Dinamis Toko kepada pembeli. Sistem otomatis mencocokkan nominal.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: pos.cart.isEmpty ? null : _onCheckout,
              child: Text(
                _paymentMethod == 'KASBON' ? 'CATAT SEBAGAI KASBON' : 'PROSES BAYAR',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodTab(String label, String method) {
    final isSelected = _paymentMethod == method;
    return InkWell(
      onTap: () => setState(() => _paymentMethod = method),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF10B981).withValues(alpha: 0.2) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? const Color(0xFF10B981) : const Color(0xFF1E293B)),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isSelected ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildQuickCashBtn(String label, double amount) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 11, color: Colors.white)),
      backgroundColor: const Color(0xFF1A2234),
      side: const BorderSide(color: Color(0xFF1E293B)),
      onPressed: () {
        _paidController.text = amount.toStringAsFixed(0);
      },
    );
  }

  Widget _buildMobileBottomCart(PosProvider pos) {
    final total = pos.totalAmount;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: Color(0xFF111827),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${pos.totalItemsCount} Barang di Keranjang', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              Text(_currency.format(total), style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 16)),
            ],
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: pos.cart.isEmpty
                ? null
                : () {
                    showModalBottomSheet(
                      context: context,
                      backgroundColor: const Color(0xFF111827),
                      isScrollControlled: true,
                      builder: (ctx) => SizedBox(
                        height: MediaQuery.of(context).size.height * 0.75,
                        child: _buildCartSection(pos),
                      ),
                    );
                  },
            child: const Text('Lihat & Bayar', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
