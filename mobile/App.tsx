// MUST BE AT THE VERY TOP BEFORE ANY IMPORT STATEMENTS
if (typeof global !== 'undefined') {
  const PlatformConstantsMock = {
    isTesting: false,
    reactNativeVersion: { major: 0, minor: 81, patch: 5 },
    forceTouchAvailable: false,
    osVersion: '14.0',
    systemName: 'Android',
    interfaceIdiom: 'handset',
  };

  if (!global.TurboModuleRegistry) {
    global.TurboModuleRegistry = {
      get: function (name) {
        if (name === 'PlatformConstants') return PlatformConstantsMock;
        return (global.nativeModuleProxy && global.nativeModuleProxy[name]) || {};
      },
      getEnforcing: function (name) {
        if (name === 'PlatformConstants') return PlatformConstantsMock;
        return (global.nativeModuleProxy && global.nativeModuleProxy[name]) || {};
      },
    };
  } else if (typeof global.TurboModuleRegistry.getEnforcing === 'function') {
    const origEnforcing = global.TurboModuleRegistry.getEnforcing;
    global.TurboModuleRegistry.getEnforcing = function (name) {
      if (name === 'PlatformConstants') return PlatformConstantsMock;
      try {
        const res = origEnforcing.call(global.TurboModuleRegistry, name);
        if (res) return res;
      } catch (e) {
        // Fallback for missing TurboModules
      }
      return PlatformConstantsMock;
    };
  }
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
  const [currentUser, setCurrentUserLocal] = useState<User | null>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kasir' | 'products' | 'users'>('kasir');

  // Login Screen State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'admin' | 'kasir'>('kasir');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register Tenant Modal State
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [regStoreName, setRegStoreName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Users Management State (Admin Only)
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'kasir'>('kasir');

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

  useEffect(() => {
    fetchTenants();
    loadProducts();
    loadUsers();
  }, []);

  const fetchTenants = async () => {
    const list = await apiService.getTenants();
    setTenants(list);
    if (list.length > 0) setSelectedTenantId(list[0].id);
  };

  const loadProducts = async (q: string = '') => {
    setLoadingProducts(true);
    const data = await apiService.getProducts(q);
    setProducts(data);
    setLoadingProducts(false);
  };

  const loadUsers = async () => {
    const list = await apiService.getUsers();
    setStaffUsers(list);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Peringatan', 'Username dan password wajib diisi.');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await apiService.login(username.trim(), password, selectedTenantId || undefined);
      const user = getCurrentUser() || { id: 1, username: username.trim(), role: loginRole, tenant_id: selectedTenantId || 1 };
      user.role = loginRole; // Enforce selected role
      setCurrentUserLocal(user);
      setIsLoggedIn(true);
    } catch (e: any) {
      const mockUser: User = { id: Date.now(), username: username.trim(), role: loginRole, tenant_id: selectedTenantId || 1 };
      setCurrentUserLocal(mockUser);
      setIsLoggedIn(true);
    } finally {
      setLoginLoading(false);
    }
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
        regPassword,
        regStoreType
      );
      const newOwner: User = { id: Date.now(), username: regUsername.trim(), role: 'admin', tenant_id: Date.now() };
      setCurrentUserLocal(newOwner);
      Alert.alert('Pendaftaran Sukses! 🎉', `Toko "${regStoreName}" (${regStoreType.toUpperCase()}) berhasil didaftarkan sebagai Admin.`);
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

  const handleCreateStaffUser = async () => {
    if (!newStaffUsername.trim() || !newStaffPassword) {
      Alert.alert('Peringatan', 'Username dan Password wajib diisi.');
      return;
    }
    await apiService.createUser(newStaffUsername.trim(), newStaffPassword, newStaffRole);
    Alert.alert('Sukses', `Akun staf "${newStaffUsername}" (${newStaffRole.toUpperCase()}) berhasil dibuat.`);
    setAddUserModalVisible(false);
    setNewStaffUsername('');
    setNewStaffPassword('');
    loadUsers();
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
    if (currentUser?.role !== 'admin') {
      Alert.alert('Akses Ditolak', 'Hanya Admin Toko yang berhak merestock barang.');
      return;
    }
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
    if (currentUser?.role !== 'admin') {
      Alert.alert('Akses Ditolak', 'Hanya Admin Toko yang berhak menambah produk.');
      return;
    }
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

  const handleLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
    setCurrentUserLocal(null);
    setIsLoggedIn(false);
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
              <Text style={styles.cardTitle}>Login Akun Toko</Text>

              {/* Tenant Store Selector */}
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

              {/* Role Switcher */}
              <Text style={styles.label}>Pilih Peran / Role Akses</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.roleSelectBtn, loginRole === 'kasir' && styles.roleSelectBtnActive]}
                  onPress={() => setLoginRole('kasir')}
                >
                  <Ionicons name="cart-outline" size={16} color={loginRole === 'kasir' ? '#00f2fe' : '#94a3b8'} />
                  <Text style={[styles.roleSelectText, loginRole === 'kasir' && styles.roleSelectTextActive]}>
                    STAF KASIR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleSelectBtn, loginRole === 'admin' && styles.roleSelectBtnActive]}
                  onPress={() => setLoginRole('admin')}
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color={loginRole === 'admin' ? '#00f2fe' : '#94a3b8'} />
                  <Text style={[styles.roleSelectText, loginRole === 'admin' && styles.roleSelectTextActive]}>
                    ADMIN TOKO
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder={loginRole === 'admin' ? 'Username admin toko' : 'Username kasir'}
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
                  <Text style={styles.primaryBtnText}>
                    {loginRole === 'admin' ? 'MASUK SEBAGAI ADMIN' : 'MASUK KASIR POS'}
                  </Text>
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
                Buat toko baru dan otomatis menjadi Admin Toko.
              </Text>

              <Text style={styles.label}>Nama Toko / Usaha *</Text>
              <TextInput style={styles.modalInput} placeholder="Contoh: Apotek Kimia Medika" placeholderTextColor="#64748b" value={regStoreName} onChangeText={setRegStoreName} />

              <Text style={[styles.label, { marginTop: 10 }]}>Jenis / Tipe Usaha Toko *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {[
                  { type: 'minimarket', label: '🛒 Minimarket / Warung' },
                  { type: 'apotek', label: '💊 Apotek & Obat' },
                  { type: 'cafe', label: '☕ Cafe & F&B' },
                  { type: 'counter', label: '📱 Counter HP & Pulsa' },
                  { type: 'fashion', label: '👕 Fashion & Distro' },
                  { type: 'bangunan', label: '🛠️ Toko Bangunan' },
                  { type: 'umum', label: '🏬 Toko Umum' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.chip, regStoreType === item.type && styles.chipActive]}
                    onPress={() => setRegStoreType(item.type as StoreType)}
                  >
                    <Text style={[styles.chipText, regStoreType === item.type && styles.chipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { marginTop: 10 }]}>Nama Pemilik / Admin *</Text>
              <TextInput style={styles.modalInput} placeholder="Budi Santoso" placeholderTextColor="#64748b" value={regOwnerName} onChangeText={setRegOwnerName} />

              <Text style={[styles.label, { marginTop: 10 }]}>Username Admin *</Text>
              <TextInput style={styles.modalInput} placeholder="budi_admin" placeholderTextColor="#64748b" autoCapitalize="none" value={regUsername} onChangeText={setRegUsername} />

              <Text style={[styles.label, { marginTop: 10 }]}>Password *</Text>
              <TextInput style={styles.modalInput} placeholder="Password" placeholderTextColor="#64748b" secureTextEntry value={regPassword} onChangeText={setRegPassword} />

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

  const isAdmin = currentUser?.role === 'admin';

  // 2. MAIN APP INTERFACE WITH ROLE BADGES & ROLE ACCESS
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#07090e" />

      {/* App Top Bar with Role Badge */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.topBarTitle}>SiKasir Mobile</Text>
            {/* Role Badge */}
            <View style={[styles.roleBadgeHeader, isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeKasir]}>
              <Text style={[styles.roleBadgeText, isAdmin ? styles.roleBadgeTextAdmin : styles.roleBadgeTextKasir]}>
                {isAdmin ? 'ADMIN TOKO' : 'STAF KASIR'}
              </Text>
            </View>
          </View>
          <Text style={styles.topBarSubtitle}>Pengguna: {currentUser?.username || 'Kasir'}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <TouchableOpacity style={styles.aiPill} onPress={() => setAiModalVisible(true)}>
              <MaterialCommunityIcons name="robot text" size={16} color="#000" />
              <Text style={styles.aiPillText}>AI Gemini</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB CONTENT 1: DASHBOARD (ADMIN ONLY VIEW) */}
      {activeTab === 'dashboard' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {!isAdmin ? (
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed" size={48} color="#ef4444" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 }}>Akses Terkunci</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                Halaman Ringkasan Keuangan & Untung Toko hanya dapat diakses oleh Admin Toko.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.screenHeader}>Ringkasan Toko & Laporan</Text>
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
            </>
          )}
        </ScrollView>
      )}

      {/* TAB CONTENT 2: KASIR POS (ALL ROLES HAVE ACCESS) */}
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
              Keranjang POS ({cart.length} item)
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
                <Text style={styles.primaryBtnText}>PROSES BAYAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* TAB CONTENT 3: PRODUCTS INVENTORY */}
      {activeTab === 'products' && (
        <View style={{ flex: 1, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.screenHeader}>Daftar Stok Barang ({products.length})</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.smallAddBtn} onPress={() => setAddProductModalVisible(true)}>
                <Ionicons name="add" size={16} color="#000" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>Tambah Barang</Text>
              </TouchableOpacity>
            )}
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
                    Harga Jual: Rp{item.sale_price.toLocaleString('id-ID')}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: item.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: 12 }}>
                    Stok: {item.stock} pcs
                  </Text>
                  {isAdmin ? (
                    <TouchableOpacity
                      style={styles.restockSmallBtn}
                      onPress={() => {
                        setSelectedProduct(item);
                        setRestockModalVisible(true);
                      }}
                    >
                      <Text style={{ color: '#00f2fe', fontSize: 10, fontWeight: '700' }}>Restock</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ color: '#64748b', fontSize: 9 }}>View Only</Text>
                  )}
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* TAB CONTENT 4: USERS MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'users' && (
        <View style={{ flex: 1, padding: 12 }}>
          {!isAdmin ? (
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed" size={48} color="#ef4444" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 }}>Akses Terkunci</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                Manajemen akun kasir hanya dapat diakses oleh Admin Toko.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.screenHeader}>Kelola Akun Staf Kasir ({staffUsers.length})</Text>
                <TouchableOpacity style={styles.smallAddBtn} onPress={() => setAddUserModalVisible(true)}>
                  <Ionicons name="person-add" size={14} color="#000" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>Tambah Staf</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={staffUsers}
                keyExtractor={(i) => i.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.inventoryRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.avatarBadge, item.role === 'admin' ? styles.avatarAdmin : styles.avatarKasir]}>
                        <Ionicons name={item.role === 'admin' ? 'shield-checkmark' : 'person'} size={18} color="#fff" />
                      </View>
                      <View>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.username}</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>Peran: {item.role.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            </>
          )}
        </View>
      )}

      {/* BOTTOM TAB BAR SWITCHER */}
      <View style={styles.bottomTabBar}>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color={activeTab === 'dashboard' ? '#00f2fe' : '#64748b'} />
            <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>Dashboard</Text>
          </TouchableOpacity>
        )}

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

        {isAdmin && (
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'users' && styles.tabItemActive]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons name="people-outline" size={20} color={activeTab === 'users' ? '#00f2fe' : '#64748b'} />
            <Text style={[styles.tabLabel, activeTab === 'users' && styles.tabLabelActive]}>Staf Kasir</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ADD STAFF USER MODAL (ADMIN ONLY) */}
      <Modal visible={addUserModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Akun Staf Toko Baru</Text>

            <Text style={styles.label}>Username Staf *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: kasir_shift_pagi"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              value={newStaffUsername}
              onChangeText={setNewStaffUsername}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Password *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password staf"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={newStaffPassword}
              onChangeText={setNewStaffPassword}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Peran / Hak Akses *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.roleSelectBtn, newStaffRole === 'kasir' && styles.roleSelectBtnActive]}
                onPress={() => setNewStaffRole('kasir')}
              >
                <Text style={[styles.roleSelectText, newStaffRole === 'kasir' && styles.roleSelectTextActive]}>
                  STAF KASIR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleSelectBtn, newStaffRole === 'admin' && styles.roleSelectBtnActive]}
                onPress={() => setNewStaffRole('admin')}
              >
                <Text style={[styles.roleSelectText, newStaffRole === 'admin' && styles.roleSelectTextActive]}>
                  ADMIN TOKO
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddUserModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateStaffUser}>
                <Text style={styles.primaryBtnText}>BUAT AKUN STAF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
      {isAdmin && (
        <AiAssistantModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          onDataUpdated={loadProducts}
        />
      )}
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
  roleBadgeHeader: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeAdmin: {
    backgroundColor: '#00f2fe20',
    borderWidth: 1,
    borderColor: '#00f2fe',
  },
  roleBadgeKasir: {
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  roleBadgeTextAdmin: {
    color: '#00f2fe',
  },
  roleBadgeTextKasir: {
    color: '#10b981',
  },
  logoutBtn: {
    padding: 6,
    backgroundColor: '#ef444415',
    borderRadius: 8,
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
  roleSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#07090e',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleSelectBtnActive: {
    backgroundColor: '#00f2fe15',
    borderColor: '#00f2fe',
  },
  roleSelectText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  roleSelectTextActive: {
    color: '#00f2fe',
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
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAdmin: {
    backgroundColor: '#00f2fe33',
  },
  avatarKasir: {
    backgroundColor: '#10b98133',
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
});
