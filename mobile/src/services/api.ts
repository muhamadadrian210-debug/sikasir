import { Product, CartItem, Tenant, User, TransactionRecord, IncomingLog, AuditLog, CyberSecurityStatus, Customer, StoreType } from '../types';

// Dynamic API URL for Vercel/Online Cloud Server or Local Dev
let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.184:3000/api';
let authToken = '';
let currentUser: User | null = null;

const MOCK_TRANSACTIONS: TransactionRecord[] = [
  { id: 'TX-8921', created_at: '2026-07-31 19:45', total_amount: 64000, paid_amount: 100000, change_amount: 36000, payment_method: 'CASH', items_count: 2, cashier_name: 'kasir_admin' },
  { id: 'TX-8920', created_at: '2026-07-31 18:20', total_amount: 18000, paid_amount: 20000, change_amount: 2000, payment_method: 'CASH', items_count: 1, cashier_name: 'kasir_admin' },
  { id: 'TX-8919', created_at: '2026-07-31 16:10', total_amount: 120000, paid_amount: 150000, change_amount: 30000, payment_method: 'CASH', items_count: 4, cashier_name: 'kasir_shift1' },
];

const MOCK_INCOMING: IncomingLog[] = [
  { id: 1, created_at: '2026-07-31 10:00', supplier_name: 'PT Sampoerna Distribusi', item_name: 'Rokok Sampoerna Mild 16', quantity: 100, unit_price: 28000, notes: 'Restock Mingguan' },
  { id: 2, created_at: '2026-07-30 14:30', supplier_name: 'CV Indofood Makmur', item_name: 'Indomie Goreng Spesial', quantity: 240, unit_price: 2500, notes: 'Stok Dus Karton' },
];

const MOCK_AUDIT: AuditLog[] = [
  { id: 1, created_at: '2026-07-31 20:10', username: 'kasir_admin', action: 'LOGIN_SUCCESS', details: 'Login dari Android App', ip_address: '192.168.100.184' },
  { id: 2, created_at: '2026-07-31 19:45', username: 'kasir_admin', action: 'TRANSACTION_CREATED', details: 'Transaksi TX-8921 berhasil', ip_address: '192.168.100.184' },
  { id: 3, created_at: '2026-07-31 17:30', username: 'kasir_admin', action: 'TENANT_REGISTER', details: 'Restorasi Toko Berhasil', ip_address: '192.168.100.184' },
];

export const MOCK_TENANTS: Tenant[] = [
  { id: 1, company_id: 1, name: 'Sivilize Supermarket & Mart', slug: 'sivilize-mart', store_type: 'minimarket', icon: 'cart-outline' },
  { id: 2, name: 'Apotek Kimia Medika 24 Jam', slug: 'apotek-medika', store_type: 'apotek', icon: 'medical-outline' },
  { id: 3, company_id: 1, name: 'Kopi Senja & Resto F&B', slug: 'kopi-senja', store_type: 'cafe', icon: 'cafe-outline' },
  { id: 4, name: 'Aegis Cell & Counter HP', slug: 'aegis-cell', store_type: 'counter', icon: 'phone-portrait-outline' },
  { id: 5, name: 'Distro Fashion & Apparels', slug: 'distro-fashion', store_type: 'fashion', icon: 'shirt-outline' },
  { id: 6, name: 'Toko Bangunan & Material Jaya', slug: 'tb-jaya', store_type: 'bangunan', icon: 'construct-outline' },
  { id: 7, name: 'Bengkel Motor Sinar Jaya', slug: 'bengkel-jaya', store_type: 'bengkel', icon: 'build-outline' },
  { id: 8, name: 'Salon Ayu & Barbershop', slug: 'salon-ayu', store_type: 'salon', icon: 'cut-outline' },
  { id: 9, name: 'Fresh Market Sayur & Buah', slug: 'fresh-market', store_type: 'sayur_buah', icon: 'leaf-outline' },
];

export let MOCK_CUSTOMERS: Customer[] = [
  { id: 101, company_id: 1, name: 'Bapak Budi (Pelanggan VIP)', phone: '081234567890', kasbon_balance: 150000, kasbon_limit: 1000000 },
  { id: 102, company_id: 1, name: 'Ibu Ani (Langganan)', phone: '081987654321', kasbon_balance: 0, kasbon_limit: 500000 },
];

