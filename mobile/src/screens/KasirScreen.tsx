import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { Product, CartItem } from '../types';
import { AiAssistantModal } from '../components/AiAssistantModal';

export function KasirScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (q: string = '') => {
    try {
      setLoading(true);
      const data = await apiService.getProducts(q);
      setProducts(data);
    } catch (e: any) {
      console.log('Load products error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    loadProducts(text);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert('Stok Habis', `Stok ${product.name} saat ini 0.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          Alert.alert('Stok Maksimal', `Stok ${product.name} hanya tersisa ${product.stock} pcs.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * product.sale_price }
            : item
        );
      }
      return [...prev, { product, qty: 1, subtotal: product.sale_price }];
    });
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              Alert.alert('Stok Maksimal', `Stok tersisa ${item.product.stock} pcs.`);
              return item;
            }
            return { ...item, qty: newQty, subtotal: newQty * item.product.sale_price };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleProcessCheckout = async () => {
    const paid = Number(paidAmount);
    if (isNaN(paid) || paid < totalAmount) {
      Alert.alert('Pembayaran Kurang', `Uang yang dibayarkan kurang dari total Rp ${totalAmount.toLocaleString('id-ID')}`);
      return;
    }

    try {
      setLoading(true);
      const res = await apiService.checkout(cart, paid);
      Alert.alert(
        'Transaksi Berhasil!',
        `Kembalian: Rp ${Number(res.change_amount || paid - totalAmount).toLocaleString('id-ID')}`,
        [
          {
            text: 'OK / Cetak Struk',
            onPress: () => {
              setCart([]);
              setPaidAmount('');
              setCheckoutModalVisible(false);
              loadProducts();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Gagal Transaksi', e.message || 'Terjadi kesalahan saat checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Mesin Kasir POS</Text>
          <Text style={styles.topBarSubtitle}>{cart.length} barang di keranjang</Text>
        </View>

        {/* Floating AI Button */}
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => setAiModalVisible(true)}
        >
          <MaterialCommunityIcons name="robot text" size={18} color="#000" />
          <Text style={styles.aiButtonText}>AI Assistant</Text>
        </TouchableOpacity>
      </View>

      {/* Main Search & Barcode Scan Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama barang atau scan barcode..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Content Area: Products List vs Cart */}
      <View style={styles.contentGrid}>
        {/* Left Column: Product Selection Grid */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionHeader}>Daftar Produk ({products.length})</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#00f2fe" style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.productCard, item.stock <= 0 && styles.productCardOutOfStock]}
                  onPress={() => addToCart(item)}
                >
                  <Text style={styles.prodName} numberOfLines={2}>{item.name}</Text>

                  <View style={styles.prodFooter}>
                    <Text style={styles.prodPrice}>Rp{item.sale_price.toLocaleString('id-ID')}</Text>
                    <Text style={[styles.prodStock, item.stock <= 0 && { color: '#ef4444' }]}>
                      {item.stock > 0 ? `${item.stock} pcs` : 'Habis'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Right / Bottom Column: Cart & Checkout Bar */}
        <View style={styles.cartSection}>
          <Text style={styles.sectionHeader}>Keranjang Belanja ({cart.length})</Text>

          <FlatList
            data={cart}
            keyExtractor={(item) => item.product.id.toString()}
            style={{ flex: 1 }}
            renderItem={({ item }) => (
              <View style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartProdName} numberOfLines={1}>{item.product.name}</Text>

                  <Text style={styles.cartProdPrice}>
                    Rp{item.product.sale_price.toLocaleString('id-ID')} × {item.qty}
                  </Text>
                </View>

                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQty(item.product.id, -1)}
                  >
                    <Ionicons name="remove" size={14} color="#ffffff" />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>{item.qty}</Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQty(item.product.id, 1)}
                  >
                    <Ionicons name="add" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cartSubtotal}>
                  Rp{item.subtotal.toLocaleString('id-ID')}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyCartText}>Keranjang belanjaan masih kosong.</Text>
            }
          />

          {/* Checkout Action Bar */}
          <View style={styles.checkoutBar}>
            <View>
              <Text style={styles.totalLabel}>Total Bayar:</Text>

              <Text style={styles.totalValue}>Rp{totalAmount.toLocaleString('id-ID')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, cart.length === 0 && styles.checkoutBtnDisabled]}
              disabled={cart.length === 0}
              onPress={() => setCheckoutModalVisible(true)}
            >
              <Text style={styles.checkoutBtnText}>BAYAR SEKARANG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Checkout Modal */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Proses Pembayaran</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Tagihan:</Text>
              <Text style={styles.summaryValue}>Rp {totalAmount.toLocaleString('id-ID')}</Text>
            </View>

            <Text style={styles.label}>Nominal Uang Diterima (Rp)</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Masukkan jumlah uang bayar..."
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={paidAmount}
              onChangeText={setPaidAmount}
            />

            <View style={styles.quickPayRow}>
              {[totalAmount, 50000, 100000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickPayChip}
                  onPress={() => setPaidAmount(amt.toString())}
                >
                  <Text style={styles.quickPayText}>Rp{amt.toLocaleString('id-ID')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCheckoutModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleProcessCheckout}
                disabled={loading}
              >
                <Text style={styles.confirmBtnText}>PROSES BAYAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating AI Assistant Modal */}
      <AiAssistantModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onDataUpdated={loadProducts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00f2fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#07090e',
  },
  searchRow: {
    padding: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  contentGrid: {
    flex: 1,
  },
  productsSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'space-between',
    minHeight: 84,
  },
  productCardOutOfStock: {
    opacity: 0.5,
  },
  prodName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  prodFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  prodPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00f2fe',
  },
  prodStock: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  cartSection: {
    maxHeight: 280,
    backgroundColor: '#0a0e17',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  cartProdName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  cartProdPrice: {
    fontSize: 11,
    color: '#94a3b8',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 8,
  },
  cartSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00f2fe',
  },
  emptyCartText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginVertical: 16,
  },
  checkoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  totalLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00f2fe',
  },
  checkoutBtn: {
    backgroundColor: '#00f2fe',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  checkoutBtnDisabled: {
    opacity: 0.4,
  },
  checkoutBtnText: {
    color: '#07090e',
    fontSize: 13,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#07090e',
    borderRadius: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00f2fe',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#07090e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    fontWeight: '700',
  },
  quickPayRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  quickPayChip: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickPayText: {
    fontSize: 11,
    color: '#00f2fe',
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00f2fe',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#07090e',
    fontWeight: '900',
  },
});
