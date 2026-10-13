-- Migration: Dine-In Table Orders for SiKasir (Integration with Sivilize Dine Lite)
CREATE TABLE IF NOT EXISTS dine_in_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  order_code VARCHAR(64) NOT NULL,
  table_number VARCHAR(32) NOT NULL,
  customer_name VARCHAR(128) NULL,
  order_note TEXT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'accepted', 'cooking', 'ready', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  items_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dine_tenant (tenant_id),
  INDEX idx_dine_table (table_number),
  INDEX idx_dine_status (status),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
