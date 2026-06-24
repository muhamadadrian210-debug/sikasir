-- SiKasir schema — multi-tenant (row-level security)
-- Jalankan sekali di MySQL (fresh install)

CREATE DATABASE IF NOT EXISTS sikasir CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sikasir;

-- -------------------------------------------------------
-- Tenants
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenants_slug (slug)
);

-- -------------------------------------------------------
-- Users  (scoped per tenant)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id     INT NOT NULL,
  username      VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','kasir') NOT NULL DEFAULT 'kasir',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_tenant_username (tenant_id, username),
  INDEX idx_users_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- -------------------------------------------------------
-- Categories  (scoped per tenant)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name      VARCHAR(128) NOT NULL,
  UNIQUE KEY uq_categories_tenant_name (tenant_id, name),
  INDEX idx_categories_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- -------------------------------------------------------
-- Products  (scoped per tenant)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id      INT NOT NULL,
  barcode        VARCHAR(64) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock          INT NOT NULL DEFAULT 0,
  category_id    INT NULL,
  expiry_date    DATE NULL,
  batch_number   VARCHAR(64) NULL,
  size           VARCHAR(32) NULL,
  color          VARCHAR(64) NULL,
  warranty       VARCHAR(128) NULL,
  brand          VARCHAR(128) NULL,
  rack_location  VARCHAR(128) NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_tenant_barcode (tenant_id, barcode),
  INDEX idx_products_tenant (tenant_id),
  INDEX idx_products_barcode (barcode),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Transactions  (scoped per tenant)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id     INT NOT NULL,
  user_id       INT NOT NULL,
  total         DECIMAL(12,2) NOT NULL,
  paid          DECIMAL(12,2) NOT NULL,
  change_amount DECIMAL(12,2) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transactions_tenant (tenant_id),
  INDEX idx_transactions_created (created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- -------------------------------------------------------
-- Transaction items  (no tenant_id — inherits via transaction)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  product_id     INT NOT NULL,
  qty            INT NOT NULL,
  unit_price     DECIMAL(12,2) NOT NULL,
  subtotal       DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_transaction_items_tx (transaction_id)
);

-- -------------------------------------------------------
-- Audit logs  (scoped per tenant)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id     INT NULL,
  user_id       INT NULL,
  username      VARCHAR(64) NULL,
  action        VARCHAR(128) NOT NULL,
  resource_meta TEXT NULL,
  ip            VARCHAR(64) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_tenant (tenant_id),
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_user (user_id)
);

-- -------------------------------------------------------
-- Incoming goods  (scoped per tenant)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS incoming_goods (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   INT NOT NULL,
  entry_date  DATE NOT NULL,
  description VARCHAR(512) NOT NULL,
  quantity    DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit        VARCHAR(32) NULL,
  product_id  INT NULL,
  created_by  INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_incoming_tenant (tenant_id),
  INDEX idx_incoming_date (entry_date),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
