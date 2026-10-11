import 'package:flutter/material.dart';
import '../core/services/api_service.dart';

class ProductModifier {
  final String name;
  final double extraPrice;

  ProductModifier({required this.name, this.extraPrice = 0.0});

  Map<String, dynamic> toJson() => {
        'name': name,
        'extra_price': extraPrice,
      };

  factory ProductModifier.fromJson(Map<String, dynamic> json) => ProductModifier(
        name: json['name']?.toString() ?? '',
        extraPrice: (json['extra_price'] ?? 0).toDouble(),
      );
}

class Product {
  final int id;
  final String barcode;
  final String name;
  final double purchasePrice;
  final double salePrice;
  final int stock;
  final String? category;
  final List<ProductModifier> availableModifiers;

  Product({
    required this.id,
    required this.barcode,
    required this.name,
    required this.purchasePrice,
    required this.salePrice,
    required this.stock,
    this.category,
    this.availableModifiers = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final cat = json['category_name']?.toString();
    List<ProductModifier> mods = [];

    if (json['modifiers'] is List) {
      mods = (json['modifiers'] as List)
          .map((m) => ProductModifier.fromJson(m as Map<String, dynamic>))
          .toList();
    } else {
      // Smart Auto-Modifiers berdasarkan Kategori (Zero-Cost Intelligent Modifiers)
      final lowerCat = (cat ?? '').toLowerCase();
      final lowerName = (json['name'] ?? '').toString().toLowerCase();

      if (lowerCat.contains('minuman') || lowerCat.contains('kopi') || lowerCat.contains('beverage') || lowerName.contains('kopi') || lowerName.contains('tea') || lowerName.contains('teh') || lowerName.contains('jus')) {
        mods = [
          ProductModifier(name: 'Normal Ice', extraPrice: 0),
          ProductModifier(name: 'Less Ice', extraPrice: 0),
          ProductModifier(name: 'Less Sugar', extraPrice: 0),
          ProductModifier(name: 'Extra Shot Espresso', extraPrice: 4000),
          ProductModifier(name: 'Topping Boba / Jelly', extraPrice: 3000),
        ];
      } else if (lowerCat.contains('makanan') || lowerCat.contains('food') || lowerName.contains('mie') || lowerName.contains('nasi') || lowerName.contains('ayam') || lowerName.contains('burger')) {
        mods = [
          ProductModifier(name: 'Pedas Sedang', extraPrice: 0),
          ProductModifier(name: 'Ekstra Pedas', extraPrice: 0),
          ProductModifier(name: 'Tambah Telur', extraPrice: 3500),
          ProductModifier(name: 'Ekstra Sambal', extraPrice: 2000),
          ProductModifier(name: 'Tambah Keju Slice', extraPrice: 4000),
        ];
      }
    }

    return Product(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      barcode: json['barcode']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Produk',
      purchasePrice: (json['purchase_price'] ?? 0).toDouble(),
      salePrice: (json['sale_price'] ?? 0).toDouble(),
      stock: json['stock'] is int ? json['stock'] : int.tryParse(json['stock'].toString()) ?? 0,
      category: cat,
      availableModifiers: mods,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'barcode': barcode,
      'name': name,
      'purchase_price': purchasePrice,
      'sale_price': salePrice,
      'stock': stock,
      'category_name': category,
      'modifiers': availableModifiers.map((m) => m.toJson()).toList(),
    };
  }
}

class CartItem {
  final Product product;
  int qty;
  final List<ProductModifier> selectedModifiers;
  final String? notes;

  CartItem({
    required this.product,
    this.qty = 1,
    this.selectedModifiers = const [],
    this.notes,
  });

  double get modifierExtraTotal => selectedModifiers.fold(0.0, (sum, m) => sum + m.extraPrice);
  double get unitPrice => product.salePrice + modifierExtraTotal;
  double get subtotal => unitPrice * qty;

  String get modifiersSummary {
    if (selectedModifiers.isEmpty) return '';
    return selectedModifiers.map((m) => m.name + (m.extraPrice > 0 ? ' (+Rp ${m.extraPrice.toInt()})' : '')).join(', ');
  }
}

class PosProvider extends ChangeNotifier {
  final List<Product> _products = [];
  final List<CartItem> _cart = [];
  bool _isLoading = false;
  String _searchQuery = '';
  String _selectedCategory = 'Semua';

  // Table Management (Dine-in vs Takeaway)
  String _diningMode = 'Takeaway'; // 'Takeaway' | 'Dine-in'
  String _selectedTable = 'Meja 1';
  final List<String> availableTables = List.generate(16, (i) => 'Meja ${i + 1}');

  // PB1 Tax Toggle
  bool _isPb1Enabled = false;

  // Active Promo Name (Auto Promo Engine)
  String _activePromoName = '';

  String get selectedCategory => _selectedCategory;
  String get diningMode => _diningMode;
  String get selectedTable => _selectedTable;
  bool get isPb1Enabled => _isPb1Enabled;
  String get activePromoName => _activePromoName;

