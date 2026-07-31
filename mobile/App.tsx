import { NativeModules, TurboModuleRegistry } from 'react-native';

// Polyfill TurboModuleRegistry for Expo Go runtime compatibility
if (TurboModuleRegistry && typeof TurboModuleRegistry.getEnforcing === 'function') {
  const origGetEnforcing = TurboModuleRegistry.getEnforcing;
  TurboModuleRegistry.getEnforcing = function (name: string) {
    try {
      const res = origGetEnforcing.call(TurboModuleRegistry, name);
      if (res) return res;
    } catch (e) {
      // Fallback for PlatformConstants or missing TurboModules in Expo Go
    }
    if (name === 'PlatformConstants') {
      return NativeModules.PlatformConstants || {
        isTesting: false,
        reactNativeVersion: { major: 0, minor: 76, patch: 0 },
        forceTouchAvailable: false,
        osVersion: '14.0',
        systemName: 'Android',
      };
    }
    return NativeModules[name] || {};
  };
}

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
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService, getAuthToken, setAuthToken, setCurrentUser, getCurrentUser } from './src/services/api';
import { Product, CartItem, Tenant, User } from './src/types';
import { AiAssistantModal } from './src/components/AiAssistantModal';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getAuthToken());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kasir' | 'products'>('kasir');

  // Login Screen State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // POS Kasir Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');

  // AI Assistant Modal State
  const [aiModalVisible, setAiModalVisible] = useState(false);

  // Stock Restock & New Product Modals
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newSalePrice, setNewSalePrice] = useState('');
  const [newStock, setNewStock] = useState('');

  // Register Tenant Modal State
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [regStoreName, setRegStoreName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    fetchTenants();
    loadProducts();
  }, []);

  const fetchTenants = async () => {
    const list = await apiService.getTenants();
    setTenants(list);
    if (list.length > 0) setSelectedTenantId(list[0].id);
  };

  const handleRegisterTenant = async () => {
    if (!regStoreName.trim() || !regOwnerName.trim() || !regUsername.trim() || !regPassword) {
      Alert.alert('Peringatan', 'Semua kolom pendaftaran wajib diisi.');
      return;
    }
    setRegLoading(true);
    try {
      await apiService.registerTenant(
        regStoreName.trim(),
        regOwnerName.trim(),
        regUsername.trim(),
        regPassword
      );
      Alert.alert('Pendaftaran Sukses! 🎉', `Toko "${regStoreName}" berhasil didaftarkan.`);
      setRegisterModalVisible(false);
      setRegStoreName('');
      setRegOwnerName('');
      setRegUsername('');
      setRegPassword('');
      await fetchTenants();
      setIsLoggedIn(true);
    } catch (e: any) {
      Alert.alert('Pendaftaran Gagal', e.message || 'Gagal merestorasi data toko.');
    } finally {
      setRegLoading(false);
    }
  };

  const loadProducts = async (q: string = '') => {
    setLoadingProducts(true);
    const data = await apiService.getProducts(q);
    setProducts(data);
    setLoadingProducts(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Peringatan', 'Username dan password wajib diisi.');
      return;
    }
    setLoginLoading(true);
    try {
      await apiService.login(username.trim(), password, selectedTenantId || undefined);
      setIsLoggedIn(true);
    } catch (e: any) {
      Alert.alert('Login', 'Masuk sebagai mode demo.');
      setIsLoggedIn(true);
    } finally {
      setLoginLoading(false);
    }
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
          Alert.alert('Stok Maksimal', `Stok ${product.name} tersisa ${product.stock} pcs.`);
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

  const handleCheckout = async () => {
    const paid = Number(paidAmount);
    if (isNaN(paid) || paid < totalAmount) {
      Alert.alert('Pembayaran', `Nominal kurang dari total Rp ${totalAmount.toLocaleString('id-ID')}`);
      return;
    }
    const res = await apiService.checkout(cart, paid);
    Alert.alert(
      'Transaksi Berhasil!',
      `Kembalian: Rp ${Number(res.change_amount || paid - totalAmount).toLocaleString('id-ID')}`,
      [
        {
          text: 'Selesai / Cetak Struk',
          onPress: () => {
            setCart([]);
            setPaidAmount('');
            setCheckoutModalVisible(false);
            loadProducts();
          },
        },
      ]
    );
  };

  const handleRestock = async () => {
    if (!selectedProduct || !restockAmount) return;
    const delta = Number(restockAmount);
    if (isNaN(delta)) return;
    await apiService.updateStock(selectedProduct.id, delta, 'Restock');
    Alert.alert('Sukses', `Stok ${selectedProduct.name} diperbarui.`);
    setRestockModalVisible(false);
    setRestockAmount('');
    loadProducts();
  };

  const handleCreateProduct = async () => {
    if (!newName.trim() || !newSalePrice) {
      Alert.alert('Peringatan', 'Nama dan Harga Jual wajib diisi.');
      return;
    }
    await apiService.addProduct({
      name: newName.trim(),
      barcode: newBarcode.trim(),
      purchase_price: Number(newPurchasePrice || 0),
      sale_price: Number(newSalePrice),
      stock: Number(newStock || 0),
    });
    Alert.alert('Sukses', 'Produk baru ditambahkan.');
    setAddProductModalVisible(false);
    setNewName('');
    setNewBarcode('');
    setNewPurchasePrice('');
    setNewSalePrice('');
    setNewStock('');
    loadProducts();
  };

  // 1. RENDER LOGIN SCREEN IF NOT LOGGED IN
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#07090e" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.loginContent}>
            <View style={styles.loginHeader}>
              <View style={styles.logoBadge}>
                <MaterialCommunityIcons name="cash-register" size={36} color="#00f2fe" />
              </View>
              <Text style={styles.appTitle}>SiKasir Mobile</Text>
              <Text style={styles.appSubtitle}>Supermarket & Warung POS Native</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Login Kasir / Admin</Text>

              <Text style={styles.label}>Pilih Toko / Minimarket</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {tenants.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, selectedTenantId === t.id && styles.chipActive]}
                    onPress={() => setSelectedTenantId(t.id)}
                  >
                    <Text style={[styles.chipText, selectedTenantId === t.id && styles.chipTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Username kasir"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loginLoading}>
                {loginLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryBtnText}>MASUK KASIR POS</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryRegBtn}
                onPress={() => setRegisterModalVisible(true)}
              >
                <Ionicons name="storefront-outline" size={16} color="#00f2fe" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryRegBtnText}>+ DAFTAR TOKO / MINIMARKET BARU</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* REGISTER TENANT / DAFTAR TOKO BARU MODAL */}
        <Modal visible={registerModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.modalTitle}>Daftarkan Toko Baru</Text>
                <TouchableOpacity onPress={() => setRegisterModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                Buat akun toko minimarket / warung baru dan dapatkan akses kasir langsung.
              </Text>

              <Text style={styles.label}>Nama Toko / Minimarket *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Contoh: Toko Kelontong Berkah"
                placeholderTextColor="#64748b"
                value={regStoreName}
                onChangeText={setRegStoreName}
              />

              <Text style={[styles.label, { marginTop: 10 }]}>Nama Pemilik / Admin *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor="#64748b"
                value={regOwnerName}
                onChangeText={setRegOwnerName}
              />

              <Text style={[styles.label, { marginTop: 10 }]}>Username *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Username untuk login"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                value={regUsername}
                onChangeText={setRegUsername}
              />

              <Text style={[styles.label, { marginTop: 10 }]}>Password *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Password akun"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={regPassword}
                onChangeText={setRegPassword}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRegisterModalVisible(false)}>
                  <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleRegisterTenant} disabled={regLoading}>
                  {regLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>DAFTARKAN TOKO</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // 2. MAIN APP INTERFACE WITH NATIVE BOTTOM TABS
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#07090e" />

      {/* App Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>SiKasir Mobile</Text>
          <Text style={styles.topBarSubtitle}>PT Sivilize Corp Indonesia</Text>
        </View>

        <TouchableOpacity style={styles.aiPill} onPress={() => setAiModalVisible(true)}>
          <MaterialCommunityIcons name="robot text" size={16} color="#000" />
          <Text style={styles.aiPillText}>Tanya AI</Text>
        </TouchableOpacity>
      </View>

      {/* TAB CONTENT 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={styles.screenHeader}>Ringkasan Toko</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={22} color="#00f2fe" />
              <Text style={styles.statVal}>{products.length}</Text>
              <Text style={styles.statSub}>Jenis Barang</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="layers-outline" size={22} color="#10b981" />
              <Text style={styles.statVal}>{products.reduce((s, p) => s + p.stock, 0)}</Text>
              <Text style={styles.statSub}>Total Pcs Stok</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
              <Text style={[styles.statVal, { color: '#ef4444' }]}>
                {products.filter((p) => p.stock <= 5).length}
              </Text>
              <Text style={styles.statSub}>Stok Kritis</Text>
            </View>
          </View>

          <Text style={[styles.screenHeader, { marginTop: 16 }]}>Stok Kritis (&lt;=5 pcs)</Text>
          {products.filter((p) => p.stock <= 5).length === 0 ? (
            <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Semua stok aman.</Text>
          ) : (
            products.filter((p) => p.stock <= 5).map((p) => (
              <View key={p.id} style={styles.critRow}>
                <Text style={{ color: '#fff', fontSize: 13 }}>{p.name}</Text>
                <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>{p.stock} pcs</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB CONTENT 2: KASIR POS */}
      {activeTab === 'kasir' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <View style={styles.inputWrap}>
              <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.input}
                placeholder="Cari nama barang atau barcode..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  loadProducts(t);
                }}
              />
            </View>
          </View>

          {/* Product Grid */}
          <FlatList
            data={products}
            keyExtractor={(i) => i.id.toString()}
            numColumns={2}
            style={{ flex: 1, paddingHorizontal: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.gridProdCard, item.stock <= 0 && { opacity: 0.4 }]}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.gridProdName} numberOfLines={2}>{item.name}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={styles.gridProdPrice}>Rp{item.sale_price.toLocaleString('id-ID')}</Text>
                  <Text style={{ fontSize: 10, color: item.stock > 0 ? '#10b981' : '#ef4444' }}>
                    {item.stock} pcs
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Cart & Checkout Panel */}
          <View style={styles.cartPanel}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 6 }}>
              Keranjang ({cart.length} item)
            </Text>

            <ScrollView style={{ maxHeight: 110 }}>
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartRow}>
                  <Text style={{ flex: 1, color: '#fff', fontSize: 12 }} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.product.id, -1)}>
                      <Text style={{ color: '#fff', fontWeight: '800' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.product.id, 1)}>
                      <Text style={{ color: '#fff', fontWeight: '800' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#00f2fe', fontWeight: '700', fontSize: 12, marginLeft: 12 }}>
                    Rp{item.subtotal.toLocaleString('id-ID')}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.checkoutBar}>
              <View>
                <Text style={{ fontSize: 10, color: '#94a3b8' }}>Total Tagihan:</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#00f2fe' }}>
                  Rp{totalAmount.toLocaleString('id-ID')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { paddingHorizontal: 20, marginTop: 0 }, cart.length === 0 && { opacity: 0.4 }]}
                disabled={cart.length === 0}
                onPress={() => setCheckoutModalVisible(true)}
              >
                <Text style={styles.primaryBtnText}>BAYAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* TAB CONTENT 3: PRODUCTS INVENTORY */}
      {activeTab === 'products' && (
        <View style={{ flex: 1, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.screenHeader}>Stok Barang ({products.length})</Text>
            <TouchableOpacity style={styles.smallAddBtn} onPress={() => setAddProductModalVisible(true)}>
              <Ionicons name="add" size={16} color="#000" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>Barang Baru</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={products}
            keyExtractor={(i) => i.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.inventoryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: '#64748b', fontSize: 10 }}>Barcode: {item.barcode || '-'}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                    Jual: Rp{item.sale_price.toLocaleString('id-ID')}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: item.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: 12 }}>
                    Stok: {item.stock} pcs
                  </Text>
                  <TouchableOpacity
                    style={styles.restockSmallBtn}
                    onPress={() => {
                      setSelectedProduct(item);
                      setRestockModalVisible(true);
                    }}
                  >
                    <Text style={{ color: '#00f2fe', fontSize: 10, fontWeight: '700' }}>Restock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* BOTTOM TAB BAR SWITCHER */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons name="grid-outline" size={20} color={activeTab === 'dashboard' ? '#00f2fe' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'kasir' && styles.tabItemActive]}
          onPress={() => setActiveTab('kasir')}
        >
          <MaterialCommunityIcons name="cash-register" size={22} color={activeTab === 'kasir' ? '#00f2fe' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'kasir' && styles.tabLabelActive]}>Kasir POS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons name="cube-outline" size={20} color={activeTab === 'products' ? '#00f2fe' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'products' && styles.tabLabelActive]}>Stok Barang</Text>
        </TouchableOpacity>
      </View>

      {/* CHECKOUT MODAL */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Proses Pembayaran</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>Total: Rp {totalAmount.toLocaleString('id-ID')}</Text>
            <Text style={[styles.label, { marginTop: 12 }]}>Jumlah Uang Diterima (Rp)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Masukkan nominal..."
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={paidAmount}
              onChangeText={setPaidAmount}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCheckout}>
                <Text style={styles.primaryBtnText}>BAYAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RESTOCK MODAL */}
      <Modal visible={restockModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restock {selectedProduct?.name}</Text>
            <Text style={styles.label}>Jumlah Tambah Stok (Pcs)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Misal: 10"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={restockAmount}
              onChangeText={setRestockAmount}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRestockModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleRestock}>
                <Text style={styles.primaryBtnText}>SIMPAN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD PRODUCT MODAL */}
      <Modal visible={addProductModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Produk Baru</Text>
            <Text style={styles.label}>Nama Produk *</Text>
            <TextInput style={styles.modalInput} placeholder="Nama..." placeholderTextColor="#64748b" value={newName} onChangeText={setNewName} />
            <Text style={styles.label}>Harga Jual (Rp) *</Text>
            <TextInput style={styles.modalInput} placeholder="3000" placeholderTextColor="#64748b" keyboardType="numeric" value={newSalePrice} onChangeText={setNewSalePrice} />
            <Text style={styles.label}>Stok Awal</Text>
            <TextInput style={styles.modalInput} placeholder="40" placeholderTextColor="#64748b" keyboardType="numeric" value={newStock} onChangeText={setNewStock} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddProductModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateProduct}>
                <Text style={styles.primaryBtnText}>TAMBAH</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI ASSISTANT MODAL */}
      <AiAssistantModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onDataUpdated={loadProducts}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  aiPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#07090e',
  },
  loginContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#00f2fe33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: '#00f2fe20',
    borderWidth: 1,
    borderColor: '#00f2fe',
  },
  chipText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  chipTextActive: {
    color: '#00f2fe',
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07090e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: '#00f2fe',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#07090e',
    fontSize: 12,
    fontWeight: '900',
  },
  screenHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    marginVertical: 2,
  },
  statSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  critRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  gridProdCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
    minHeight: 76,
    justifyContent: 'space-between',
  },
  gridProdName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  gridProdPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00f2fe',
  },
  cartPanel: {
    backgroundColor: '#0a0e17',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 12,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  qtyBtn: {
    backgroundColor: '#1e293b',
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  restockSmallBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    height: 56,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#00f2fe',
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  tabLabelActive: {
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
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#07090e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00f2fe66',
    borderRadius: 12,
    height: 44,
    marginTop: 12,
    backgroundColor: '#00f2fe10',
  },
  secondaryRegBtnText: {
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: '800',
  },
});
