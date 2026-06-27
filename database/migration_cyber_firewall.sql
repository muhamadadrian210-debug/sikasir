-- Database migration untuk membuat tabel log keamanan siber
USE sikasir;

CREATE TABLE IF NOT EXISTS cyber_firewall_logs (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  ip             VARCHAR(64) NOT NULL,
  tenant_id      INT NULL, -- Isolasi multi-tenant
  layer_level    INT NOT NULL,
  layer_name     VARCHAR(128) NOT NULL,
  branch_name    VARCHAR(128) NOT NULL,
  honeypot_name  VARCHAR(128) NOT NULL,
  request_method VARCHAR(10) NOT NULL,
  request_url    VARCHAR(512) NOT NULL,
  user_agent     VARCHAR(512) NULL,
  payload        TEXT NULL,
  action_taken   VARCHAR(64) NOT NULL, -- 'BLOCKED', 'HONEYPOT_TRAPPED', 'LOOP_TRAPPED'
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cyber_ip (ip),
  INDEX idx_cyber_tenant (tenant_id),
  INDEX idx_cyber_created (created_at),
  INDEX idx_cyber_layer (layer_level)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Jalankan alter jika tabel sudah terbuat sebelumnya tanpa tenant_id
ALTER TABLE cyber_firewall_logs ADD COLUMN IF NOT EXISTS tenant_id INT NULL AFTER ip;
ALTER TABLE cyber_firewall_logs ADD INDEX IF NOT EXISTS idx_cyber_tenant (tenant_id);
