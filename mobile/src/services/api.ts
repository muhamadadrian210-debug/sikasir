import { Product, CartItem, User, Tenant, FinancialReportData } from '../types';

let API_URL = 'http://localhost:3000/api';
let authToken = '';
let currentUser: User | null = null;

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

  const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
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
}

export const apiService = {
  // Auth
  async login(username: string, password: string, tenant_id?: number) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { username, password, tenant_id },
    });
    if (res.token) setAuthToken(res.token);
    if (res.user) setCurrentUser(res.user);
    return res;
  },

  // Setup / Tenants
  async getTenants(): Promise<Tenant[]> {
    return await request('/setup/tenants');
  },

  // Products
  async getProducts(query: string = ''): Promise<Product[]> {
    const path = query ? `/products?q=${encodeURIComponent(query)}` : '/products';
    return await request(path);
  },

  async addProduct(productData: Partial<Product>): Promise<Product> {
    return await request('/products', {
      method: 'POST',
      body: productData,
    });
  },

  async updateStock(productId: number, delta: number, reason: string) {
    return await request(`/products/${productId}/stock`, {
      method: 'PATCH',
      body: { delta, reason },
    });
  },

  // Transactions
  async checkout(items: CartItem[], paid: number) {
    return await request('/transactions', {
      method: 'POST',
      body: {
        items: items.map(item => ({
          product_id: item.product.id,
          qty: item.qty,
        })),
        paid,
      },
    });
  },

  // AI Assistant Chat
  async sendAiChat(prompt: string) {
    return await request('/ai/chat', {
      method: 'POST',
      body: { prompt },
    });
  },
};
