export interface Product {
  id: number;
  barcode: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
  category_id?: number;
  category_name?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  subtotal: number;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'kasir';
  tenant_id: number;
}

export type StoreType = 'minimarket' | 'apotek' | 'cafe' | 'counter' | 'fashion' | 'bangunan' | 'umum';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  store_type?: StoreType;
  icon?: string;
}

export interface FinancialReportData {
  periode: string;
  jumlah_transaksi: number;
  total_omset: number;
  total_modal: number;
  keuntungan_bersih: number;
  produk_terlaris: string[];
}

export interface TransactionRecord {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: string;
  items_count: number;
  cashier_name?: string;
}

export interface IncomingLog {
  id: number;
  created_at: string;
  supplier_name: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface AuditLog {
  id: number;
  created_at: string;
  username: string;
  action: string;
  details: string;
  ip_address: string;
}

export interface CyberSecurityStatus {
  firewall_status: 'ACTIVE' | 'WARNING' | 'ATTACK_BLOCKED';
  ssl_active: boolean;
  rate_limit_protection: boolean;
  blocked_attempts_24h: number;
  last_scan_time: string;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
}
