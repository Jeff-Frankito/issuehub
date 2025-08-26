-- ============================================
-- IssueHub: Projects-only Reset + Seed
-- (No user/role/refresh/profile tables touched)
-- ============================================

USE issuehub;

-- Drop project tables in FK-safe order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS project_join_requests;
DROP TABLE IF EXISTS project_invites;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------
-- Projects
-- -----------------------
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NULL,
  visibility ENUM('private','internal','public') NOT NULL DEFAULT 'private',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------
-- Project Members
-- -----------------------
CREATE TABLE project_members (
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner','admin','maintainer','contributor','viewer') NOT NULL DEFAULT 'contributor',
  status ENUM('active','pending','removed') NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pm_user (user_id)
) ENGINE=InnoDB;

-- -----------------------
-- Project Invites (email-based)
-- -----------------------
CREATE TABLE project_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('admin','maintainer','contributor','viewer') NOT NULL DEFAULT 'contributor',
  token CHAR(36) NOT NULL UNIQUE, -- UUID
  status ENUM('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
  invited_by INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pi_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_inviter FOREIGN KEY (invited_by) REFERENCES users(id),
  INDEX idx_pi_project (project_id),
  INDEX idx_pi_email (email)
) ENGINE=InnoDB;

-- -----------------------
-- Project Join Requests (user asks to join)
-- -----------------------
CREATE TABLE project_join_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  message VARCHAR(500) NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pjr_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pjr_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_pjr_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  UNIQUE KEY uk_pjr_unique (project_id, user_id, status)
) ENGINE=InnoDB;

-- =======================
-- Seed: Demo Project (owner = existing superuser)
-- =======================

-- Create Demo Project if superuser exists
INSERT INTO projects (owner_id, name, slug, description, visibility)
SELECT u.id, 'Demo Project', 'demo-project', 'This is a seeded sample project.', 'private'
FROM users u
WHERE u.email = 'local@issuehub.dev'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  visibility = VALUES(visibility);

-- Ensure superuser is marked as project owner in members
INSERT INTO project_members (project_id, user_id, role, status)
SELECT p.id, u.id, 'owner', 'active'
FROM projects p
JOIN users u ON u.email = 'local@issuehub.dev'
WHERE p.slug = 'demo-project'
ON DUPLICATE KEY UPDATE role='owner', status='active';

-- (Optional) Example: seed a pending invite (uncomment and tweak email)
-- INSERT INTO project_invites (project_id, email, role, token, status, invited_by, expires_at)
-- SELECT p.id, 'teammate@example.com', 'contributor', '00000000-0000-0000-0000-000000000001', 'pending', u.id,
--        DATE_ADD(NOW(), INTERVAL 72 HOUR)
-- FROM projects p
-- JOIN users u ON u.email = 'local@issuehub.dev'
-- WHERE p.slug = 'demo-project';
