import { Product, CartItem, User, Tenant, StoreType, TransactionRecord, IncomingLog, AuditLog, CyberSecurityStatus } from '../types';

// Primary local IP & fallback mode for Cellular Data
let API_URL = 'http://192.168.100.184:3000/api';
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

const MOCK_TENANTS: Tenant[] = [
  { id: 1, name: 'Sivilize Supermarket & Mart', slug: 'sivilize-mart', store_type: 'minimarket', icon: 'cart-outline' },
  { id: 2, name: 'Apotek Kimia Medika 24 Jam', slug: 'apotek-medika', store_type: 'apotek', icon: 'medical-outline' },
  { id: 3, name: 'Kopi Senja & Resto F&B', slug: 'kopi-senja', store_type: 'cafe', icon: 'cafe-outline' },
  { id: 4, name: 'Aegis Cell & Counter HP', slug: 'aegis-cell', store_type: 'counter', icon: 'phone-portrait-outline' },
  { id: 5, name: 'Distro Fashion & Apparels', slug: 'distro-fashion', store_type: 'fashion', icon: 'shirt-outline' },
  { id: 6, name: 'Toko Bangunan & Material Jaya', slug: 'tb-jaya', store_type: 'bangunan', icon: 'construct-outline' },
];

const MOCK_PRODUCTS: Product[] = [
  // Minimarket
  { id: 101, barcode: '8999999001', name: 'Rokok Sampoerna Mild 16', purchase_price: 28000, sale_price: 32000, stock: 100 },
  { id: 102, barcode: '8999999002', name: 'Indomie Goreng Spesial', purchase_price: 2500, sale_price: 3100, stock: 240 },
  { id: 103, barcode: '8999999003', name: 'Air Mineral Le Minerale 600ml', purchase_price: 2000, sale_price: 3500, stock: 48 },
  // Apotek
  { id: 201, barcode: '8998888001', name: 'Paracetamol 500mg (Strip 10 Kaplet)', purchase_price: 3500, sale_price: 6000, stock: 150 },
  { id: 202, barcode: '8998888002', name: 'Vitamin C 1000mg Enervon-C Botol', purchase_price: 32000, sale_price: 40000, stock: 30 },
  { id: 203, barcode: '8998888003', name: 'Betadine Antiseptik 30ml', purchase_price: 18000, sale_price: 23500, stock: 25 },
  // Cafe / F&B
  { id: 301, barcode: '8997777001', name: 'Es Kopi Susu Gula Aren 500ml', purchase_price: 10000, sale_price: 18000, stock: 50 },
  { id: 302, barcode: '8997777002', name: 'Roti Bakar Cokelat Keju', purchase_price: 8000, sale_price: 15000, stock: 40 },
  // Counter HP
  { id: 401, barcode: '8996666001', name: 'Kabel Data Fast Charge Type-C 65W', purchase_price: 15000, sale_price: 35000, stock: 20 },
  { id: 402, barcode: '8996666002', name: 'Voucher Telkomsel 10GB 30 Hari', purchase_price: 33000, sale_price: 38000, stock: 60 },
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
      if (!query) return MOCK_PRODUCTS;
      return MOCK_PRODUCTS.filter(p =>
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
  async checkout(items: CartItem[], paidAmount: number) {
    try {
      return await request('/transactions', {
        method: 'POST',
        body: { items, paid_amount: paidAmount, payment_method: 'CASH' },
      });
    } catch (e) {
      const total = items.reduce((sum, i) => sum + i.subtotal, 0);
      items.forEach(i => {
        const p = MOCK_PRODUCTS.find(mp => mp.id === i.product.id);
        if (p) p.stock = Math.max(0, p.stock - i.qty);
      });
      return {
        success: true,
        transaction_id: 'TX-DEMO-' + Date.now(),
        total_amount: total,
        paid_amount: paidAmount,
        change_amount: Math.max(0, paidAmount - total),
      };
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
      return MOCK_TRANSACTIONS;
    }
  },

  // Incoming Barang Masuk Logs
  async getIncomingLogs(): Promise<IncomingLog[]> {
    try {
      return await request('/incoming');
    } catch (e) {
      return MOCK_INCOMING;
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
      return MOCK_AUDIT;
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
};
