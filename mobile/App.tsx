// @ts-nocheck
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
  Dimensions,
  Image,
  useWindowDimensions,
  Linking,
} from 'react-native';


import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService, { MOCK_TENANTS, MOCK_PRODUCTS, MOCK_CUSTOMERS, setAuthToken, getAuthToken, setCurrentUser, getCurrentUser } from './src/services/api';
import { Product, CartItem, Tenant, User, StoreType, TransactionRecord, IncomingLog, AuditLog, CyberSecurityStatus } from './src/types';
import { AiAssistantModal } from './src/components/AiAssistantModal';
import { HeavyDutyBarcodeScannerModal } from './src/components/HeavyDutyBarcodeScannerModal';
import * as ImagePicker from 'expo-image-picker';

const STORE_CATEGORIES = [
  {
    title: 'Retail & Kebutuhan',
    data: [
      { type: 'minimarket', label: '🛒 Minimarket' },
      { type: 'supermarket', label: '🛒 Supermarket' },
      { type: 'warung_kelontong', label: '🏪 Warung Kelontong' },
      { type: 'sayur_buah', label: '🥬 Sayur, Buah & Daging' },
      { type: 'toko_plastik', label: '🛍️ Toko Plastik & Kemasan' },
      { type: 'bahan_kue', label: '🧁 Toko Bahan Kue' },
    ]
  },
  {
    title: 'Makanan & Minuman (F&B)',
    data: [
      { type: 'cafe', label: '☕ Cafe & Kopi' },
      { type: 'resto', label: '🍽️ Restoran & Rumah Makan' },
      { type: 'warteg', label: '🍛 Warteg & Nasi Bungkus' },
      { type: 'street_food', label: '🍢 Kaki Lima & Gerobak' },
      { type: 'bakery', label: '🍞 Bakery & Pastry' },
    ]
  },
  {
    title: 'Kesehatan & Kecantikan',
    data: [
      { type: 'apotek', label: '💊 Apotek & Obat' },
      { type: 'klinik', label: '⚕️ Klinik Kesehatan' },
      { type: 'salon', label: '💇‍♀️ Salon Kecantikan' },
      { type: 'barbershop', label: '✂️ Barbershop' },
      { type: 'optik', label: '👓 Optik Kacamata' },
      { type: 'skincare_kosmetik', label: '💄 Skincare & Kosmetik' },
    ]
  },
  {
    title: 'Fashion & Aksesoris',
    data: [
      { type: 'fashion', label: '👕 Pakaian & Distro' },
      { type: 'sepatu_sandal', label: '👟 Sepatu & Sandal' },
      { type: 'toko_emas', label: '💍 Toko Emas & Perhiasan' },
      { type: 'toko_jam', label: '⌚ Toko Jam' },
    ]
  },
  {
    title: 'Elektronik & Gadget',
    data: [
      { type: 'counter', label: '📱 Counter HP & Pulsa' },
      { type: 'toko_komputer', label: '💻 Toko Komputer & Laptop' },
      { type: 'elektronik_rumah_tangga', label: '📺 Elektronik Rumah Tangga' },
    ]
  },
  {
    title: 'Otomotif',
    data: [
      { type: 'bengkel', label: '🏍️ Bengkel Motor / Mobil' },
      { type: 'cuci_mobil', label: '🚗 Cuci Mobil & Motor' },
      { type: 'variasi_aksesoris_kendaraan', label: '🏎️ Aksesoris Kendaraan' },
    ]
  },
  {
    title: 'Jasa & Layanan',
    data: [
      { type: 'laundry', label: '🧺 Laundry & Cuci Baju' },
      { type: 'jasa_servis', label: '🔧 Jasa Servis (AC, TV)' },
      { type: 'percetakan', label: '🖨️ Percetakan & Fotokopi' },
      { type: 'studio_foto', label: '📸 Studio Foto' },
    ]
  },
  {
    title: 'Hobi & Lain-lain',
    data: [
      { type: 'toko_buku', label: '📚 Toko Buku & Alat Tulis' },
      { type: 'toko_mainan', label: '🧸 Toko Mainan' },
      { type: 'petshop', label: '🐾 Petshop & Dokter Hewan' },
      { type: 'toko_olahraga', label: '⚽ Toko Peralatan Olahraga' },
      { type: 'alat_musik', label: '🎸 Toko Alat Musik' },
      { type: 'florist', label: '💐 Toko Bunga' },
      { type: 'bangunan', label: '🛠️ Toko Bangunan & Material' },
      { type: 'distributor', label: '📦 Distributor & Grosir' },
      { type: 'umum', label: '🏬 Toko Umum / Lainnya' },
    ]
  }
];

