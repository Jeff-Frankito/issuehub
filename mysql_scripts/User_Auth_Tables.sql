-- ============================================
-- IssueHub: Auth + User Profile Reset + Seed
-- Seeds all tables EXCEPT refresh_tokens
-- ============================================

USE issuehub;

-- Drop in FK-safe order
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS user_security;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS refresh_tokens;  -- will be recreated but NOT seeded
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =======================
-- Core auth tables
-- =======================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  token_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(128) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  user_agent VARCHAR(255) NULL,
  ip VARCHAR(64) NULL,
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

-- =======================
-- User extensions
-- =======================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INT NOT NULL PRIMARY KEY,
  display_name VARCHAR(255) NULL,
  avatar_url VARCHAR(512) NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/London',
  locale VARCHAR(16) NOT NULL DEFAULT 'en-GB',
  bio TEXT NULL,
  company VARCHAR(255) NULL,
  job_title VARCHAR(255) NULL,
  phone VARCHAR(32) NULL,
  website VARCHAR(255) NULL,
  github VARCHAR(255) NULL,
  x_handle VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_user_profiles_company ON user_profiles(company);
CREATE INDEX idx_user_profiles_job_title ON user_profiles(job_title);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INT NOT NULL PRIMARY KEY,
  theme ENUM('system','light','dark') NOT NULL DEFAULT 'system',
  email_notifications ENUM('all','mentions','none') NOT NULL DEFAULT 'all',
  notify_project_invites TINYINT(1) NOT NULL DEFAULT 1,
  notify_issue_assigned TINYINT(1) NOT NULL DEFAULT 1,
  notify_comments TINYINT(1) NOT NULL DEFAULT 1,
  digest_frequency ENUM('off','daily','weekly') NOT NULL DEFAULT 'weekly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_upr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_security (
  user_id INT NOT NULL PRIMARY KEY,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_method ENUM('totp','webauthn') NULL,
  totp_secret VARBINARY(256) NULL,
  backup_codes_hash TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_use_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =======================
-- Seed (NO refresh_tokens)
-- =======================

-- Roles
INSERT IGNORE INTO roles (slug, label) VALUES
  ('USER','User'),
  ('ADMIN','Admin'),
  ('SUPERUSER','Super User');

-- Superuser (password = "Password", bcrypt hash below)
INSERT INTO users (email, name, password_hash)
SELECT 'local@issuehub.dev', 'Local Superuser',
       '$2b$10$ipVEKCJg6w9bSJTT6rL0ROSlNmpNyCOzyMVDXNxEVV8kcYtjwWW8i'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'local@issuehub.dev');

-- Assign SUPERUSER role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'local@issuehub.dev' AND r.slug = 'SUPERUSER'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- Default profile & preferences/security for superuser (idempotent)
INSERT IGNORE INTO user_profiles (user_id, display_name, timezone, locale)
SELECT id, 'Local Superuser', 'Europe/London', 'en-GB' FROM users WHERE email='local@issuehub.dev';

INSERT IGNORE INTO user_preferences (user_id)
SELECT id FROM users WHERE email='local@issuehub.dev';

INSERT IGNORE INTO user_security (user_id)
SELECT id FROM users WHERE email='local@issuehub.dev';