  List<String> get categories {
    final set = <String>{'Semua'};
    for (final p in _products) {
      if (p.category != null && p.category!.trim().isNotEmpty) {
        set.add(p.category!.trim());
      }
    }
    return set.toList();
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setDiningMode(String mode) {
    _diningMode = mode;
    notifyListeners();
    syncToCustomerDisplay();
  }

  void setSelectedTable(String table) {
    _selectedTable = table;
    notifyListeners();
    syncToCustomerDisplay();
  }

  void setPb1Enabled(bool val) {
    _isPb1Enabled = val;
    notifyListeners();
    syncToCustomerDisplay();
  }

  List<Product> get products => _products.where((p) {
        final matchesSearch = _searchQuery.isEmpty ||
            p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            p.barcode.contains(_searchQuery);
        final matchesCategory = _selectedCategory == 'Semua' ||
            (p.category != null &&
                p.category!.trim().toLowerCase() ==
                    _selectedCategory.toLowerCase());
        return matchesSearch && matchesCategory;
      }).toList();

  List<CartItem> get cart => _cart;
  bool get isLoading => _isLoading;
  double get totalAmount => _cart.fold(0.0, (sum, it) => sum + it.subtotal);
  int get totalItemsCount => _cart.fold(0, (sum, it) => sum + it.qty);

  // Auto Promo Engine (Anti-Fraud Rule-Based)
  double get autoPromoDiscount {
    if (_cart.isEmpty) {
      _activePromoName = '';
      return 0.0;
    }
    final rawTotal = totalAmount;

    // Rule 1: Belanja besar >= Rp 100.000 dapat diskon Rp 10.000
    if (rawTotal >= 100000) {
      _activePromoName = 'PROMO BELANJA HEMAT (-Rp 10.000)';
      return 10000.0;
    }
    // Rule 2: Kombo minimal 2 macam produk & subtotal >= Rp 45.000 dapat diskon Rp 5.000
    if (_cart.length >= 2 && rawTotal >= 45000) {
      _activePromoName = 'PROMO KOMBO HEMAT (-Rp 5.000)';
      return 5000.0;
    }
    _activePromoName = '';
    return 0.0;
  }

  double get pb1TaxAmount => _isPb1Enabled ? ((totalAmount - autoPromoDiscount).clamp(0.0, double.infinity) * 0.10) : 0.0;
  double get grandTotal => (totalAmount - autoPromoDiscount + pb1TaxAmount).clamp(0.0, double.infinity);

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setProducts(List<Product> prods) {
    _products.clear();
    _products.addAll(prods);
    notifyListeners();
  }

  void setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void addToCart(
    Product product, {
    List<ProductModifier> modifiers = const [],
    String? notes,
  }) {
    // Check if item with exact same product and exact same modifiers already exists
    final modNames = modifiers.map((m) => m.name).toSet();
    final idx = _cart.indexWhere((it) {
      if (it.product.id != product.id) return false;
      final existingMods = it.selectedModifiers.map((m) => m.name).toSet();
      return modNames.length == existingMods.length && modNames.containsAll(existingMods);
    });

    if (idx >= 0) {
      if (_cart[idx].qty < product.stock) {
        _cart[idx].qty += 1;
      }
    } else {
      if (product.stock > 0) {
        _cart.add(CartItem(
          product: product,
          qty: 1,
          selectedModifiers: modifiers,
          notes: notes,
        ));
      }
    }
    notifyListeners();
    syncToCustomerDisplay();
  }

  void updateQty(int index, int delta) {
    if (index >= 0 && index < _cart.length) {
      final item = _cart[index];
      final newQty = item.qty + delta;
      if (newQty <= 0) {
        _cart.removeAt(index);
      } else if (newQty <= item.product.stock) {
        item.qty = newQty;
      }
      notifyListeners();
      syncToCustomerDisplay();
    }
  }

  void removeFromCart(int index) {
    if (index >= 0 && index < _cart.length) {
      _cart.removeAt(index);
      notifyListeners();
      syncToCustomerDisplay();
    }
  }

  void clearCart() {
    _cart.clear();
    notifyListeners();
    syncToCustomerDisplay();
  }

  // Virtual Customer Display System (CDS) Broadcast (Zero-Cost Local Sync)
  Future<void> syncToCustomerDisplay({
    bool isPaying = false,
    String paymentMethod = 'CASH',
    String qrisPayload = '',
    String verificationCode = '',
    String storeName = 'SiKasir Store',
  }) async {
    try {
      final itemsData = _cart.map((it) => {
        'name': it.product.name,
        'price': it.unitPrice,
        'qty': it.qty,
        'subtotal': it.subtotal,
        'modifiers': it.selectedModifiers.map((m) => m.name).toList(),
      }).toList();

      await ApiService().post('/cds/update', data: {
        'store_name': storeName,
        'items': itemsData,
        'subtotal': totalAmount,
        'discount': autoPromoDiscount,
        'tax': pb1TaxAmount,
        'total': grandTotal,
        'table_number': _diningMode == 'Dine-in' ? _selectedTable : 'Takeaway',
        'is_paying': isPaying,
        'payment_method': paymentMethod,
        'qris_payload': qrisPayload,
        'verification_code': verificationCode,
      });
    } catch (_) {
      // Ignore network errors on local CDS sync
    }
  }

  // Anti-Fraud Void Audit Log
  Future<void> logVoidAudit({
    required String reason,
    required String cashierName,
    required double amount,
    required String itemsSummary,
    String supervisorPin = '1234',
  }) async {
    try {
      await ApiService().post('/transactions/void-log', data: {
        'reason': reason,
        'cashier_name': cashierName,
        'void_amount': amount,
        'items_summary': itemsSummary,
        'supervisor_pin': supervisorPin,
      });
    } catch (_) {}
  }
}