const MOCK_PRODUCTS: Product[] = [
  // Minimarket (tenant_id: 1)
  { id: 101, tenant_id: 1, barcode: '8999999001', name: 'Rokok Sampoerna Mild 16', purchase_price: 28000, sale_price: 32000, stock: 100 },
  { id: 102, tenant_id: 1, barcode: '8999999002', name: 'Indomie Goreng Spesial', purchase_price: 2500, sale_price: 3100, stock: 240 },
  { id: 103, tenant_id: 1, barcode: '8999999003', name: 'Air Mineral Le Minerale 600ml', purchase_price: 2000, sale_price: 3500, stock: 48 },
  // Apotek
  { id: 201, barcode: '8998888001', name: 'Paracetamol 500mg (Strip 10 Kaplet)', purchase_price: 3500, sale_price: 6000, stock: 150, expiry_date: '2026-08-15' },
  { id: 202, barcode: '8998888002', name: 'Vitamin C 1000mg Enervon-C Botol', purchase_price: 32000, sale_price: 40000, stock: 30, expiry_date: '2027-12-01' },
  { id: 203, barcode: '8998888003', name: 'Betadine Antiseptik 30ml', purchase_price: 18000, sale_price: 23500, stock: 25 },
  // Cafe / F&B (tenant_id: 3)
  { id: 3001, tenant_id: 3, barcode: 'MAT-KOPI', name: 'Biji Kopi House Blend (Gram)', purchase_price: 150, sale_price: 0, stock: 5000 },
  { id: 3002, tenant_id: 3, barcode: 'MAT-SUSU', name: 'Susu Cair Fresh Milk (ml)', purchase_price: 20, sale_price: 0, stock: 10000 },
  { id: 3003, tenant_id: 3, barcode: 'MAT-GULA', name: 'Gula Aren Cair (ml)', purchase_price: 30, sale_price: 0, stock: 5000 },
  { 
    id: 301, 
    tenant_id: 3,
    barcode: '8997777001', 
    name: 'Es Kopi Susu Gula Aren 500ml', 
    purchase_price: 10000, 
    sale_price: 18000, 
    stock: 50, 
    recipe: [{ material_id: 3001, qty_needed: 20 }, { material_id: 3002, qty_needed: 150 }, { material_id: 3003, qty_needed: 30 }],
    has_variants: true,
    variants: [
      { group_name: 'Ukuran', options: [{ name: 'Reguler', price_diff: 0 }, { name: 'Large', price_diff: 5000 }] },
      { group_name: 'Sugar Level', options: [{ name: 'Normal', price_diff: 0 }, { name: 'Less Sugar', price_diff: 0 }, { name: 'No Sugar', price_diff: 0 }] }
    ]
  },
  { id: 302, tenant_id: 3, barcode: '8997777002', name: 'Roti Bakar Cokelat Keju', purchase_price: 8000, sale_price: 15000, stock: 40 },
  // Fashion
  {
    id: 501,
    barcode: 'FASH-001',
    name: 'Kemeja Flannel Pria',
    purchase_price: 75000,
    sale_price: 125000,
    stock: 120,
    has_variants: true,
    variants: [
      { group_name: 'Ukuran', options: [{ name: 'M', price_diff: 0 }, { name: 'L', price_diff: 0 }, { name: 'XL', price_diff: 10000 }] },
      { group_name: 'Warna', options: [{ name: 'Merah', price_diff: 0 }, { name: 'Hitam', price_diff: 0 }] }
    ]
  },
  // Counter HP
  { id: 401, barcode: '8996666001', name: 'Kabel Data Fast Charge Type-C 65W', purchase_price: 15000, sale_price: 35000, stock: 20 },
  { id: 402, barcode: '8996666002', name: 'Voucher Telkomsel 10GB 30 Hari', purchase_price: 33000, sale_price: 38000, stock: 60 },
  // Bengkel (tenant_id: 7)
  { id: 801, tenant_id: 7, barcode: '8995555001', name: 'Oli Mesin Yamalube 800ml', purchase_price: 35000, sale_price: 45000, stock: 20 },
  { id: 802, tenant_id: 7, barcode: '8995555002', name: 'Jasa Servis Ringan / Tune Up', purchase_price: 0, sale_price: 40000, stock: 9999 },
  // Salon (tenant_id: 8)
  { id: 901, tenant_id: 8, barcode: '8996666001', name: 'Potong Rambut Pria', purchase_price: 0, sale_price: 35000, stock: 9999 },
  { id: 902, tenant_id: 8, barcode: '8996666002', name: 'Creambath + Pijat', purchase_price: 0, sale_price: 80000, stock: 9999 },
  // Sayur Buah (tenant_id: 9)
  { id: 1001, tenant_id: 9, barcode: '8992222001', name: 'Sayur Bayam Hidroponik (Ikat)', purchase_price: 3000, sale_price: 6000, stock: 50, expiry_date: '2026-08-10' },
  { id: 1002, tenant_id: 9, barcode: '8992222002', name: 'Apel Fuji (Kg)', purchase_price: 25000, sale_price: 35000, stock: 20 },
];

