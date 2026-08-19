import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../core/services/api_service.dart';
import '../core/widgets/heavy_duty_barcode_scanner_modal.dart';
import '../core/widgets/premium_notification.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  final ImagePicker _picker = ImagePicker();
  List<dynamic> _products = [];
  List<dynamic> _categories = [];
  bool _isLoading = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/products');
      final catRes = await ApiService().get('/categories');
      if (res.statusCode == 200) {
        setState(() {
          _products = res.data is List ? res.data : [];
          _categories = catRes.statusCode == 200 && catRes.data is List ? catRes.data : [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat produk: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /* ---------------- 4 METODE TAMBAH PRODUK (AI, BARCODE, FOTO, MANUAL) ---------------- */

  void _showAddMethodSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF111827),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: Color(0xFF1E293B)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.add_business_rounded, color: Color(0xFF10B981), size: 22),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tambah Produk Baru',
                          style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const Text(
                          'Pilih 1 dari 4 metode pendaftaran produk pintar',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // METODE 1: AI Prompt Magic
                _buildMethodTile(
                  icon: Icons.auto_awesome,
                  iconColor: const Color(0xFF38BDF8),
                  title: '✨ 1. Lewat AI Prompt Cerdas',
                  subtitle: 'Ketik bebas, AI otomatis ekstrak nama, harga & stok eceran/grosir',
                  badge: 'TERCEPAT',
                  badgeColor: const Color(0xFF38BDF8),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showAiAddProductDialog();
                  },
                ),
                const SizedBox(height: 8),

                // METODE 2: Scan Barcode Kamera / USB
                _buildMethodTile(
                  icon: Icons.qr_code_scanner_rounded,
                  iconColor: const Color(0xFF10B981),
                  title: '📷 2. Scan Barcode Kamera',
                  subtitle: 'Scan fisik barcode kemasan produk untuk isi otomatis',
                  badge: 'INSTAN',
                  badgeColor: const Color(0xFF10B981),
                  onTap: () {
                    Navigator.pop(ctx);
                    _openBarcodeScannerForAdd();
                  },
                ),
                const SizedBox(height: 8),

                // METODE 3: Foto Kamera / Galeri (AI Vision OCR)
                _buildMethodTile(
                  icon: Icons.camera_alt_rounded,
                  iconColor: const Color(0xFFF59E0B),
                  title: '🖼️ 3. Foto Produk (AI Vision OCR)',
                  subtitle: 'Ambil foto bungkus produk, AI mengenali nama & merek',
                  badge: 'AI VISION',
                  badgeColor: const Color(0xFFF59E0B),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickAndAnalyzeProductImage();
                  },
                ),
                const SizedBox(height: 8),

                // METODE 4: Input Manual
                _buildMethodTile(
                  icon: Icons.edit_note_rounded,
                  iconColor: const Color(0xFF94A3B8),
                  title: '✍️ 4. Form Manual',
                  subtitle: 'Input nama, harga modal, harga jual, dan stok secara manual',
                  badge: 'STANDAR',
                  badgeColor: const Color(0xFF64748B),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showAddEditProductModal();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMethodTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String badge,
    required Color badgeColor,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 22),
        ),
        title: Row(
          children: [
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13.5)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: badgeColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
              ),
              child: Text(badge, style: TextStyle(color: badgeColor, fontSize: 9, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        subtitle: Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5)),
        trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B), size: 20),
      ),
    );
  }

  /* --- METODE 1: AI Parse Dialog --- */
  void _showAiAddProductDialog() {
    final promptCtrl = TextEditingController();
    bool isAnalyzing = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF111827),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF1E293B)),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF38BDF8), Color(0xFF10B981)]),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              const Text('Tambah Produk Lewat AI', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ketik kalimat bebas, AI otomatis menerjemahkan harga grosir, modal & stok:',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: promptCtrl,
                maxLines: 3,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Contoh: Masuk rokok sampoerna 1 slop modal 280k jual 32k barcode 89923881',
                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF090D16),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                ),
              ),
              if (isAnalyzing) ...[
                const SizedBox(height: 14),
                const Row(
                  children: [
                    SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Color(0xFF38BDF8), strokeWidth: 2)),
                    SizedBox(width: 10),
                    Text('AI sedang mengekstrak data produk...', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12)),
                  ],
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: isAnalyzing ? null : () => Navigator.pop(ctx),
              child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF38BDF8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: isAnalyzing
                  ? null
                  : () async {
                      final prompt = promptCtrl.text.trim();
                      if (prompt.isEmpty) return;

                      setDialogState(() => isAnalyzing = true);
                      try {
                        final res = await ApiService().post('/ai/parse-product', data: {'prompt': prompt});
                        if (res.statusCode == 200 && res.data != null) {
                          if (ctx.mounted) Navigator.pop(ctx);
                          _showAddEditProductModal({
                            'name': res.data['name'] ?? '',
                            'barcode': res.data['barcode'] ?? '',
                            'purchase_price': res.data['purchase_price'] ?? 0,
                            'sale_price': res.data['sale_price'] ?? 0,
                            'stock': res.data['stock'] ?? 0,
                          });
                        } else {
                          throw Exception(res.data?['error'] ?? 'Gagal memproses AI');
                        }
                      } catch (e) {
                        setDialogState(() => isAnalyzing = false);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('AI Error: $e'), backgroundColor: Colors.red));
                        }
                      }
                    },
              child: const Text('Ekstrak & Isi Form', style: TextStyle(color: Color(0xFF090D16), fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  /* --- METODE 2: Scan Barcode Kamera --- */
  void _openBarcodeScannerForAdd() {
    HeavyDutyBarcodeScannerModal.show(context, (code) {
      Navigator.pop(context);
      _showAddEditProductModal({
        'barcode': code,
        'name': '',
        'purchase_price': 0,
        'sale_price': 0,
        'stock': 0,
      });
    });
  }

  /* --- METODE 3: AI Vision OCR Foto Produk --- */
  Future<void> _pickAndAnalyzeProductImage() async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera, maxWidth: 1024, maxHeight: 1024, imageQuality: 80);
    if (photo == null) return;

    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const AlertDialog(
        backgroundColor: Color(0xFF111827),
        content: Row(
          children: [
            CircularProgressIndicator(color: Color(0xFFF59E0B)),
            SizedBox(width: 16),
            Text('AI Vision menganalisis kemasan...', style: TextStyle(color: Colors.white, fontSize: 13)),
          ],
        ),
      ),
    );

    try {
      final bytes = await photo.readAsBytes();
      final formData = FormData.fromMap({
        'image': MultipartFile.fromBytes(bytes, filename: photo.name),
      });

      final res = await ApiService().post('/ai/analyze-product-image', data: formData);
      if (mounted) Navigator.pop(context); // pop loading dialog

      if (res.statusCode == 200 && res.data != null) {
        _showAddEditProductModal({
          'name': res.data['name'] ?? '',
          'barcode': res.data['barcode'] ?? '',
          'purchase_price': 0,
          'sale_price': 0,
          'stock': 0,
        });
      } else {
        throw Exception('Gagal menganalisis gambar');
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('AI Vision Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  /* --- METODE 4 & EDIT FORM MODAL --- */
  void _showAddEditProductModal([dynamic product]) {
    final nameCtrl = TextEditingController(text: product?['name'] ?? '');
    final barcodeCtrl = TextEditingController(text: product?['barcode'] ?? '');
    final buyPriceCtrl = TextEditingController(text: (product?['purchase_price'] ?? '').toString());
    final sellPriceCtrl = TextEditingController(text: (product?['sale_price'] ?? '').toString());
    final stockCtrl = TextEditingController(text: (product?['stock'] ?? '0').toString());
    int? selectedCategory = product?['category_id'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          backgroundColor: const Color(0xFF111827),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
          title: Row(
            children: [
              Icon(product == null ? Icons.add_box_rounded : Icons.edit_note_rounded, color: const Color(0xFF10B981), size: 22),
              const SizedBox(width: 10),
              Text(
                product == null ? 'Tambah Produk Baru' : 'Edit Produk',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Nama Produk *',
                    labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                    hintText: 'Contoh: Minyak Goreng Bimoli 2L',
                    hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: barcodeCtrl,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          labelText: 'Barcode / SKU',
                          labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                          hintText: 'Kosongkan jika auto',
                          hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF10B981)),
                      tooltip: 'Scan Barcode Kamera',
                      onPressed: () {
                        HeavyDutyBarcodeScannerModal.show(ctx, (scannedCode) {
                          setModalState(() => barcodeCtrl.text = scannedCode);
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<int>(
                  initialValue: selectedCategory,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: 'Kategori', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                  items: _categories.map<DropdownMenuItem<int>>((c) {
                    return DropdownMenuItem<int>(
                      value: c['id'],
                      child: Text(c['name'] ?? ''),
                    );
                  }).toList(),
                  onChanged: (val) => setModalState(() => selectedCategory = val),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: buyPriceCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(labelText: 'Harga Modal (HPP)', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: sellPriceCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(labelText: 'Harga Jual *', labelStyle: TextStyle(color: Color(0xFF10B981))),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: stockCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: 'Jumlah Stok (Pcs) *', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                final name = nameCtrl.text.trim();
                final sellPrice = double.tryParse(sellPriceCtrl.text) ?? 0;
                if (name.isEmpty || sellPrice <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nama dan Harga Jual wajib diisi!')));
                  return;
                }

                final payload = {
                  'name': name,
                  'barcode': barcodeCtrl.text.trim(),
                  'purchase_price': double.tryParse(buyPriceCtrl.text) ?? 0,
                  'sale_price': sellPrice,
                  'stock': int.tryParse(stockCtrl.text) ?? 0,
                  'category_id': selectedCategory,
                };

                try {
                  if (product == null || product['id'] == null) {
                    await ApiService().post('/products', data: payload);
                  } else {
                    await ApiService().put('/products/${product['id']}', data: payload);
                  }
                  if (ctx.mounted) {
                    Navigator.of(ctx).pop();
                    _fetchData();
                    PremiumNotification.showSuccess(
                      context,
                      title: 'PRODUK TERSIMPAN',
                      message: 'Data barang "${payload['name']}" berhasil diperbarui ke database!',
                    );
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    PremiumNotification.showAlertModal(
                      ctx,
                      title: 'Gagal Menyimpan Produk',
                      message: 'Terjadi kesalahan sistem: $e',
                      type: AlertType.error,
                    );
                  }
                }
              },
              child: const Text('Simpan Produk', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _products.where((p) {
      final q = _searchQuery.toLowerCase();
      final name = (p['name'] ?? '').toString().toLowerCase();
      final barcode = (p['barcode'] ?? '').toString().toLowerCase();
      return name.contains(q) || barcode.contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: const Text('Manajemen Produk & Stok', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchData,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF10B981),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Tambah Produk (4 Cara)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: _showAddMethodSelector,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: '🔍 Cari nama barang / barcode...',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFF111827),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
                : filtered.isEmpty
                    ? const Center(child: Text('Belum ada data produk', style: TextStyle(color: Color(0xFF64748B))))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 4, 12, 80),
                        itemCount: filtered.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 8),
                        itemBuilder: (ctx, idx) {
                          final p = filtered[idx];
                          final stock = p['stock'] ?? 0;
                          return Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF111827),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFF1E293B)),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        p['name'] ?? '',
                                        style: GoogleFonts.plusJakartaSans(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Barcode: ${p['barcode'] ?? '-'} | HPP: ${_currency.format(p['purchase_price'] ?? 0)}',
                                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _currency.format(p['sale_price'] ?? 0),
                                        style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w800, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: stock <= 5 ? const Color(0xFF7F1D1D).withValues(alpha: 0.3) : const Color(0xFF064E3B),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: stock <= 5 ? const Color(0xFFEF4444) : const Color(0xFF10B981)),
                                  ),
                                  child: Text(
                                    'Stok: $stock',
                                    style: TextStyle(
                                      color: stock <= 5 ? const Color(0xFFFCA5A5) : const Color(0xFF34D399),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, color: Colors.white70, size: 20),
                                  onPressed: () => _showAddEditProductModal(p),
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
