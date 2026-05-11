-- Migration: add multi-tenant support to existing SiKasir database
-- Run ONCE on an existing installation.
-- Safe to run on a fresh DB too (IF NOT EXISTS guards).

USE sikasir;

-- -------------------------------------------------------
-- 1. Create tenants table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenants_slug (slug)
);

-- -------------------------------------------------------
-- 2. Insert a default tenant for all existing data
-- -------------------------------------------------------
INSERT IGNORE INTO tenants (id, name, slug) VALUES (1, 'Default Store', 'default');

-- -------------------------------------------------------
-- 3. Add tenant_id to users
-- -------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id;

-- Backfill (already defaulted above, but explicit is safer)
UPDATE users SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;

-- Drop old global unique on username, add per-tenant unique
ALTER TABLE users
  DROP INDEX IF EXISTS username;

ALTER TABLE users
  ADD UNIQUE KEY IF NOT EXISTS uq_users_tenant_username (tenant_id, username);

ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_tenant (tenant_id);

ALTER TABLE users
  ADD CONSTRAINT IF NOT EXISTS fk_users_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- -------------------------------------------------------
-- 4. Add tenant_id to categories
-- -------------------------------------------------------
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id;

UPDATE categories SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;

ALTER TABLE categories
  DROP INDEX IF EXISTS name;

ALTER TABLE categories
  ADD UNIQUE KEY IF NOT EXISTS uq_categories_tenant_name (tenant_id, name);

ALTER TABLE categories
  ADD INDEX IF NOT EXISTS idx_categories_tenant (tenant_id);

ALTER TABLE categories
  ADD CONSTRAINT IF NOT EXISTS fk_categories_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- -------------------------------------------------------
-- 5. Add tenant_id to products
-- -------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id;

UPDATE products SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;

ALTER TABLE products
  DROP INDEX IF EXISTS barcode;

ALTER TABLE products
  ADD UNIQUE KEY IF NOT EXISTS uq_products_tenant_barcode (tenant_id, barcode);

ALTER TABLE products
  ADD INDEX IF NOT EXISTS idx_products_tenant (tenant_id);

ALTER TABLE products
  ADD CONSTRAINT IF NOT EXISTS fk_products_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- -------------------------------------------------------
-- 6. Add tenant_id to transactions
-- -------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id;

UPDATE transactions SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;

ALTER TABLE transactions
  ADD INDEX IF NOT EXISTS idx_transactions_tenant (tenant_id);

ALTER TABLE transactions
  ADD CONSTRAINT IF NOT EXISTS fk_transactions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- -------------------------------------------------------
-- 7. Add tenant_id to audit_logs
-- -------------------------------------------------------
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id INT NULL AFTER id;

UPDATE audit_logs SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE audit_logs
  ADD INDEX IF NOT EXISTS idx_audit_tenant (tenant_id);

-- -------------------------------------------------------
-- 8. Add tenant_id to incoming_goods
-- -------------------------------------------------------
ALTER TABLE incoming_goods
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id;

UPDATE incoming_goods SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;

ALTER TABLE incoming_goods
  ADD INDEX IF NOT EXISTS idx_incoming_tenant (tenant_id);

ALTER TABLE incoming_goods
  ADD CONSTRAINT IF NOT EXISTS fk_incoming_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