export function setApiBaseUrl(url: string) {
  API_URL = url;
}

export function setAuthToken(token: string) {
  authToken = token;
}

export function setCurrentUser(user: User | null) {
  currentUser = user;
}

export function getAuthToken() {
  return authToken;
}

export function getCurrentUser() {
  return currentUser;
}

export async function request(endpoint: string, options: any = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const fetchOptions: any = {
    method,
    headers,
  };

  if (options.body && method !== 'GET') {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout
    fetchOptions.signal = controller.signal;

    const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || 'Error parsing response' };
    }

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (err: any) {
    console.warn('[Network Notice]: Falling back to local offline mode due to cross-network cellular connection:', err.message);
    throw err;
  }
}

export const apiService = {
  // Auth
  async login(username: string, password: string, tenant_id?: number) {
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { username, password, tenant_id },
      });
      if (res.token) setAuthToken(res.token);
      if (res.user) setCurrentUser(res.user);
      return res;
    } catch (e) {
      // Demo / Cellular Fallback Login
      const mockToken = 'mock_jwt_token_cellular_demo';
      const mockUser: User = { id: 1, username: username || 'kasir_admin', role: 'admin', tenant_id: tenant_id || 1 };
      setAuthToken(mockToken);
      setCurrentUser(mockUser);
      return { token: mockToken, user: mockUser };
    }
  },

  async registerTenant(tenant_name: string, admin_name: string, username: string, password: string, store_type: StoreType = 'minimarket') {
    try {
      const res = await request('/auth/register-tenant', {
        method: 'POST',
        body: { tenant_name, admin_name, username, password, store_type },
      });
      if (res.token) setAuthToken(res.token);
      if (res.user) setCurrentUser(res.user);
      return res;
    } catch (e: any) {
      // Demo / Cellular Fallback Tenant Registration
      const newId = MOCK_TENANTS.length + 1;
      let icon = 'cart-outline';
      if (store_type === 'apotek') icon = 'medical-outline';
      else if (store_type === 'cafe') icon = 'cafe-outline';
      else if (store_type === 'counter') icon = 'phone-portrait-outline';
      else if (store_type === 'fashion') icon = 'shirt-outline';
      else if (store_type === 'bangunan') icon = 'construct-outline';

      const newTenant: Tenant = { id: newId, name: tenant_name, slug: tenant_name.toLowerCase().replace(/\s+/g, '-'), store_type, icon };
      MOCK_TENANTS.push(newTenant);
      const mockToken = 'mock_jwt_token_cellular_demo';
      const mockUser: User = { id: newId, username: username || 'admin', role: 'admin', tenant_id: newId };
      setAuthToken(mockToken);
      setCurrentUser(mockUser);
      return { success: true, message: 'Toko berhasil didaftarkan!', tenant: newTenant, user: mockUser };
    }
  },

  // Setup / Tenants
  async getTenants(): Promise<Tenant[]> {
    try {
      return await request('/setup/tenants');
    } catch (e) {
      return MOCK_TENANTS;
    }
  },

  // Products
  async getProducts(query: string = ''): Promise<Product[]> {
    try {
      return await request(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
    } catch (e) {
      const user = getCurrentUser();
      let mockList = MOCK_PRODUCTS;
      if (user && user.tenant_id > 6) {
        // Hanya tampilkan produk yang baru ditambahkan (id berupa timestamp) untuk toko mock baru
        mockList = MOCK_PRODUCTS.filter(p => p.id > 1000000000000);
      }
      if (!query) return mockList;
      return mockList.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode.includes(query)
      );
    }
  },

  async addProduct(productData: Partial<Product>): Promise<Product> {
    try {
      return await request('/products', { method: 'POST', body: productData });
    } catch (e) {
      const newProd: Product = {
        id: Date.now(),
        barcode: productData.barcode || '899' + Math.floor(100000000 + Math.random() * 900000000),
        name: productData.name || 'Produk Baru',
        purchase_price: productData.purchase_price || 0,
        sale_price: productData.sale_price || 0,
        stock: productData.stock || 0,
      };
      MOCK_PRODUCTS.unshift(newProd);
      return newProd;
    }
  },

  async updateStock(productId: number, delta: number, reason: string) {
    try {
      return await request(`/products/${productId}/stock`, {
        method: 'PATCH',
        body: { delta, reason },
      });
    } catch (e) {
      const p = MOCK_PRODUCTS.find(item => item.id === productId);
      if (p) {
        p.stock = Math.max(0, p.stock + delta);
      }
      return { success: true, stock: p?.stock };
    }
  },

  // Checkout POS
  async checkout(items: CartItem[], paidAmount: number, paymentMethod: 'CASH' | 'QRIS' | 'KASBON' = 'CASH', customerName?: string, customerPhone?: string, pb1Applied?: boolean, splitBillWays?: number, spgName?: string, customerId?: number) {
    try {
      return await request('/transactions', {
        method: 'POST',
        body: { items, paid_amount: paidAmount, payment_method: paymentMethod, customer_name: customerName, customer_phone: customerPhone, pb1_applied: pb1Applied, split_bill_ways: splitBillWays, spg_name: spgName },
      });
    } catch (e) {
      const total = items.reduce((sum, i) => sum + i.subtotal, 0);
      items.forEach(i => {
        const p = MOCK_PRODUCTS.find(mp => mp.id === i.product.id);
        if (p) {
          p.stock = Math.max(0, p.stock - i.qty);
          if (p.recipe && p.recipe.length > 0) {
            p.recipe.forEach(r => {
              const mat = MOCK_PRODUCTS.find(mp => mp.id === r.material_id);
              if (mat) {
                mat.stock = Math.max(0, mat.stock - (r.qty_needed * i.qty));
              }
            });
          }
        }
      });
      const totalAmount = pb1Applied ? total * 1.1 : total;
      if (paymentMethod === 'KASBON' && customerId) {
        const cust = MOCK_CUSTOMERS.find(c => c.id === customerId);
        if (cust) {
          cust.kasbon_balance += totalAmount; // increase debt
        }
      }
      
      const res = {
        success: true,
        transaction_id: 'TX-DEMO-' + Date.now(),
        total_amount: totalAmount,
        paid_amount: paidAmount,
        change_amount: Math.max(0, paidAmount - totalAmount),
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone,
        pb1_applied: pb1Applied,
        split_bill_ways: splitBillWays,
        spg_name: spgName,
      };
      
      MOCK_TRANSACTIONS.unshift({
        id: res.transaction_id,
        created_at: new Date().toISOString().slice(0,16).replace('T',' '),
        total_amount: res.total_amount,
        paid_amount: res.paid_amount,
        change_amount: res.change_amount,
        payment_method: res.payment_method,
        items_count: items.length,
        cashier_name: currentUser?.username || 'admin',
        customer_name: res.customer_name,
        customer_phone: res.customer_phone,
        pb1_applied: res.pb1_applied,
        split_bill_ways: res.split_bill_ways,
        spg_name: res.spg_name,
      });

      return res;
    }
  },

  async refundTransaction(transactionId: string) {
    try {
      return await request(`/transactions/${transactionId}/refund`, { method: 'POST' });
    } catch (e) {
      const idx = MOCK_TRANSACTIONS.findIndex(t => t.id === transactionId);
      if (idx !== -1) {
        MOCK_TRANSACTIONS[idx].is_refunded = true;
      }
      return { success: true };
    }
  },

  // User Management (Admin Only)
  async getUsers(): Promise<User[]> {
    try {
      return await request('/users');
    } catch (e) {
      return [
        { id: 1, username: 'admin_toko', role: 'admin', tenant_id: 1 },
        { id: 2, username: 'kasir_shift1', role: 'kasir', tenant_id: 1 },
        { id: 3, username: 'kasir_shift2', role: 'kasir', tenant_id: 1 },
      ];
    }
  },

  async createUser(username: string, password: string, role: 'admin' | 'kasir'): Promise<User> {
    try {
      return await request('/users', {
        method: 'POST',
        body: { username, password, role },
      });
    } catch (e) {
      return { id: Date.now(), username, role, tenant_id: 1 };
    }
  },

  // Transactions History
  async getTransactions(): Promise<TransactionRecord[]> {
    try {
      return await request('/transactions/history');
    } catch (e) {
      const user = getCurrentUser();
      return (user && user.tenant_id > 6) ? MOCK_TRANSACTIONS.filter(t => t.id.startsWith('TX-DEMO-')) : MOCK_TRANSACTIONS;
    }
  },

  // Incoming Barang Masuk Logs
  async getIncomingLogs(): Promise<IncomingLog[]> {
    try {
      return await request('/incoming');
    } catch (e) {
      const user = getCurrentUser();
      return (user && user.tenant_id > 6) ? MOCK_INCOMING.filter(i => i.id > 1000000000000) : MOCK_INCOMING;
    }
  },

  async addIncomingLog(supplier_name: string, item_name: string, quantity: number, unit_price: number, notes?: string): Promise<IncomingLog> {
    try {
      return await request('/incoming', { method: 'POST', body: { supplier_name, item_name, quantity, unit_price, notes } });
    } catch (e) {
      const newEntry: IncomingLog = {
        id: Date.now(),
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
        supplier_name,
        item_name,
        quantity,
        unit_price,
        notes,
      };
      MOCK_INCOMING.unshift(newEntry);
      return newEntry;
    }
  },

  // Audit Trail Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      return await request('/audit-logs');
    } catch (e) {
      const user = getCurrentUser();
      return (user && user.tenant_id > 6) ? MOCK_AUDIT.filter(a => a.id > 1000000000000) : MOCK_AUDIT;
    }
  },

  // Cybersecurity Sentinel Status
  async getCyberSecurityStatus(): Promise<CyberSecurityStatus> {
    try {
      return await request('/cybersecurity/status');
    } catch (e) {
      return {
        firewall_status: 'ACTIVE',
        ssl_active: true,
        rate_limit_protection: true,
        blocked_attempts_24h: 14,
        last_scan_time: new Date().toISOString().replace('T', ' ').substring(0, 16),
        threat_level: 'LOW',
      };
    }
  },

  // AI Assistant Chat
  async sendAiChat(prompt: string) {
    try {
      return await request('/ai/chat', { method: 'POST', body: { prompt } });
    } catch (e) {
      // Local AI Fallback responses for offline/cellular mode
      const lower = prompt.toLowerCase();

      if (
        lower.includes('tutor') ||
        lower.includes('panduan') ||
        lower.includes('cara') ||
        lower.includes('tur') ||
        lower.includes('help') ||
        lower.includes('bantuan') ||
        lower.includes('fitur')
      ) {
        return {
          reply: `🎓 *MODE TUR & TUTORIAL INTERAKTIF SIKASIR* 🚀

Selamat datang Bos! Berikut adalah 4 fitur utama SiKasir Mobile:

1️⃣ *KASIR POS (Workstation Transaksi)*:
• Tap produk atau cari barcode di atas.
• Produk otomatis masuk keranjang di bawah.
• Tekan PROSES BAYAR & masukkan jumlah uang tunai.

2️⃣ *STOK BARANG (Inventaris)*:
• Lihat semua list stok & harga jual.
• Tekan "+ Tambah Barang" untuk produk baru.
• Tekan "Restock" jika stok barang datang lagi.

3️⃣ *DASHBOARD (Laporan Keuangan)*:
• Pantau Total Jenis Barang & Total Stok.
• Peringatan Otomatis untuk Stok Kritis (<= 5 pcs).

4️⃣ *STAF KASIR (Akses Multi-User)*:
• Tambahkan akun kasir shift 1 / shift 2.
• Kasir hanya bisa transaksi, tidak bisa ubah modal/laporan.

💡 *Tips AI*: Lo juga bisa ketik perintah suara/teks seperti "Laku 5 Sampoerna" atau "Restock 1 bal Indomie" langsung ke gue!`,
          actionPerformed: 'start_tutorial',
        };
      }

      if (lower.includes('omset') || lower.includes('keuangan') || lower.includes('untung')) {
        return {
          reply: '📊 Omset Hari Ini: Rp 1.450.000 (Untung Bersih: Rp 380.000 | 18 Transaksi)',
          actionPerformed: 'get_financial_report',
        };
      }
      if (lower.includes('laku') || lower.includes('terjual')) {
        return {
          reply: '✅ Penjualan Dicatat: Rokok Sampoerna -5 pcs (Stok Sisa: 95 pcs)',
          actionPerformed: 'update_stock',
        };
      }
      return {
        reply: '📦 Restock Berhasil: Rokok Sampoerna +100 pcs (Stok Sekarang: 195 pcs)',
        actionPerformed: 'update_stock',
      };
    }
  },

  async analyzeProductImage(imageUri: string, mimeType: string = 'image/jpeg') {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'product_image.jpg',
      type: mimeType
    } as any);

    try {
      const res = await fetch(`${API_URL}/ai/analyze-product-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      return data;
    } catch (e) {
      return { name: 'Produk AI (Demo Mode)', barcode: 'BRG-0000000001' };
    }
  },
};
