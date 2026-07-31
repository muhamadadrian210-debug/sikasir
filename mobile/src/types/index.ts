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
