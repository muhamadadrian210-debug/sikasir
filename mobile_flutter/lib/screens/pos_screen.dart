import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/pos_provider.dart';
import '../core/services/api_service.dart';
import '../core/services/local_cache_service.dart';
import '../core/services/receipt_printer_service.dart';
import '../core/widgets/heavy_duty_barcode_scanner_modal.dart';
import '../core/widgets/premium_notification.dart';
import '../core/widgets/modifier_selector_modal.dart';
import '../core/widgets/supervisor_void_modal.dart';
import '../core/widgets/customer_display_modal.dart';
import '../core/services/whatsapp_receipt_service.dart';
import '../core/theme/app_theme.dart';

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

  @override
  void dispose() {
    _paidController.dispose();
    _searchController.dispose();
    _kasbonNameController.dispose();
    _kasbonPhoneController.dispose();
    super.dispose();
  }

  void _holdCurrentBill() {
    final pos = context.read<PosProvider>();
    if (pos.cart.isEmpty) return;
    setState(() {
      _heldBills.add(List.from(pos.cart));
      pos.clearCart();
      _paidController.clear();
    });
    PremiumNotification.showInfo(
      context,
      title: 'HOLD BILL BERHASIL',
      message: 'Keranjang disimpan ke antrean Hold (${_heldBills.length} antrean).',
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
    PremiumNotification.showSuccess(
      context,
      title: 'ANTREAN DIMUAT',
      message: 'Keranjang transaksi sebelumnya berhasil dipulihkan!',
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
      PremiumNotification.showWarning(context, title: 'KERANJANG KOSONG', message: 'Silakan pilih produk sebelum checkout.');
      return;
    }

    if (_paymentMethod == 'KASBON') {
      if (_kasbonNameController.text.trim().isEmpty) {
        PremiumNotification.showAlertModal(
          context,
          title: 'Data Kasbon Diperlukan',
          message: 'Harap masukkan nama pelanggan kasbon untuk mencatat piutang dengan benar.',
          type: AlertType.warning,
        );
        return;
      }
      _paidAmount = total; // Kasbon di-cover penuh ke piutang
    } else if (_paymentMethod == 'QRIS') {
      _paidAmount = total; // QRIS pas sesuai nominal
    } else {
      if (_paidAmount < total) {
        PremiumNotification.showAlertModal(
          context,
          title: 'Uang Pembayaran Kurang',
          message: 'Nominal tunai diterima (${_currency.format(_paidAmount)}) masih kurang dari total belanja (${_currency.format(total)}).',
          type: AlertType.error,
        );
        return;
      }
    }

    final change = _paidAmount - total;
    final itemsPayload = pos.cart
        .map((it) => {
              'product_id': it.product.id,
              'name': it.product.name,
              'qty': it.qty,
              'sale_price': it.product.salePrice,
            })
        .toList();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
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
      if (res.statusCode == 200 || res.statusCode == 201) {
        if (res.data != null && res.data['transaction_id'] != null) {
          invoiceId = res.data['transaction_id'].toString();
        }
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
    Navigator.of(context).pop(); // Tutup loading dialog

    // Tampilkan Modal Sukses Transaksi Kembalian
    _showSuccessDialog(invoiceId, total, _paidAmount, change, itemsPayload);

    // Tampilkan notifikasi floating pill pembayaran selesai
    PremiumNotification.showPaymentSuccess(
      context,
      invoiceId: invoiceId,
      total: total,
      method: _paymentMethod,
    );

    pos.clearCart();
    _paidController.clear();
    _kasbonNameController.clear();
    _kasbonPhoneController.clear();
  }

  void _showSuccessDialog(String invoiceId, double total, double paid, double change, List<Map<String, dynamic>> items) {
    final pos = context.read<PosProvider>();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AnimatedSuccessCheckoutModal(
        invoiceId: invoiceId,
        total: total,
        paid: paid,
        change: change,
        items: items,
        onPrint: () {
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
        onWhatsApp: () {
          WhatsAppReceiptService.showSendReceiptDialog(
            context,
            storeName: 'SiKasir Store',
            transactionId: invoiceId,
            date: DateTime.now(),
            cashierName: 'Kasir',
            items: items,
            subtotal: total,
            discount: pos.autoPromoDiscount,
            tax: _applyPB1 ? total * 0.1 : 0,
            grandTotal: total,
            paymentMethod: _paymentMethod,
            tableName: pos.diningMode == 'Dine-in' ? pos.selectedTable : null,
            defaultPhone: _kasbonPhoneController.text.trim().isNotEmpty ? _kasbonPhoneController.text.trim() : null,
          );
        },
        onNewTransaction: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  void _openBarcodeScanner() {
    final pos = context.read<PosProvider>();
    HeavyDutyBarcodeScannerModal.show(context, (code) {
      _searchController.text = code;
      pos.setSearchQuery(code);
      final matches = pos.products.where((p) => p.barcode == code).toList();
      if (matches.isNotEmpty) {
        final item = matches.first;
        pos.addToCart(item);
        PremiumNotification.showScanSuccess(context, productName: item.name, price: item.salePrice);
      } else {
        PremiumNotification.showInfo(
          context,
          title: 'BARCODE TERDETEKSI',
          message: 'Kode SKU: $code (Belum ada di katalog)',
        );
      }
    });
  }

  void _showTablePicker(BuildContext context, PosProvider pos) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Pilih Nomor Meja Pelanggan', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: pos.availableTables.map((tbl) {
                final isSelected = pos.selectedTable == tbl;
                return ChoiceChip(
                  label: Text(tbl, style: TextStyle(color: isSelected ? Colors.white : AppColors.textPrimary, fontWeight: FontWeight.bold)),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.surfaceVariant,
                  onSelected: (val) {
                    if (val) {
                      pos.setSelectedTable(tbl);
                      Navigator.pop(ctx);
                    }
                  },
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isWideScreen = MediaQuery.of(context).size.width >= 900;
    final pos = context.watch<PosProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: isWideScreen ? _buildSplitLayout(pos) : _buildMobileLayout(pos),
      ),
    );
  }

  // Layout 2 Kolom untuk Tablet / PC Desktop
  Widget _buildSplitLayout(PosProvider pos) {
    return Row(
      children: [
        Expanded(flex: 6, child: _buildCatalogSection(pos)),
        Container(width: 1, color: AppColors.border),
        Expanded(flex: 4, child: _buildCartSection(pos)),
      ],
    );
  }

  // Layout 1 Kolom untuk HP Smartphone (Majoo Flow)
  Widget _buildMobileLayout(PosProvider pos) {
    return Column(
      children: [
        Expanded(child: _buildCatalogSection(pos)),
        if (pos.cart.isNotEmpty) _buildMobileBottomBar(pos),
      ],
    );
  }

  // Bagian Katalog Produk (Header, Kategori & Grid)
  Widget _buildCatalogSection(PosProvider pos) {
    final categories = pos.categories;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Top Bar: Search & Barcode Scan (Majoo Style)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: pos.setSearchQuery,
                    style: const TextStyle(fontSize: 13.5, color: AppColors.textPrimary, fontWeight: FontWeight.w500),
                    decoration: InputDecoration(
                      hintText: 'Cari produk atau scan barcode...',
                      hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                      prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.textMuted),
                              onPressed: () {
                                _searchController.clear();
                                pos.setSearchQuery('');
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Tombol Scan Barcode Kamera
              InkWell(
                onTap: _openBarcodeScanner,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary, size: 22),
                ),
              ),
              const SizedBox(width: 8),
              // Tombol Layar Pelanggan (CDS)
              InkWell(
                onTap: () => CustomerDisplayModal.show(context),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.tv_rounded, color: AppColors.primaryDark, size: 20),
                ),
              ),
              const SizedBox(width: 8),
              // Tombol Refresh Sinkronisasi
              InkWell(
                onTap: _loadProducts,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary, size: 20),
                ),
              ),
            ],
          ),
        ),

        // Table Management & Dining Mode Bar (Bungkus vs Makan di Tempat)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
          child: Row(
            children: [
              InkWell(
                onTap: () => pos.setDiningMode('Takeaway'),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: pos.diningMode == 'Takeaway' ? AppColors.textPrimary : AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: pos.diningMode == 'Takeaway' ? AppColors.textPrimary : AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.takeout_dining_rounded, size: 14, color: pos.diningMode == 'Takeaway' ? Colors.white : AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Text('Takeaway (Bungkus)', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: pos.diningMode == 'Takeaway' ? Colors.white : AppColors.textSecondary)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () {
                  pos.setDiningMode('Dine-in');
                  _showTablePicker(context, pos);
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: pos.diningMode == 'Dine-in' ? AppColors.primary : AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: pos.diningMode == 'Dine-in' ? AppColors.primary : AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.table_restaurant_rounded, size: 14, color: pos.diningMode == 'Dine-in' ? Colors.white : AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Text(pos.diningMode == 'Dine-in' ? 'Dine-in (${pos.selectedTable})' : 'Makan di Tempat', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: pos.diningMode == 'Dine-in' ? Colors.white : AppColors.textSecondary)),
                      if (pos.diningMode == 'Dine-in') ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_drop_down, size: 16, color: Colors.white),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Horizontal Category Pills (Majoo Feature)
        if (categories.length > 1)
          Container(
            height: 38,
            margin: const EdgeInsets.only(bottom: 8),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              separatorBuilder: (_, i) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final cat = categories[idx];
                final isSelected = pos.selectedCategory == cat;
                return InkWell(
                  onTap: () => pos.setSelectedCategory(cat),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.border,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.25),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Text(
                      cat,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textSecondary,
                        fontSize: 12.5,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

        // Products Catalog Grid
        Expanded(
          child: pos.isLoading
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: AppColors.primary),
                      SizedBox(height: 12),
                      Text('Memuat katalog produk toko...', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                )
              : pos.products.isEmpty
                  ? Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(18),
                              decoration: const BoxDecoration(
                                color: AppColors.primaryLight,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.inventory_2_outlined, color: AppColors.primary, size: 48),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'Produk Tidak Ditemukan',
                              style: GoogleFonts.plusJakartaSans(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Coba ubah kata kunci pencarian atau kategori.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.refresh_rounded, size: 18),
                              label: const Text('Tampilkan Semua'),
                              onPressed: () {
                                _searchController.clear();
                                pos.setSearchQuery('');
                                pos.setSelectedCategory('Semua');
                              },
                            ),
                          ],
                        ),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 190,
                        childAspectRatio: 0.78,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
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

  // Card Produk Majoo Style: Bersih, Avatar Berwarna, Badge Stok & Jumlah di Cart
  Widget _buildProductCard(Product p, PosProvider pos) {
    final isOut = p.stock <= 0;
    final inCartIdx = pos.cart.indexWhere((it) => it.product.id == p.id);
    final inCartQty = inCartIdx >= 0 ? pos.cart[inCartIdx].qty : 0;

    // Menentukan warna pastel avatar produk
    Color pastelBg = const Color(0xFFE0F2FE);
    Color pastelIcon = const Color(0xFF0284C7);
    if ((p.category ?? '').toLowerCase().contains('makan')) {
      pastelBg = const Color(0xFFFEF3C7);
      pastelIcon = const Color(0xFFD97706);
    } else if ((p.category ?? '').toLowerCase().contains('minum')) {
      pastelBg = const Color(0xFFDCFCE7);
      pastelIcon = const Color(0xFF059669);
    } else if ((p.category ?? '').toLowerCase().contains('snack')) {
      pastelBg = const Color(0xFFFFEDD5);
      pastelIcon = const Color(0xFFEA580C);
    }

    return InkWell(
      onTap: isOut
          ? null
          : () {
              if (p.availableModifiers.isNotEmpty) {
                ModifierSelectorModal.show(
                  context,
                  product: p,
                  onConfirm: (selectedMods, notes) {
                    pos.addToCart(p, modifiers: selectedMods, notes: notes);
                  },
                );
              } else {
                pos.addToCart(p);
              }
            },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: inCartQty > 0 ? AppColors.primary : AppColors.border,
            width: inCartQty > 0 ? 1.8 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar / Gambar Produk Placeholder
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: pastelBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          p.name.isNotEmpty ? p.name.substring(0, 1).toUpperCase() : 'P',
                          style: GoogleFonts.plusJakartaSans(
                            color: pastelIcon,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const Spacer(),
                  // Nama Produk
                  Text(
                    p.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Harga
                  Text(
                    _currency.format(p.salePrice),
                    style: const TextStyle(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.w900,
                      fontSize: 13.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Badge Stok
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isOut
                          ? AppColors.dangerLight
                          : (p.stock <= 5 ? AppColors.warningLight : AppColors.successLight),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      isOut ? 'Habis' : '${p.stock} pcs',
                      style: TextStyle(
                        color: isOut
                            ? AppColors.danger
                            : (p.stock <= 5 ? AppColors.warning : AppColors.primaryDark),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Badge Indikator jika produk sudah ada di keranjang
            if (inCartQty > 0)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    '$inCartQty',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // Floating Bottom Cart Bar untuk Mobile (Majoo Style)
  Widget _buildMobileBottomBar(PosProvider pos) {
    final subtotal = pos.totalAmount;
    final tax = _applyPB1 ? (subtotal * 0.10) : 0.0;
    final total = subtotal + tax;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Ringkasan Jumlah Barang & Total
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${pos.totalItemsCount} Barang',
                          style: const TextStyle(
                            color: AppColors.primaryDark,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      if (_heldBills.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Text(
                          '· Hold: ${_heldBills.length}',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _currency.format(total),
                    style: GoogleFonts.plusJakartaSans(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w900,
                      fontSize: 17,
                    ),
                  ),
                ],
              ),
            ),
            // Tombol Buka Sheet Checkout
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 1,
              ),
              onPressed: () => _openCartModal(pos),
              child: const Row(
                children: [
                  Text('Bayar Pesanan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                  SizedBox(width: 6),
                  Icon(Icons.arrow_forward_rounded, size: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openCartModal(PosProvider pos) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => FractionallySizedBox(
          heightFactor: 0.88,
          child: _buildCartSection(pos, isModal: true),
        ),
      ),
    );
  }

  // Cart Section (digunakan di Mobile Sheet & Tablet Split View)
  Widget _buildCartSection(PosProvider pos, {bool isModal = false}) {
    final subtotal = pos.totalAmount;
    final discount = pos.autoPromoDiscount;
    final taxable = (subtotal - discount).clamp(0.0, double.infinity);
    final tax = _applyPB1 ? (taxable * 0.10) : 0.0;
    final total = taxable + tax;
    final change = _paidAmount >= total ? _paidAmount - total : 0.0;
    final perPerson = _splitWays > 1 ? (total / _splitWays) : total;

    return Container(
      color: AppColors.surface,
      child: Column(
        children: [
          // Drag Handle jika modal
          if (isModal)
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

          // Header Cart
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.shopping_cart_outlined, color: AppColors.primary, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Keranjang (${pos.totalItemsCount})',
                      style: GoogleFonts.plusJakartaSans(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    // Tombol Hold Bill
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        side: const BorderSide(color: AppColors.secondary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.pause_circle_outline, size: 14, color: AppColors.secondary),
                      label: const Text('Hold', style: TextStyle(color: AppColors.secondary, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      onPressed: pos.cart.isEmpty ? null : _holdCurrentBill,
                    ),
                    const SizedBox(width: 6),
                    // Tombol Muat Antrean
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.surfaceVariant,
                        foregroundColor: AppColors.textPrimary,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.folder_open_outlined, size: 14, color: AppColors.textPrimary),
                      label: Text('Muat (${_heldBills.length})', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                      onPressed: _heldBills.isEmpty ? null : _loadHeldBill,
                    ),
                    if (pos.cart.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.danger, size: 20),
                        tooltip: 'Kosongkan (Void)',
                        onPressed: () {
                          SupervisorVoidModal.show(
                            context,
                            itemName: 'Seluruh Keranjang (${pos.totalItemsCount} item)',
                            voidAmount: total,
                            onAuthorized: () {
                              pos.logVoidAudit(
                                reason: 'Kosongkan seluruh keranjang oleh kasir',
                                cashierName: 'Kasir',
                                amount: total,
                                itemsSummary: '${pos.totalItemsCount} item dibatalkan',
                              );
                              pos.clearCart();
                              PremiumNotification.showPaymentCancelled(
                                context,
                                reason: 'Pesanan Dibatalkan Kasir',
                                amount: total,
                              );
                            },
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          if (discount > 0)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.successLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.stars_rounded, color: AppColors.primaryDark, size: 16),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      pos.activePromoName,
                      style: const TextStyle(color: AppColors.primaryDark, fontSize: 11.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          const Divider(color: AppColors.border),

          // Daftar Item Keranjang
          Expanded(
            child: pos.cart.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.remove_shopping_cart_outlined, size: 40, color: AppColors.textMuted),
                        SizedBox(height: 8),
                        Text(
                          'Keranjang masih kosong\nPilih produk dari katalog di samping',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    itemCount: pos.cart.length,
                    separatorBuilder: (_, i) => const Divider(color: AppColors.borderLight, height: 16),
                    itemBuilder: (context, idx) {
                      final it = pos.cart[idx];
                      return Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  it.product.name,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${_currency.format(it.unitPrice)} × ${it.qty} = ${_currency.format(it.subtotal)}',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                                ),
                                if (it.modifiersSummary.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    '✨ ${it.modifiersSummary}',
                                    style: const TextStyle(color: AppColors.primaryDark, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ],
                                if (it.notes != null && it.notes!.isNotEmpty) ...[
                                  const SizedBox(height: 1),
                                  Text(
                                    '📝 ${it.notes}',
                                    style: const TextStyle(color: AppColors.textMuted, fontSize: 10.5, fontStyle: FontStyle.italic),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          // Stepper Pengurang & Penambah QTY
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.surfaceVariant,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                InkWell(
                                  onTap: () {
                                    if (it.qty == 1) {
                                      SupervisorVoidModal.show(
                                        context,
                                        itemName: '${it.product.name} (1 pcs)',
                                        voidAmount: it.subtotal,
                                        onAuthorized: () {
                                          final voidName = it.product.name;
                                          final voidAmount = it.product.salePrice;
                                          pos.logVoidAudit(
                                            reason: 'Batal item dari keranjang',
                                            cashierName: 'Kasir',
                                            amount: it.subtotal,
                                            itemsSummary: '${it.product.name} dibatalkan',
                                          );
                                          pos.updateQty(idx, -1);
                                          PremiumNotification.showItemVoided(
                                            context,
                                            itemName: voidName,
                                            amount: voidAmount,
                                          );
                                        },
                                      );
                                    } else {
                                      pos.updateQty(idx, -1);
                                    }
                                  },
                                  borderRadius: BorderRadius.circular(8),
                                  child: const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: Icon(Icons.remove, size: 16, color: AppColors.textPrimary),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  child: Text(
                                    '${it.qty}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                                  ),
                                ),
                                InkWell(
                                  onTap: () => pos.updateQty(idx, 1),
                                  borderRadius: BorderRadius.circular(8),
                                  child: const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: Icon(Icons.add, size: 16, color: AppColors.primaryDark),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),
          const Divider(color: AppColors.border),

          // Area Pajak, Split Bill & Metode Pembayaran
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                // PB1 & Split Bill Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () => setState(() => _applyPB1 = !_applyPB1),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _applyPB1,
                              activeColor: AppColors.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              onChanged: (v) => setState(() => _applyPB1 = v ?? false),
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text('Pajak PB1 Resto (10%)', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        const Text('Split Bill:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        const SizedBox(width: 4),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.remove_circle_outline, size: 18, color: AppColors.textSecondary),
                          onPressed: _splitWays > 1 ? () => setState(() => _splitWays--) : null,
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text('$_splitWays Org', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.add_circle_outline, size: 18, color: AppColors.primary),
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
                      style: const TextStyle(color: AppColors.secondary, fontSize: 11.5, fontWeight: FontWeight.bold),
                    ),
                  ),

                const SizedBox(height: 8),
                // Total Amount Display
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Pembayaran', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 13)),
                      Text(
                        _currency.format(total),
                        style: GoogleFonts.plusJakartaSans(color: AppColors.primaryDark, fontWeight: FontWeight.w900, fontSize: 18),
                      ),
                    ],
                  ),
                ),
                if (discount > 0) ...[
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Diskon Promo Otomatis:', style: TextStyle(color: AppColors.primaryDark, fontSize: 12, fontWeight: FontWeight.bold)),
                      Text('-${_currency.format(discount)}', style: const TextStyle(color: AppColors.primaryDark, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
                const SizedBox(height: 10),

                // Tab Metode Pembayaran (Majoo Clean Selector)
                Row(
                  children: [
                    Expanded(child: _buildPaymentMethodTab('💵 Tunai', 'CASH')),
                    const SizedBox(width: 6),
                    Expanded(child: _buildPaymentMethodTab('📱 QRIS', 'QRIS')),
                    const SizedBox(width: 6),
                    Expanded(child: _buildPaymentMethodTab('💳 Kasbon', 'KASBON')),
                  ],
                ),
                const SizedBox(height: 10),

                // Form sesuai metode pembayaran yang dipilih
                if (_paymentMethod == 'CASH') ...[
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _paidController,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                          decoration: const InputDecoration(
                            labelText: 'Uang Diterima (Rp)',
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Wrap(
                        spacing: 4,
                        children: [
                          _buildQuickCashBtn('Pas', total),
                          _buildQuickCashBtn('50rb', 50000),
                          _buildQuickCashBtn('100rb', 100000),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Kembalian:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      Text(
                        _currency.format(change),
                        style: TextStyle(
                          color: change >= 0 ? AppColors.textPrimary : AppColors.danger,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ] else if (_paymentMethod == 'QRIS') ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.qr_code_2_rounded, size: 20, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text('QRIS Dinamis (Anti-Struk Palsu)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Kode Unik Verifikasi: #${100 + (DateTime.now().millisecond % 899)}',
                            style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w800, fontSize: 12),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Nominal pas terkunci: ${_currency.format(total)}',
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                        ),
                      ],
                    ),
                  ),
                ] else if (_paymentMethod == 'KASBON') ...[
                  TextField(
                    controller: _kasbonNameController,
                    style: const TextStyle(fontSize: 13),
                    decoration: const InputDecoration(
                      labelText: 'Nama Pelanggan Kasbon *',
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _kasbonPhoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(fontSize: 13),
                    decoration: const InputDecoration(
                      labelText: 'Nomor WhatsApp Pelanggan',
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.secondaryLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.qr_code_scanner_rounded, color: AppColors.secondary, size: 24),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Tunjukkan QRIS Dinamis ke pembeli. Sistem otomatis mencocokkan nominal.',
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 12),
                // Tombol Eksekusi Bayar
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: pos.cart.isEmpty ? null : _onCheckout,
                    child: Text(
                      _paymentMethod == 'KASBON'
                          ? 'CATAT KASBON (${_currency.format(total)})'
                          : 'BAYAR SEKARANG (${_currency.format(total)})',
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                  ),
                ),
              ],
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
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isSelected ? AppColors.primaryDark : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildQuickCashBtn(String label, double amount) {
    return InkWell(
      onTap: () {
        _paidController.text = amount.toStringAsFixed(0);
      },
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.border),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
        ),
      ),
    );
  }
}
