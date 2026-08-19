import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalCacheService {
  static const String _productsKey = 'cached_products_offline';
  static const String _pendingTxKey = 'offline_pending_transactions';

  // 1. Simpan dan Ambil Produk Offline
  static Future<void> saveProducts(List<Map<String, dynamic>> products) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_productsKey, jsonEncode(products));
  }

  static Future<List<Map<String, dynamic>>> getCachedProducts() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_productsKey);
    if (data == null || data.isEmpty) return [];
    try {
      final List decoded = jsonDecode(data);
      return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (_) {
      return [];
    }
  }

  // 2. Queue Transaksi Saat Offline (Background Sync Queue)
  static Future<void> queueOfflineTransaction(Map<String, dynamic> txData) async {
    final prefs = await SharedPreferences.getInstance();
    List<Map<String, dynamic>> pending = await getPendingTransactions();
    pending.add({
      ...txData,
      'queued_at': DateTime.now().toIso8601String(),
    });
    await prefs.setString(_pendingTxKey, jsonEncode(pending));
  }

  static Future<List<Map<String, dynamic>>> getPendingTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_pendingTxKey);
    if (data == null || data.isEmpty) return [];
    try {
      final List decoded = jsonDecode(data);
      return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> clearPendingTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingTxKey);
  }
}
