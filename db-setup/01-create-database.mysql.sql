-- The database, and two users for it. The difference between them is the point.
--
-- One-time bootstrap against your local MySQL 8, run as root:
--   mysql -u root -p < db-setup/01-create-database.mysql.sql
--
-- The application connects as crm_app, which owns the schema: the EF Core migrations run
-- as this user and build the tables. This script creates no tables itself.
--
-- The agent connects as mcp_readonly, which can do exactly one thing: read (SELECT). That
-- grant is the boundary on what the MCP server can do to this database, and nothing else
-- in this repository enforces it.
--
-- Idempotent: safe to run again.

CREATE DATABASE IF NOT EXISTS nimbus_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'crm_app'@'localhost' IDENTIFIED BY 'Crm#App2026';
CREATE USER IF NOT EXISTS 'crm_app'@'%' IDENTIFIED BY 'Crm#App2026';
GRANT ALL PRIVILEGES ON nimbus_crm.* TO 'crm_app'@'localhost';
GRANT ALL PRIVILEGES ON nimbus_crm.* TO 'crm_app'@'%';

CREATE USER IF NOT EXISTS 'mcp_readonly'@'localhost' IDENTIFIED BY 'Mcp#Readonly2026';
CREATE USER IF NOT EXISTS 'mcp_readonly'@'%' IDENTIFIED BY 'Mcp#Readonly2026';
GRANT SELECT ON nimbus_crm.* TO 'mcp_readonly'@'localhost';
GRANT SELECT ON nimbus_crm.* TO 'mcp_readonly'@'%';

FLUSH PRIVILEGES;
