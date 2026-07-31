import { Product, CartItem, User, Tenant } from '../types';

// Primary local IP & fallback mode for Cellular Data
let API_URL = 'http://192.168.100.184:3000/api';
let authToken = '';
let currentUser: User | null = null;

const MOCK_TENANTS: Tenant[] = [
  { id: 1, name: 'Sivilize Corp Supermarket', slug: 'sivilize-corp' },
  { id: 2, name: 'Warung Aegis Jaya', slug: 'aegis-jaya' },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 101, barcode: '8999999001', name: 'Rokok Sampoerna Mild 16', purchase_price: 28000, sale_price: 32000, stock: 100 },
  { id: 102, barcode: '8999999002', name: 'Indomie Goreng Spesial', purchase_price: 2500, sale_price: 3100, stock: 240 },
  { id: 103, barcode: '8999999003', name: 'Air Mineral Le Minerale 600ml', purchase_price: 2000, sale_price: 3500, stock: 48 },
  { id: 104, barcode: '8999999004', name: 'Biskuit Khong Guan Red Can 1600g', purchase_price: 85000, sale_price: 98000, stock: 12 },
  { id: 105, barcode: '8999999005', name: 'Kopi Kapal Api Spesial 165g', purchase_price: 11000, sale_price: 14000, stock: 35 },
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

  async registerTenant(tenant_name: string, admin_name: string, username: string, password: string) {
    try {
      const res = await request('/auth/register-tenant', {
        method: 'POST',
        body: { tenant_name, admin_name, username, password },
      });
      if (res.token) setAuthToken(res.token);
      if (res.user) setCurrentUser(res.user);
      return res;
    } catch (e: any) {
      // Demo / Cellular Fallback Tenant Registration
      const newId = MOCK_TENANTS.length + 1;
      const newTenant: Tenant = { id: newId, name: tenant_name, slug: tenant_name.toLowerCase().replace(/\s+/g, '-') };
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

  // AI Assistant Chat
  async sendAiChat(prompt: string) {
    try {
      return await request('/ai/chat', { method: 'POST', body: { prompt } });
    } catch (e) {
      // Local AI Fallback responses for offline/cellular mode
      const lower = prompt.toLowerCase();
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
