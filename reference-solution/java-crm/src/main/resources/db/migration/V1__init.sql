-- Schema for the Java CRM backend. Same tables, sizes and foreign-key behaviour as the .NET backend's InitialCreate
-- migration (names are snake_case). Text comparison is case- and accent-insensitive (utf8mb4_0900_ai_ci), which is what
-- makes the list "search" boxes case-insensitive.

CREATE TABLE users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  lockout_ends_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_users_username (username),
  UNIQUE KEY ux_users_email (email)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE accounts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(80) NULL,
  country VARCHAR(80) NULL,
  website VARCHAR(200) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_accounts_name (name)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE contacts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NULL,
  job_title VARCHAR(120) NULL,
  status VARCHAR(20) NOT NULL,
  last_contacted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_contacts_name (last_name, first_name),
  KEY ix_contacts_email (email),
  KEY ix_contacts_status (status),
  KEY ix_contacts_account (account_id),
  CONSTRAINT fk_contacts_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE deals (
  id BIGINT NOT NULL AUTO_INCREMENT,
  contact_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  value DECIMAL(18,2) NOT NULL,
  expected_close_date DATE NOT NULL,
  stage VARCHAR(20) NOT NULL,
  closed_date DATE NULL,
  lost_reason VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_deals_stage_close (stage, expected_close_date),
  KEY ix_deals_contact (contact_id),
  CONSTRAINT fk_deals_contact FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE activities (
  id BIGINT NOT NULL AUTO_INCREMENT,
  contact_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  notes VARCHAR(2000) NULL,
  occurred_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_activities_user (user_id),
  KEY ix_activities_contact_time (contact_id, occurred_at),
  CONSTRAINT fk_activities_contact FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
  CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- A signed-out JWT or auth cookie (its jti). Kept in the database so a restart does not revive it.
CREATE TABLE revoked_tokens (
  token_id VARCHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  PRIMARY KEY (token_id),
  KEY ix_revoked_tokens_expires (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