export default function App() {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const isTablet = SCREEN_W >= 768;

  const [isLoggedIn, setIsLoggedIn] = useState(!!getAuthToken());
  const [currentUser, setCurrentUserLocal] = useState<User | null>(getCurrentUser());
  const currentTenant = currentUser ? MOCK_TENANTS.find(t => t.id === currentUser.tenant_id) : null;
  const storeType = currentTenant?.store_type || 'umum';
  const [activeTab, setActiveTab] = useState<'kasir' | 'history' | 'products' | 'incoming' | 'dashboard' | 'users' | 'audit' | 'cybersecurity' | 'kds' | 'adminTools'>('kasir');

  // Heavy Duty Camera Barcode Scanner State
  const [scannerModalVisible, setScannerModalVisible] = useState(false);

  // Parity State: History, Incoming, Audit, CyberSecurity, KDS
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [incomingLogs, setIncomingLogs] = useState<IncomingLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [kdsOrders, setKdsOrders] = useState<any[]>([]);
  const [cyberStatus, setCyberStatus] = useState<CyberSecurityStatus | null>(null);

  // Variant Modal State
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, {name: string, price_diff: number}>>({});

  // Incoming Modal State
  const [addIncomingModalVisible, setAddIncomingModalVisible] = useState(false);
  const [incSupplier, setIncSupplier] = useState('');
  const [incItem, setIncItem] = useState('');
  const [incQty, setIncQty] = useState('');
  const [incPrice, setIncPrice] = useState('');
  const [incNotes, setIncNotes] = useState('');

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
  const [regStoreType, setRegStoreType] = useState<StoreType>('minimarket');
  const [isStoreTypeModalVisible, setIsStoreTypeModalVisible] = useState(false);
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
  const [heldBills, setHeldBills] = useState<CartItem[][]>([]);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'KASBON'>('CASH');
  const [kasbonCustomerName, setKasbonCustomerName] = useState('');
  const [kasbonCustomerPhone, setKasbonCustomerPhone] = useState('');
  const [spgName, setSpgName] = useState('');
  const [applyPB1, setApplyPB1] = useState(false);
  const [splitBillWays, setSplitBillWays] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Shift Management State
  const [shiftStatus, setShiftStatus] = useState<'closed' | 'open'>('closed');
  const [shiftStartBalance, setShiftStartBalance] = useState(0);

  // Dashboard State
  const [dashboardView, setDashboardView] = useState<'tenant' | 'company'>('tenant');

  // Corporate Mutasi State
  const [mutasiModalVisible, setMutasiModalVisible] = useState(false);
  const [mutasiDestTenantId, setMutasiDestTenantId] = useState<number | null>(null);
  const [mutasiProductId, setMutasiProductId] = useState<number | null>(null);
  const [mutasiQty, setMutasiQty] = useState('');
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [shiftAction, setShiftAction] = useState<'open' | 'close'>('open');

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
  const [aiProcessing, setAiProcessing] = useState(false);

  useEffect(() => {
    fetchTenants();
    loadProducts();
    loadUsers();
    loadTransactions();
    loadIncoming();
    loadAudit();
    loadCyberStatus();

    // 3-second real-time auto-sync background timer with Web server
    const syncInterval = setInterval(() => {
      if (isLoggedIn) {
        loadProducts();
        loadTransactions();
        loadIncoming();
      }
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [isLoggedIn]);

  const loadTransactions = async () => {
    const list = await apiService.getTransactions();
    setTransactions(list);
  };

  const loadIncoming = async () => {
    const list = await apiService.getIncomingLogs();
    setIncomingLogs(list);
  };

  const loadAudit = async () => {
    const list = await apiService.getAuditLogs();
    setAuditLogs(list);
  };

  const loadCyberStatus = async () => {
    const status = await apiService.getCyberSecurityStatus();
    setCyberStatus(status);
  };

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

      // Trigger 100% Data Sync on login
      loadProducts();
      loadTransactions();
      loadIncoming();
      loadUsers();
      loadAudit();
      loadCyberStatus();
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
      const res = await apiService.registerTenant(
        regStoreName.trim(),
        regOwnerName.trim(),
        regUsername.trim(),
        regPassword,
        regStoreType
      );
      setCurrentUserLocal(res.user);
      Alert.alert(
        'Pendaftaran Sukses! 🎉',
        `Toko "${regStoreName}" (${regStoreType.toUpperCase()}) berhasil didaftarkan sebagai Admin.`,
        [{
          text: 'Mulai Sekarang',
          onPress: async () => {
            setRegisterModalVisible(false);
            setRegStoreName('');
            setRegOwnerName('');
            setRegUsername('');
            setRegPassword('');
            await fetchTenants();
            setIsLoggedIn(true);
          }
        }]
      );
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
    Alert.alert(
      'Sukses',
      `Akun staf "${newStaffUsername}" (${newStaffRole.toUpperCase()}) berhasil dibuat.`,
      [{
        text: 'OK',
        onPress: () => {
          setAddUserModalVisible(false);
          setNewStaffUsername('');
          setNewStaffPassword('');
          loadUsers();
        }
      }]
    );
  };

  const holdBill = () => {
    if (cart.length === 0) return;
    setHeldBills((prev) => [...prev, cart]);
    setCart([]);
  };

  const loadBill = (index: number) => {
    setCart(heldBills[index]);
    setHeldBills((prev) => prev.filter((_, i) => i !== index));
  };

  const addToCart = (product: Product, selectedVars?: Record<string, {name: string, price_diff: number}>, customPrice?: number) => {
    if (product.has_variants && ['cafe', 'resto', 'warteg', 'street_food', 'bakery', 'fashion', 'sepatu_sandal'].includes(storeType) && !selectedVars && !customPrice) {
      setSelectedProductForVariant(product);
      setSelectedVariants({});
      setVariantModalVisible(true);
      return;
    }

    setCart(prev => {
      const variantStr = selectedVars ? Object.values(selectedVars).map(v => v.name).sort().join(', ') : '';
      const existing = prev.find(item => item.product.id === product.id && (item.selected_variants?.join(', ') || '') === variantStr);
      if (existing) {
        if (existing.qty >= product.stock) {
          Alert.alert('Stok Maksimal', `Stok ${product.name} tersisa ${product.stock} pcs.`);
          return prev;
        }
        
        const newQty = existing.qty + 1;
        const priceToUse = (['minimarket', 'supermarket', 'warung_kelontong', 'sayur_buah', 'distributor', 'bangunan', 'umum'].includes(storeType) && product.wholesale_min_qty && newQty >= product.wholesale_min_qty && product.wholesale_price) 
                           ? product.wholesale_price 
                           : product.sale_price;

        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: newQty, subtotal: newQty * priceToUse }
            : item
        );
      }
      
      const priceToUse = (['minimarket', 'supermarket', 'warung_kelontong', 'sayur_buah', 'distributor', 'bangunan', 'umum'].includes(storeType) && product.wholesale_min_qty && 1 >= product.wholesale_min_qty && product.wholesale_price) 
                         ? product.wholesale_price 
                         : product.sale_price;
                         
      const extraPrice = selectedVars ? Object.values(selectedVars).reduce((sum, v) => sum + v.price_diff, 0) : 0;
      const finalPrice = customPrice !== undefined ? customPrice : priceToUse + extraPrice;

      return [...prev, { product, qty: 1, subtotal: finalPrice, selected_variants: selectedVars ? Object.values(selectedVars).map(v => v.name).sort() : undefined }];
    });
  };

  const updateCartQty = (productId: number, variantStr: string | undefined, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && (item.selected_variants?.join(', ') || '') === (variantStr || '')) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              Alert.alert('Stok Maksimal', `Stok tersisa ${item.product.stock} pcs.`);
              return item;
            }
            
            const priceToUse = (['minimarket', 'supermarket', 'warung_kelontong', 'sayur_buah', 'distributor', 'bangunan', 'umum'].includes(storeType) && item.product.wholesale_min_qty && newQty >= item.product.wholesale_min_qty && item.product.wholesale_price) 
                               ? item.product.wholesale_price 
                               : item.product.sale_price;
                               
            return { ...item, qty: newQty, subtotal: newQty * priceToUse };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = applyPB1 ? subtotalAmount * 1.1 : subtotalAmount;

  const handleCheckout = async () => {
    const paid = Number(paidAmount);
    if (paymentMethod !== 'KASBON' && (isNaN(paid) || paid < totalAmount)) {
      Alert.alert('Pembayaran', `Nominal kurang dari total Rp ${totalAmount.toLocaleString('id-ID')}`);
      return;
    }
    if (paymentMethod === 'KASBON' && !selectedCustomerId) {
      Alert.alert('Data Kasbon', 'Silakan pilih Pelanggan dari daftar Kasbon!');
      return;
    }
    const finalPaid = paymentMethod === 'KASBON' ? 0 : paid;
    const res = await apiService.checkout(cart, finalPaid, paymentMethod, kasbonCustomerName, kasbonCustomerPhone, applyPB1, splitBillWays, spgName, selectedCustomerId || undefined);
    Alert.alert(
      'Transaksi Berhasil!',
      paymentMethod === 'KASBON' ? 'Tagihan berhasil dicatat ke buku Kasbon (Hutang).' : `Kembalian: Rp ${Number(res.change_amount || finalPaid - totalAmount).toLocaleString('id-ID')}`,
      [
        {
          text: 'Selesai / Cetak Struk',
          onPress: () => {
            if (['cafe', 'resto', 'warteg', 'street_food', 'bakery'].includes(storeType)) {
              setKdsOrders(prev => [{
                id: res.id,
                transaction_id: res.id,
                items: [...cart],
                status: 'PENDING',
                created_at: new Date().toISOString()
              }, ...prev]);
            }
            setCart([]);
            setPaidAmount('');
            setPaymentMethod('CASH');
            setKasbonCustomerName('');
            setKasbonCustomerPhone('');
            setSelectedCustomerId(null);
            setApplyPB1(false);
            setSplitBillWays(1);
            setSpgName('');
            setCheckoutModalVisible(false);
            loadProducts();
          },
        },
      ]
    );
  };

  const handleRefund = async (transactionId: string) => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Akses Ditolak', 'Hanya Admin Toko yang berhak meretur barang/transaksi.');
      return;
    }
    Alert.alert(
      'Konfirmasi Retur',
      `Apakah Anda yakin ingin membatalkan/meretur transaksi ${transactionId}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Retur',
          style: 'destructive',
          onPress: async () => {
            await apiService.refundTransaction(transactionId);
            Alert.alert('Sukses', 'Transaksi berhasil diretur.');
            loadTransactions();
          }
        }
      ]
    );
  };

  const handleMutasi = () => {
    if (!mutasiDestTenantId || !mutasiProductId || !mutasiQty) {
      Alert.alert('Error', 'Harap isi Cabang Tujuan, Produk, dan Jumlah Mutasi!');
      return;
    }
    const qty = parseInt(mutasiQty, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Jumlah mutasi tidak valid.');
      return;
    }
    
    // Find the product in current tenant
    const sourceProd = products.find(p => p.id === mutasiProductId);
    if (!sourceProd || sourceProd.stock < qty) {
      Alert.alert('Error', 'Stok produk tidak mencukupi untuk dimutasi.');
      return;
    }

    // Deduct stock from current tenant
    sourceProd.stock -= qty;

    // Add stock to destination tenant
    // Find if the product already exists in the destination tenant (by barcode)
    let destProd = MOCK_PRODUCTS.find(p => p.tenant_id === mutasiDestTenantId && p.barcode === sourceProd.barcode);
    
    if (destProd) {
      destProd.stock += qty;
    } else {
      // Create new product entry for destination
      destProd = {
        ...sourceProd,
        id: Math.floor(Math.random() * 1000000),
        tenant_id: mutasiDestTenantId,
        stock: qty
      };
      MOCK_PRODUCTS.push(destProd);
    }

    Alert.alert('Sukses', `Berhasil memindahkan ${qty} pcs ${sourceProd.name} ke cabang ID ${mutasiDestTenantId}.`);
    setMutasiModalVisible(false);
    setMutasiDestTenantId(null);
    setMutasiProductId(null);
    setMutasiQty('');
    loadProducts();
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

  const handleAiCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Izin Kamera', 'Tolong berikan izin kamera untuk menggunakan fitur ini.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAiProcessing(true);
        try {
          const imageUri = result.assets[0].uri;
          const aiData = await apiService.analyzeProductImage(imageUri, 'image/jpeg');
          setNewName(aiData.name || '');
          setNewBarcode(aiData.barcode || '');
          setAddProductModalVisible(true);
        } catch (err: any) {
          Alert.alert('AI Error', err.message || 'Gagal memproses gambar');
        } finally {
          setAiProcessing(false);
        }
      }
    } catch (e) {
      console.log(e);
    }
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
        <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.loginContent}>
            <View style={styles.loginHeader}>
              <Image source={require('./assets/icon.png')} style={{ width: 80, height: 80, alignSelf: 'center', marginBottom: 10, borderRadius: 20 }} />
              <View style={styles.logoBadge}>
                <MaterialCommunityIcons name="cash-register" size={36} color="#10b981" />
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
                  <Ionicons name="cart-outline" size={16} color={loginRole === 'kasir' ? '#10b981' : '#94a3b8'} />
                  <Text style={[styles.roleSelectText, loginRole === 'kasir' && styles.roleSelectTextActive]}>
                    STAF KASIR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleSelectBtn, loginRole === 'admin' && styles.roleSelectBtnActive]}
                  onPress={() => setLoginRole('admin')}
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color={loginRole === 'admin' ? '#10b981' : '#94a3b8'} />
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
                <Ionicons name="storefront-outline" size={16} color="#10b981" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryRegBtnText}>+ DAFTAR TOKO / MINIMARKET BARU</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* REGISTER TENANT / DAFTAR TOKO BARU MODAL */}
        <Modal visible={registerModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '90%', flexShrink: 1 }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Image source={require('./assets/icon.png')} style={{ width: 30, height: 30, borderRadius: 16 }} />
                    <Text style={styles.modalTitle}>Daftarkan Toko Baru</Text>
                  </View>
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
                <TouchableOpacity
                  style={[styles.modalInput, { justifyContent: 'center' }]}
                  onPress={() => setIsStoreTypeModalVisible(true)}
                >
                  <Text style={{ color: regStoreType ? '#fff' : '#64748b' }}>
                    {regStoreType 
                      ? STORE_CATEGORIES.flatMap(c => c.data).find(d => d.type === regStoreType)?.label 
                      : 'Pilih Tipe Toko'}
                  </Text>
                </TouchableOpacity>

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
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Pilih Tipe Toko */}
        <Modal visible={isStoreTypeModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { width: SCREEN_W * 0.9, height: SCREEN_H * 0.8, backgroundColor: '#18181b' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.modalTitle}>Pilih Kategori Usaha</Text>
                <TouchableOpacity onPress={() => setIsStoreTypeModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {STORE_CATEGORIES.map((cat, idx) => (
                  <View key={idx} style={{ marginBottom: 20 }}>
                    <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>{cat.title}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {cat.data.map(item => (
                        <TouchableOpacity
                          key={item.type}
                          style={[styles.chip, regStoreType === item.type && styles.chipActive]}
                          onPress={() => {
                            setRegStoreType(item.type as StoreType);
                            setIsStoreTypeModalVisible(false);
                          }}
                        >
                          <Text style={[styles.chipText, regStoreType === item.type && styles.chipTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  const handleCreateIncomingLog = async () => {
    if (!incSupplier.trim() || !incItem.trim() || !incQty || !incPrice) {
      Alert.alert('Peringatan', 'Supplier, Nama Barang, Jumlah, dan Harga Satuan wajib diisi.');
      return;
    }
    await apiService.addIncomingLog(
      incSupplier.trim(),
      incItem.trim(),
      parseInt(incQty, 10) || 1,
      parseFloat(incPrice) || 0,
      incNotes.trim()
    );
    Alert.alert('Sukses 🎉', 'Barang masuk berhasil dicatat!');
    setAddIncomingModalVisible(false);
    setIncSupplier('');
    setIncItem('');
    setIncQty('');
    setIncPrice('');
    setIncNotes('');
    await loadIncoming();
  };

  const handleBarcodeScanned = (barcode: string) => {
    setSearchQuery(barcode);

    // Scale Barcode Logic (Minimarket only) - Example: 21XXXXXPPPPP
    if (['minimarket', 'supermarket', 'warung_kelontong', 'sayur_buah'].includes(storeType) && barcode.length >= 12 && barcode.startsWith('21')) {
      const pCode = barcode.substring(2, 7);
      const pPrice = parseInt(barcode.substring(7, 12), 10);
      const found = products.find(p => p.barcode === pCode || p.barcode === barcode);
      if (found) {
        addToCart(found, undefined, pPrice);
        Alert.alert('✅ Barcode Timbangan!', `"${found.name}" ditambahkan dengan harga Rp${pPrice.toLocaleString('id-ID')}`);
        return;
      }
    }

    const found = products.find(p => p.barcode === barcode || p.name.toLowerCase().includes(barcode.toLowerCase()));
    if (found) {
      addToCart(found);
      Alert.alert('✅ Barcode Terdeteksi!', `"${found.name}" ditambahkan ke keranjang (+1 pcs).`);
    } else {
      loadProducts(barcode);
      Alert.alert('🔍 Barcode Terbaca', `Mencari barang dengan barcode: ${barcode}`);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  // 2. MAIN APP INTERFACE WITH ROLE BADGES & ROLE ACCESS
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />

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
              <MaterialCommunityIcons name="robot-outline" size={16} color="#000" />
              <Text style={styles.aiPillText}>AI Gemini</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB CONTENT: KDS (Kitchen Display System) */}
      {activeTab === 'kds' && (
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={styles.screenHeader}>Kitchen Display System (KDS)</Text>
          {kdsOrders.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="silverware-clean" size={48} color="#334155" />
              <Text style={{ color: '#64748b', marginTop: 12 }}>Tidak ada pesanan aktif.</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }}>
              <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>
                {kdsOrders.map((order) => (
                  <View key={order.id} style={{ 
                    backgroundColor: '#022c22', 
                    borderRadius: 16, 
                    borderWidth: 1, 
                    borderColor: order.status === 'READY' ? '#10b981' : (order.status === 'PREPARING' ? '#f59e0b' : '#334155'), 
                    padding: 16,
                    width: isTablet ? '31%' : '100%',
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '800' }}>#{order.id.slice(-4)}</Text>
                      <Text style={{ color: order.status === 'READY' ? '#10b981' : (order.status === 'PREPARING' ? '#f59e0b' : '#10b981'), fontWeight: '700', fontSize: 12 }}>
                        {order.status}
                      </Text>
                    </View>
                    <View style={{ marginBottom: 12 }}>
                      {order.items.map((it: any, idx: number) => (
                        <Text key={idx} style={{ color: '#94a3b8', fontSize: 13, marginVertical: 2 }}>
                          {it.qty}x {it.product.name}
                        </Text>
                      ))}
                    </View>
                    {order.status === 'PENDING' && (
                      <TouchableOpacity 
                        style={{ backgroundColor: '#f59e0b', padding: 10, borderRadius: 16, alignItems: 'center' }}
                        onPress={() => setKdsOrders(kdsOrders.map(o => o.id === order.id ? { ...o, status: 'PREPARING' } : o))}
                      >
                        <Text style={{ color: '#000', fontWeight: '800' }}>MASAK SEKARANG</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'PREPARING' && (
                      <TouchableOpacity 
                        style={{ backgroundColor: '#10b981', padding: 10, borderRadius: 16, alignItems: 'center' }}
                        onPress={() => setKdsOrders(kdsOrders.map(o => o.id === order.id ? { ...o, status: 'READY' } : o))}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800' }}>SELESAI & SIAP</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'READY' && (
                      <TouchableOpacity 
                        style={{ backgroundColor: '#334155', padding: 10, borderRadius: 16, alignItems: 'center' }}
                        onPress={() => setKdsOrders(kdsOrders.filter(o => o.id !== order.id))}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800' }}>ARSIPKAN</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* TAB CONTENT: ADMIN TOOLS */}
      {activeTab === 'adminTools' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {!isAdmin ? (
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed" size={48} color="#ef4444" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 }}>Akses Terkunci</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                Fitur Alat Admin hanya dapat diakses oleh Admin Toko.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.screenHeader}>Alat Admin Khusus</Text>
              
              {/* Generator Barcode */}
              <View style={{ backgroundColor: '#022c22', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#047857' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="barcode-outline" size={24} color="#10b981" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Generator Barcode Internal</Text>
                </View>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                  Gunakan alat ini untuk membuat barcode khusus untuk barang yang tidak memiliki barcode bawaan pabrik.
                </Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#047857', paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
                  onPress={() => Alert.alert('Barcode Internal Dibuat!', `Kode: INT-${Math.floor(100000 + Math.random() * 900000)}\n\nSilahkan tempel barcode ini ke produk.`)}
                >
                  <Text style={{ color: '#10b981', fontWeight: '800' }}>BUAT BARCODE BARU</Text>
                </TouchableOpacity>
              </View>

              {/* Mutasi Cabang */}
              <View style={{ backgroundColor: '#022c22', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#047857' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="swap-horizontal-outline" size={24} color="#f59e0b" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Mutasi Stok Antar Cabang</Text>
                </View>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                  Fitur untuk memindahkan stok berlebih ke cabang lain yang kekurangan stok (hanya untuk bisnis Multi-Outlet).
                </Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#047857', paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
                  onPress={() => setMutasiModalVisible(true)}
                >
                  <Text style={{ color: '#f59e0b', fontWeight: '800' }}>MULAI MUTASI STOK</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

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
              <Text style={styles.screenHeader}>Ringkasan & Laporan</Text>
              
              {currentTenant?.company_id && (
                <View style={{ flexDirection: 'row', backgroundColor: '#047857', borderRadius: 16, padding: 4, marginBottom: 16 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 8, backgroundColor: dashboardView === 'tenant' ? '#334155' : 'transparent', borderRadius: 6, alignItems: 'center' }}
                    onPress={() => setDashboardView('tenant')}
                  >
                    <Text style={{ color: dashboardView === 'tenant' ? '#fff' : '#64748b', fontWeight: '700', fontSize: 12 }}>Cabang Ini Saja</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 8, backgroundColor: dashboardView === 'company' ? '#0f766e' : 'transparent', borderRadius: 6, alignItems: 'center' }}
                    onPress={() => setDashboardView('company')}
                  >
                    <Text style={{ color: dashboardView === 'company' ? '#fff' : '#64748b', fontWeight: '700', fontSize: 12 }}>Grup Perusahaan</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(() => {
                const dashboardProducts = dashboardView === 'company' 
                  ? MOCK_PRODUCTS.filter(p => MOCK_TENANTS.find(t => t.id === p.tenant_id)?.company_id === currentTenant?.company_id)
                  : products;
                
                return (
                  <>
                    <View style={styles.statsGrid}>
                      <View style={styles.statCard}>
                        <Ionicons name="cube-outline" size={22} color="#10b981" />
                        <Text style={styles.statVal}>{dashboardProducts.length}</Text>
                        <Text style={styles.statSub}>Jenis Barang</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Ionicons name="layers-outline" size={22} color="#10b981" />
                        <Text style={styles.statVal}>{dashboardProducts.reduce((s, p) => s + p.stock, 0)}</Text>
                        <Text style={styles.statSub}>Total Pcs Stok</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
                        <Text style={[styles.statVal, { color: '#ef4444' }]}>
                          {dashboardProducts.filter((p) => p.stock <= 5).length}
                        </Text>
                        <Text style={styles.statSub}>Stok Kritis</Text>
                      </View>
                    </View>

                    <Text style={[styles.screenHeader, { marginTop: 16 }]}>Stok Kritis (&lt;=5 pcs)</Text>
                    {dashboardProducts.filter((p) => p.stock <= 5).length === 0 ? (
                      <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Semua stok aman.</Text>
                    ) : (
                      dashboardProducts.filter((p) => p.stock <= 5).map((p, idx) => (
                        <View key={idx} style={styles.critRow}>
                          <Text style={{ color: '#fff', fontSize: 13 }}>
                            {p.name} {dashboardView === 'company' ? `(${MOCK_TENANTS.find(t => t.id === p.tenant_id)?.name})` : ''}
                          </Text>
                          <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>{p.stock} pcs</Text>
                        </View>
                      ))
                    )}
                  </>
                );
              })()}
            </>
          )}
        </ScrollView>
      )}

      {/* TAB CONTENT 2: KASIR POS (ALL ROLES HAVE ACCESS) */}
      {activeTab === 'kasir' && shiftStatus === 'closed' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="cash-register" size={64} color="#64748b" />
          <Text style={{ fontSize: 18, color: '#fff', fontWeight: 'bold', marginTop: 16 }}>Shift Kasir Belum Dibuka</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 24 }}>Buka shift terlebih dahulu untuk mulai melayani pelanggan.</Text>
          <TouchableOpacity 
            style={[styles.primaryBtn, { width: 200 }]} 
            onPress={() => {
              setShiftAction('open');
              setOpeningCash('');
              setShiftModalVisible(true);
            }}
          >
            <Text style={styles.primaryBtnText}>BUKA SHIFT KASIR</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'kasir' && shiftStatus === 'open' && (
        <View style={{ flex: 1, flexDirection: isTablet ? 'row' : 'column' }}>
          <View style={{ flex: isTablet ? 2 : 1 }}>
            {/* Search bar & Heavy Duty Camera Scanner Button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 12, marginBottom: 8, gap: 8 }}>
            <View style={[styles.searchBarWrap, { flex: 1, margin: 0 }]}>
              <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
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
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); loadProducts(''); }}>
                  <Ionicons name="close-circle" size={18} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#10b981',
                paddingHorizontal: 14,
                height: 48,
                borderRadius: 14,
                elevation: 3,
                shadowColor: '#10b981',
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }}
              onPress={() => setScannerModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>SCAN</Text>
            </TouchableOpacity>
          </View>

          {/* Product Grid — show empty state if no products */}
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant" size={72} color="#047857" />
              <Text style={styles.emptyStateTitle}>Katalog Barang Kosong</Text>
              <Text style={styles.emptyStateDesc}>
                Toko ini belum memiliki produk.{isAdmin ? '\nTekan tab Stok Barang → Tambah Barang untuk mulai mengisi.' : '\nHubungi Admin Toko untuk menambah produk.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(i) => i.id.toString()}
              numColumns={isTablet ? 3 : 2}
              key={isTablet ? 'tablet-grid' : 'mobile-grid'}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.gridProdCard, item.stock <= 0 && { opacity: 0.4 }]}
                  onPress={() => addToCart(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.gridProdStockBadge}>
                    <Text style={{ fontSize: 9, color: item.stock > 5 ? '#10b981' : item.stock > 0 ? '#f59e0b' : '#ef4444', fontWeight: '700' }}>
                      {item.stock > 0 ? `${item.stock} pcs` : 'HABIS'}
                    </Text>
                  </View>
                  <Text style={styles.gridProdName} numberOfLines={2}>{item.name}</Text>
                  {['minimarket', 'supermarket', 'apotek', 'klinik', 'skincare_kosmetik', 'sayur_buah', 'bahan_kue'].includes(storeType) && item.expiry_date && (
                    <Text style={{ fontSize: 9, color: (new Date(item.expiry_date).getTime() < Date.now() + 30*24*60*60*1000) ? '#ef4444' : '#64748b', fontWeight: '800', marginTop: 2 }}>
                      Exp: {item.expiry_date}
                    </Text>
                  )}
                  <Text style={styles.gridProdPrice}>Rp{item.sale_price.toLocaleString('id-ID')}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          </View>

          {/* Cart & Checkout Panel */}
          <View style={[styles.cartPanel, isTablet && { flex: 1, height: '100%', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 1, borderLeftColor: '#047857' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>
                Keranjang POS ({cart.length} item)
              </Text>
              {cart.length > 0 && !['bengkel', 'cuci_mobil', 'jasa_servis', 'laundry', 'salon', 'barbershop', 'studio_foto', 'percetakan'].includes(storeType) && (
                <TouchableOpacity onPress={holdBill} style={{ backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>Hold Bill</Text>
                </TouchableOpacity>
              )}
              {cart.length === 0 && heldBills.length > 0 && (
                <TouchableOpacity onPress={() => loadBill(0)} style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>Load Bill ({heldBills.length})</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={isTablet ? { flex: 1 } : { maxHeight: 110 }}>
              {cart.map((item, cIdx) => (
                <View key={cIdx} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    {item.selected_variants && item.selected_variants.length > 0 && (
                      <Text style={{ color: '#10b981', fontSize: 10, marginTop: 2 }}>
                        {item.selected_variants.join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.product.id, item.selected_variants?.join(', '), -1)}>
                      <Text style={{ color: '#fff', fontWeight: '800' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.product.id, item.selected_variants?.join(', '), 1)}>
                      <Text style={{ color: '#fff', fontWeight: '800' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 12, marginLeft: 12 }}>
                    Rp{item.subtotal.toLocaleString('id-ID')}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.checkoutBar}>
              <View>
                <Text style={{ fontSize: 10, color: '#94a3b8' }}>Total Tagihan:</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#10b981' }}>
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
            <TouchableOpacity 
              style={{ marginTop: 12, alignItems: 'center' }}
              onPress={() => {
                setShiftAction('close');
                setClosingCash('');
                setShiftModalVisible(true);
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>Tutup Shift Kasir</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TAB CONTENT 3: PRODUCTS INVENTORY */}
      {activeTab === 'products' && (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.screenHeader}>Daftar Stok Barang ({products.length})</Text>
            {isAdmin && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={[styles.smallAddBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleAiCamera} disabled={aiProcessing}>
                  {aiProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{aiProcessing ? 'Proses AI...' : 'Foto AI'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallAddBtn} onPress={() => setAddProductModalVisible(true)}>
                  <Ionicons name="add" size={16} color="#000" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>Manual</Text>
                </TouchableOpacity>
              </View>
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
                  {['minimarket', 'supermarket', 'apotek', 'klinik', 'skincare_kosmetik', 'sayur_buah', 'bahan_kue'].includes(storeType) && item.expiry_date && (
                    <Text style={{ fontSize: 10, color: (new Date(item.expiry_date).getTime() < Date.now() + 30*24*60*60*1000) ? '#ef4444' : '#94a3b8', fontWeight: '700', marginTop: 2 }}>
                      Exp: {item.expiry_date} {(new Date(item.expiry_date).getTime() < Date.now() + 30*24*60*60*1000) && '(Segera Kedaluwarsa)'}
                    </Text>
                  )}
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
                      <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>Restock</Text>
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
        <View style={{ flex: 1, padding: 16 }}>
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
                {/* TAB CONTENT 5: RIWAYAT TRANSAKSI PENJUALAN */}
      {activeTab === 'history' && (
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={styles.screenHeader}>Riwayat Penjualan ({transactions.length})</Text>
          <FlatList
            data={transactions}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={styles.inventoryRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="receipt-outline" size={16} color="#10b981" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.id}</Text>
                  </View>
                  <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Tanggal: {item.created_at}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                    Kasir: {item.cashier_name || 'Admin'} • {item.items_count} item • Metoda: {item.payment_method}
                    {item.pb1_applied && ' • (PB1 10%)'}
                    {item.spg_name && ` • SPG: ${item.spg_name}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 14 }}>
                    Rp{item.total_amount.toLocaleString('id-ID')}
                  </Text>
                  {item.split_bill_ways && item.split_bill_ways > 1 && (
                    <Text style={{ color: '#f59e0b', fontSize: 10, marginTop: 2, fontWeight: '700' }}>
                      Split {item.split_bill_ways}x: Rp{(item.total_amount / item.split_bill_ways).toLocaleString('id-ID')}/org
                    </Text>
                  )}
                  {item.payment_method === 'KASBON' ? (
                    <>
                      <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 2, fontWeight: '700' }}>BELUM LUNAS (KASBON)</Text>
                      {item.customer_phone && (
                        <TouchableOpacity
                          style={{ marginTop: 4, backgroundColor: '#25D366', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => {
                            const message = `Halo ${item.customer_name || 'Kak'},\nIni dari SiKasir. Total tagihan Kasbon Anda adalah Rp${item.total_amount.toLocaleString('id-ID')}. Mohon untuk segera diselesaikan. Terima kasih.`;
                            Linking.openURL(`whatsapp://send?phone=${item.customer_phone}&text=${encodeURIComponent(message)}`).catch(() => {
                              Alert.alert('Error', 'Gagal membuka WhatsApp. Pastikan aplikasi terinstall.');
                            });
                          }}
                        >
                          <Ionicons name="logo-whatsapp" size={12} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Follow Up WA</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={{ color: '#10b981', fontSize: 10, marginTop: 2 }}>
                        Bayar: Rp{item.paid_amount.toLocaleString('id-ID')}
                      </Text>
                      {item.is_refunded ? (
                        <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: '900' }}>[ DIRETUR ]</Text>
                      ) : (
                        !['cafe', 'resto', 'warteg', 'street_food', 'bakery'].includes(storeType) && isAdmin && (
                          <TouchableOpacity
                            style={{ marginTop: 4, backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
                            onPress={() => handleRefund(item.id)}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Retur Barang</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </>
                  )}
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* TAB CONTENT 6: LOG BARANG MASUK (RESTOCK SUPPLIER) */}
      {activeTab === 'incoming' && (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.screenHeader}>Log Penerimaan Barang Masuk ({incomingLogs.length})</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.smallAddBtn} onPress={() => setAddIncomingModalVisible(true)}>
                <Ionicons name="add-circle" size={16} color="#000" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>Catat Masuk</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={incomingLogs}
            keyExtractor={(i) => i.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.inventoryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.item_name}</Text>
                  <Text style={{ color: '#10b981', fontSize: 11, marginTop: 2 }}>Supplier: {item.supplier_name}</Text>
                  <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Tgl: {item.created_at} • Catatan: {item.notes || '-'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 13 }}>+{item.quantity} pcs</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>@Rp{item.unit_price.toLocaleString('id-ID')}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* TAB CONTENT 7: LOG AUDIT (ADMIN ONLY) */}
      {activeTab === 'audit' && (
        <View style={{ flex: 1, padding: 16 }}>
          {!isAdmin ? (
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed" size={48} color="#ef4444" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 }}>Akses Terkunci</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 6 }}>Log Audit hanya dapat diakses oleh Admin Toko.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.screenHeader}>Log Audit Aktivitas System ({auditLogs.length})</Text>
              <FlatList
                data={auditLogs}
                keyExtractor={(i) => i.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.inventoryRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>[{item.action}]</Text>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.username}</Text>
                      </View>
                      <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{item.details}</Text>
                      <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>IP: {item.ip_address} • {item.created_at}</Text>
                    </View>
                  </View>
                )}
              />
            </>
          )}
        </View>
      )}

      {/* TAB CONTENT 8: KEAMANAN TOKO & CYBERSECURITY SENTINEL */}
      {activeTab === 'cybersecurity' && (
        <ScrollView style={{ flex: 1, padding: 14 }}>
          <Text style={styles.screenHeader}>Status Keamanan & Firewall Toko</Text>

          <View style={[styles.card, { marginTop: 8, borderColor: '#10b981' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="shield-checkmark" size={32} color="#10b981" />
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>
                  FIREWALL {cyberStatus?.firewall_status || 'ACTIVE'}
                </Text>
                <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '700' }}>Toko Terlindungi dari Cyber Attack</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Enkripsi SSL / TLS:</Text>
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 12 }}>AKTIF (256-bit)</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Rate Limiting DDoS Protection:</Text>
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 12 }}>AKTIF (100 req/min)</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Percobaan Akses Diblokir (24j):</Text>
                <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 12 }}>{cyberStatus?.blocked_attempts_24h || 14} Serangan</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Tingkat Ancaman (Threat Level):</Text>
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 12 }}>RENDAH (SAFE)</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* BOTTOM TAB BAR SWITCHER — ALL 8 TABS (100% PARITY WITH WEB DESKTOP) */}
      <View style={styles.bottomTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 4 }}>
          {/* 1. Kasir POS */}
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'kasir' && styles.tabItemActive, { minWidth: 64 }]}
            onPress={() => setActiveTab('kasir')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cash-register" size={22} color={activeTab === 'kasir' ? '#10b981' : '#64748b'} />
            <Text style={[styles.tabLabel, activeTab === 'kasir' && styles.tabLabelActive]}>Kasir</Text>
          </TouchableOpacity>

          {/* 2. Riwayat Transaksi */}
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive, { minWidth: 64 }]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={20} color={activeTab === 'history' ? '#10b981' : '#64748b'} />
            <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>Riwayat</Text>
          </TouchableOpacity>

          {/* 3. Stok Barang */}
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive, { minWidth: 64 }]}
            onPress={() => setActiveTab('products')}
            activeOpacity={0.7}
          >
            <Ionicons name="cube-outline" size={20} color={activeTab === 'products' ? '#10b981' : '#64748b'} />
            <Text style={[styles.tabLabel, activeTab === 'products' && styles.tabLabelActive]}>Stok</Text>
          </TouchableOpacity>

          {/* 4. Barang Masuk */}
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'incoming' && styles.tabItemActive, { minWidth: 64 }]}
            onPress={() => setActiveTab('incoming')}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={20} color={activeTab === 'incoming' ? '#10b981' : '#64748b'} />
            <Text style={[styles.tabLabel, activeTab === 'incoming' && styles.tabLabelActive]}>Masuk</Text>
          </TouchableOpacity>

          {['cafe', 'resto', 'warteg', 'street_food', 'bakery'].includes(storeType) && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'kds' && styles.tabItemActive, { minWidth: 64 }]}
              onPress={() => setActiveTab('kds')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="chef-hat"
                size={20}
                color={activeTab === 'kds' ? '#10b981' : '#64748b'}
              />
              <Text style={[styles.tabLabel, activeTab === 'kds' && styles.tabLabelActive]}>Dapur KDS</Text>
            </TouchableOpacity>
          )}

          {/* 5. Dashboard (Admin Only) */}
          {isAdmin && (
            <>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive, { minWidth: 64 }]}
                onPress={() => setActiveTab('dashboard')}
                activeOpacity={0.7}
              >
                <Ionicons name="bar-chart-outline" size={20} color={activeTab === 'dashboard' ? '#10b981' : '#64748b'} />
                <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>Laporan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'adminTools' && styles.tabItemActive, { minWidth: 64 }]}
                onPress={() => setActiveTab('adminTools')}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={20} color={activeTab === 'adminTools' ? '#10b981' : '#64748b'} />
                <Text style={[styles.tabLabel, activeTab === 'adminTools' && styles.tabLabelActive]}>Alat Admin</Text>
              </TouchableOpacity>
            </>
          )}

          {/* 6. Staf Kasir (Admin Only) */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'users' && styles.tabItemActive, { minWidth: 64 }]}
              onPress={() => setActiveTab('users')}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={20} color={activeTab === 'users' ? '#10b981' : '#64748b'} />
              <Text style={[styles.tabLabel, activeTab === 'users' && styles.tabLabelActive]}>Staf</Text>
            </TouchableOpacity>
          )}

          {/* 7. Log Audit (Admin Only) */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'audit' && styles.tabItemActive, { minWidth: 64 }]}
              onPress={() => setActiveTab('audit')}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={20} color={activeTab === 'audit' ? '#10b981' : '#64748b'} />
              <Text style={[styles.tabLabel, activeTab === 'audit' && styles.tabLabelActive]}>Audit</Text>
            </TouchableOpacity>
          )}

          {/* 8. Keamanan Toko (Admin Only) */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'cybersecurity' && styles.tabItemActive, { minWidth: 64 }]}
              onPress={() => setActiveTab('cybersecurity')}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-outline" size={20} color={activeTab === 'cybersecurity' ? '#10b981' : '#64748b'} />
              <Text style={[styles.tabLabel, activeTab === 'cybersecurity' && styles.tabLabelActive]}>Keamanan</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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

      {/* MUTASI CABANG MODAL */}
      <Modal visible={mutasiModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mutasi Stok Antar Cabang</Text>
            
            <Text style={styles.label}>Pilih Cabang Tujuan</Text>
            <ScrollView style={{ maxHeight: 100, marginBottom: 12 }}>
              {MOCK_TENANTS.filter(t => t.company_id === currentTenant?.company_id && t.id !== currentTenant?.id).map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={{
                    padding: 10,
                    backgroundColor: mutasiDestTenantId === t.id ? 'rgba(245, 158, 11, 0.1)' : '#047857',
                    borderWidth: 1,
                    borderColor: mutasiDestTenantId === t.id ? '#f59e0b' : '#334155',
                    borderRadius: 16,
                    marginBottom: 6
                  }}
                  onPress={() => setMutasiDestTenantId(t.id)}
                >
                  <Text style={{ color: mutasiDestTenantId === t.id ? '#f59e0b' : '#fff', fontWeight: '700' }}>
                    {t.name} (Tipe: {t.store_type})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Pilih Produk untuk Dimutasi</Text>
            <ScrollView style={{ maxHeight: 120, marginBottom: 12 }}>
              {products.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={{
                    padding: 10,
                    backgroundColor: mutasiProductId === p.id ? 'rgba(16, 185, 129, 0.1)' : '#047857',
                    borderWidth: 1,
                    borderColor: mutasiProductId === p.id ? '#10b981' : '#334155',
                    borderRadius: 16,
                    marginBottom: 6
                  }}
                  onPress={() => setMutasiProductId(p.id)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: mutasiProductId === p.id ? '#10b981' : '#fff', fontWeight: '700' }}>{p.name}</Text>
                    <Text style={{ color: '#94a3b8' }}>Stok: {p.stock}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Jumlah (Pcs)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: 10"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={mutasiQty}
              onChangeText={setMutasiQty}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setMutasiModalVisible(false);
                setMutasiDestTenantId(null);
                setMutasiProductId(null);
                setMutasiQty('');
              }}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#f59e0b' }]} onPress={handleMutasi}>
                <Text style={styles.primaryBtnText}>KIRIM STOK</Text>
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
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>Total: Rp {totalAmount.toLocaleString('id-ID')}</Text>

            <Text style={styles.label}>Metode Pembayaran</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['CASH', 'QRIS', 'KASBON'] as const).map(method => (
                <TouchableOpacity
                  key={method}
                  style={[styles.chip, paymentMethod === method && styles.chipActive, { flex: 1, paddingHorizontal: 0, justifyContent: 'center' }]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[styles.chipText, paymentMethod === method && styles.chipTextActive, { textAlign: 'center' }]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {['cafe', 'resto', 'warteg', 'street_food', 'bakery'].includes(storeType) && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.label}>Pajak PB1 (10%)</Text>
                  <TouchableOpacity
                    style={[styles.chip, applyPB1 && styles.chipActive]}
                    onPress={() => setApplyPB1(!applyPB1)}
                  >
                    <Text style={[styles.chipText, applyPB1 && styles.chipTextActive]}>{applyPB1 ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Split Bill (Bagi Tagihan)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity style={styles.smallAddBtn} onPress={() => setSplitBillWays(Math.max(1, splitBillWays - 1))}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#000' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{splitBillWays} Orang</Text>
                    <TouchableOpacity style={styles.smallAddBtn} onPress={() => setSplitBillWays(splitBillWays + 1)}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#000' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {splitBillWays > 1 && (
                    <Text style={{ color: '#10b981', fontSize: 12, marginTop: 6, fontWeight: '700' }}>
                      Per Orang: Rp {(totalAmount / splitBillWays).toLocaleString('id-ID')}
                    </Text>
                  )}
                </View>
              </>
            )}

            {['fashion', 'bangunan', 'counter', 'bengkel', 'cuci_mobil', 'elektronik_rumah_tangga', 'toko_komputer', 'jasa_servis', 'toko_emas', 'toko_jam', 'optik', 'sepatu_sandal', 'percetakan'].includes(storeType) && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Sales / SPG (Opsional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nama Sales / SPG / Mekanik..."
                  placeholderTextColor="#64748b"
                  value={spgName} 
                  onChangeText={setSpgName} 
                />
              </View>
            )}

            {paymentMethod !== 'KASBON' && (
              <>
                <Text style={styles.label}>Jumlah Uang Diterima (Rp)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Masukkan nominal..."
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                />
              </>
            )}

            {paymentMethod === 'KASBON' && (
              <>
                <Text style={styles.label}>Pilih Pelanggan Kasbon Global</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>
                  Limit kasbon tergabung untuk semua cabang di grup {currentTenant?.company_id ? 'ini' : ''}.
                </Text>
                <ScrollView style={{ maxHeight: 120, marginBottom: 16 }}>
                  {MOCK_CUSTOMERS.filter(c => c.company_id === currentTenant?.company_id).map(cust => (
                    <TouchableOpacity
                      key={cust.id}
                      style={{
                        padding: 16,
                        backgroundColor: selectedCustomerId === cust.id ? 'rgba(16, 185, 129, 0.1)' : '#047857',
                        borderWidth: 1,
                        borderColor: selectedCustomerId === cust.id ? '#10b981' : '#334155',
                        borderRadius: 16,
                        marginBottom: 8
                      }}
                      onPress={() => setSelectedCustomerId(cust.id)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: selectedCustomerId === cust.id ? '#10b981' : '#fff', fontWeight: '700' }}>{cust.name}</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>{cust.phone}</Text>
                      </View>
                      <Text style={{ color: cust.kasbon_balance + totalAmount > cust.kasbon_limit ? '#ef4444' : '#10b981', fontSize: 11, marginTop: 4 }}>
                        Terpakai: Rp {cust.kasbon_balance.toLocaleString('id-ID')} / Rp {cust.kasbon_limit.toLocaleString('id-ID')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

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

      {/* VARIANT MODAL */}
      <Modal visible={variantModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih Varian: {selectedProductForVariant?.name}</Text>
            {selectedProductForVariant?.variants?.map((group, gIdx) => (
              <View key={gIdx} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{group.group_name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {group.options.map((opt, oIdx) => {
                    const isSelected = selectedVariants[group.group_name]?.name === opt.name;
                    return (
                      <TouchableOpacity
                        key={oIdx}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: isSelected ? '#10b981' : '#334155',
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : '#064e3b',
                        }}
                        onPress={() => setSelectedVariants(prev => ({ ...prev, [group.group_name]: opt }))}
                      >
                        <Text style={{ color: isSelected ? '#10b981' : '#94a3b8', fontSize: 13, fontWeight: '700' }}>
                          {opt.name} {opt.price_diff > 0 ? `(+Rp${opt.price_diff.toLocaleString('id-ID')})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setVariantModalVisible(false);
                setSelectedProductForVariant(null);
                setSelectedVariants({});
              }}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={() => {
                  if (selectedProductForVariant) {
                    addToCart(selectedProductForVariant, selectedVariants);
                    setVariantModalVisible(false);
                    setSelectedProductForVariant(null);
                    setSelectedVariants({});
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>TAMBAH KE KERANJANG</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CATAT BARANG MASUK MODAL */}
      <Modal visible={addIncomingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Catat Barang Masuk (Restock Supplier)</Text>
            <Text style={styles.label}>Nama Supplier *</Text>
            <TextInput style={styles.modalInput} placeholder="Misal: PT Sampoerna Distribusi" placeholderTextColor="#64748b" value={incSupplier} onChangeText={setIncSupplier} />
            <Text style={[styles.label, { marginTop: 8 }]}>Nama Barang *</Text>
            <TextInput style={styles.modalInput} placeholder="Nama barang..." placeholderTextColor="#64748b" value={incItem} onChangeText={setIncItem} />
            <Text style={[styles.label, { marginTop: 8 }]}>Jumlah Masuk (Pcs) *</Text>
            <TextInput style={styles.modalInput} placeholder="100" placeholderTextColor="#64748b" keyboardType="numeric" value={incQty} onChangeText={setIncQty} />
            <Text style={[styles.label, { marginTop: 8 }]}>Harga Satuan Beli (Rp) *</Text>
            <TextInput style={styles.modalInput} placeholder="28000" placeholderTextColor="#64748b" keyboardType="numeric" value={incPrice} onChangeText={setIncPrice} />
            <Text style={[styles.label, { marginTop: 8 }]}>Catatan (Opsional)</Text>
            <TextInput style={styles.modalInput} placeholder="Misal: Restock Dus Karton" placeholderTextColor="#64748b" value={incNotes} onChangeText={setIncNotes} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddIncomingModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateIncomingLog}>
                <Text style={styles.primaryBtnText}>CATAT MASUK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shift Modal */}
      <Modal visible={shiftModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{shiftAction === 'open' ? 'Buka Shift Kasir' : 'Tutup Shift Kasir'}</Text>
            <Text style={[styles.label, { marginTop: 12 }]}>{shiftAction === 'open' ? 'Uang Modal Awal (Rp)' : 'Total Uang di Laci (Rp)'}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
              value={shiftAction === 'open' ? openingCash : closingCash}
              onChangeText={shiftAction === 'open' ? setOpeningCash : setClosingCash}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShiftModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  if (shiftAction === 'open') {
                    setShiftStatus('open');
                  } else {
                    setShiftStatus('closed');
                  }
                  setShiftModalVisible(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{shiftAction === 'open' ? 'Buka Shift' : 'Tutup Shift'}</Text>
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
          onSwitchTab={setActiveTab}
        />
      )}

      {/* HEAVY DUTY CAMERA BARCODE SCANNER MODAL */}
      <HeavyDutyBarcodeScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onScanResult={handleBarcodeScanned}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#064e3b',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
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
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b981',
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
    color: '#10b981',
  },
  roleBadgeTextKasir: {
    color: '#10b981',
  },
  logoutBtn: {
    padding: 6,
    backgroundColor: '#ef444415',
    borderRadius: 16,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  aiPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064e3b',
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
    backgroundColor: '#022c22',
    borderWidth: 1,
    borderColor: '#10b98133',
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
    backgroundColor: '#022c22',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#047857',
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
    backgroundColor: '#047857',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  chipText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  chipTextActive: {
    color: '#10b981',
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
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleSelectBtnActive: {
    backgroundColor: '#10b98115',
    borderColor: '#10b981',
  },
  roleSelectText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  roleSelectTextActive: {
    color: '#10b981',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10b98166',
    borderRadius: 16,
    height: 48,
    marginTop: 12,
    backgroundColor: '#10b98110',
  },
  secondaryRegBtnText: {
    color: '#10b981',
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
    backgroundColor: '#022c22',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#047857',
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
    borderBottomColor: '#047857',
  },
  gridProdCard: {
    flex: 1,
    backgroundColor: '#022c22',
    borderRadius: 14,
    padding: 16,
    margin: 5,
    borderWidth: 1,
    borderColor: '#047857',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  gridProdStockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#047857',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 6,
  },
  gridProdName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 17,
    flex: 1,
  },
  gridProdPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 6,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#022c22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 48,
    margin: 12,
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#475569',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyStateDesc: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  cartPanel: {
    backgroundColor: '#0a0e17',
    borderTopWidth: 1.5,
    borderTopColor: '#047857',
    padding: 14,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  qtyBtn: {
    backgroundColor: '#047857',
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
    borderTopColor: '#047857',
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#022c22',
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#047857',
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAdmin: {
    backgroundColor: '#10b98133',
  },
  avatarKasir: {
    backgroundColor: '#10b98133',
  },
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  restockSmallBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0d1117',
    borderTopWidth: 1,
    borderTopColor: '#047857',
    // Tall enough to be tappable + extra for Android nav bar
    paddingBottom: Platform.OS === 'android' ? 8 : 20,
    paddingTop: 6,
    minHeight: 64,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 52,
  },
  tabItemActive: {
    borderTopWidth: 2.5,
    borderTopColor: '#10b981',
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#10b981',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#022c22',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#047857',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#064e3b',
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
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

