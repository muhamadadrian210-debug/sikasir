import 'package:flutter/material.dart';

class Product {
  final int id;
  final String barcode;
  final String name;
  final double purchasePrice;
  final double salePrice;
  final int stock;
  final String? category;

  Product({
    required this.id,
    required this.barcode,
    required this.name,
    required this.purchasePrice,
    required this.salePrice,
    required this.stock,
    this.category,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      barcode: json['barcode']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Produk',
      purchasePrice: (json['purchase_price'] ?? 0).toDouble(),
      salePrice: (json['sale_price'] ?? 0).toDouble(),
      stock: json['stock'] is int ? json['stock'] : int.tryParse(json['stock'].toString()) ?? 0,
      category: json['category_name']?.toString(),
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
    };
  }
}

class CartItem {
  final Product product;
  int qty;

  CartItem({required this.product, this.qty = 1});

  double get subtotal => product.salePrice * qty;
}

class PosProvider extends ChangeNotifier {
  final List<Product> _products = [];
  final List<CartItem> _cart = [];
  bool _isLoading = false;
  String _searchQuery = '';

  List<Product> get products => _searchQuery.isEmpty
      ? _products
      : _products.where((p) =>
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.barcode.contains(_searchQuery)).toList();

  List<CartItem> get cart => _cart;
  bool get isLoading => _isLoading;
  double get totalAmount => _cart.fold(0, (sum, it) => sum + it.subtotal);
  int get totalItemsCount => _cart.fold(0, (sum, it) => sum + it.qty);

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

  void addToCart(Product product) {
    final idx = _cart.indexWhere((it) => it.product.id == product.id);
    if (idx >= 0) {
      if (_cart[idx].qty < product.stock) {
        _cart[idx].qty += 1;
      }
    } else {
      if (product.stock > 0) {
        _cart.add(CartItem(product: product, qty: 1));
      }
    }
    notifyListeners();
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
    }
  }

  void removeFromCart(int index) {
    if (index >= 0 && index < _cart.length) {
      _cart.removeAt(index);
      notifyListeners();
    }
  }

  void clearCart() {
    _cart.clear();
    notifyListeners();
  }
}
