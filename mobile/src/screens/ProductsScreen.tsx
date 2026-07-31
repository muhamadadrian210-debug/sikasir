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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { Product } from '../types';

export function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);

  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newSalePrice, setNewSalePrice] = useState('');
  const [newStock, setNewStock] = useState('');

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

  const handleRestock = async () => {
    if (!selectedProduct || !restockAmount) return;
    const delta = Number(restockAmount);
    if (isNaN(delta) || delta === 0) {
      Alert.alert('Peringatan', 'Jumlah restock harus berupa angka.');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateStock(selectedProduct.id, delta, 'Manual Restock Mobile');
      Alert.alert('Sukses', `Stok ${selectedProduct.name} berhasil diperbarui.`);
      setRestockModalVisible(false);
      setRestockAmount('');
      loadProducts();
    } catch (e: any) {
      Alert.alert('Gagal Restock', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newName.trim() || !newSalePrice) {
      Alert.alert('Peringatan', 'Nama produk dan Harga Jual wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      await apiService.addProduct({
        name: newName.trim(),
        barcode: newBarcode.trim(),
        purchase_price: Number(newPurchasePrice || 0),
        sale_price: Number(newSalePrice),
        stock: Number(newStock || 0),
      });

      Alert.alert('Sukses', 'Produk baru berhasil ditambahkan.');
      setAddProductModalVisible(false);
      setNewName('');
      setNewBarcode('');
      setNewPurchasePrice('');
      setNewSalePrice('');
      setNewStock('');
      loadProducts();
    } catch (e: any) {
      Alert.alert('Gagal Tambah Produk', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Manajemen Stok Produk</Text>
          <Text style={styles.topBarSubtitle}>Total {products.length} barang terdaftar</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddProductModalVisible(true)}
        >
          <Ionicons name="add" size={18} color="#07090e" />
          <Text style={styles.addBtnText}>Tambah Barang</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari produk / barcode..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={(txt) => {
            setSearchQuery(txt);
            loadProducts(txt);
          }}
        />
      </View>

      {/* Products List */}
      {loading ? (
        <ActivityIndicator size="large" color="#00f2fe" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{item.name}</Text>

                <Text style={styles.prodBarcode}>Barcode: {item.barcode || '-'}</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>
                    Modal: Rp{item.purchase_price.toLocaleString('id-ID')} | Jual: Rp{item.sale_price.toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>

              <View style={styles.rightSection}>
                <Text style={[styles.stockBadge, item.stock <= 0 && { color: '#ef4444' }]}>
                  Stok: {item.stock} pcs
                </Text>

                <TouchableOpacity
                  style={styles.restockBtn}
                  onPress={() => {
                    setSelectedProduct(item);
                    setRestockModalVisible(true);
                  }}
                >
                  <Text style={styles.restockBtnText}>Restock</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Restock Modal */}
      <Modal visible={restockModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restock {selectedProduct?.name}</Text>
            <Text style={styles.label}>Jumlah Tambah/Kurang Stok (Pcs)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: 10 (tambah) atau -2 (kurang)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={restockAmount}
              onChangeText={setRestockAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRestockModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleRestock}>
                <Text style={styles.confirmBtnText}>SIMPAN STOK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={addProductModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Produk Baru</Text>

            <Text style={styles.label}>Nama Produk *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Misal: Indomie Goreng"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.label}>Barcode / SKU (Opsional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="899123456..."
              placeholderTextColor="#64748b"
              value={newBarcode}
              onChangeText={setNewBarcode}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Harga Modal (Rp)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="2500"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newPurchasePrice}
                  onChangeText={setNewPurchasePrice}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Harga Jual (Rp) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="3000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newSalePrice}
                  onChangeText={setNewSalePrice}
                />
              </View>
            </View>

            <Text style={styles.label}>Stok Awal (Pcs)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="40"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={newStock}
              onChangeText={setNewStock}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddProductModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreateProduct}>
                <Text style={styles.confirmBtnText}>TAMBAH PRODUK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00f2fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#07090e',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    margin: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  prodBarcode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  priceRow: {
    marginTop: 4,
  },
  priceText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stockBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  restockBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  restockBtnText: {
    fontSize: 11,
    color: '#00f2fe',
    fontWeight: '700',
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
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#07090e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
