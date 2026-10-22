-- Start the CRM database over.
--
--   mysql -u crm_app -p nimbus_crm < db-setup/02-reset-schema.mysql.sql
--
-- This drops the tables, NOT the database: crm_app has no CREATE DATABASE right and could
-- not put it back. The next start of the API re-applies every migration and re-seeds.
--
-- The migration history table goes too (flyway_schema_history for the Java API,
-- __EFMigrationsHistory for the older .NET one). Dropping the tables while leaving the
-- history behind is the silent killer: the migrator reads only the history, decides there
-- is nothing to do, and the first query then dies with "Table ... doesn't exist".
--
-- The Java and .NET backends cannot share one database: on Windows and macOS MySQL table
-- names are not case sensitive, so `deals` and `Deals` are the same table. Reset before
-- switching from one to the other.

SET FOREIGN_KEY_CHECKS = 0;

-- Java backend (backend/, Flyway)
DROP TABLE IF EXISTS deal_stage_changes;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS deal_stages;
DROP TABLE IF EXISTS activity_types;
DROP TABLE IF EXISTS contact_statuses;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS flyway_schema_history;

-- .NET backend (backend, EF Core)
DROP TABLE IF EXISTS DealStageChanges;
DROP TABLE IF EXISTS Deals;
DROP TABLE IF EXISTS Activities;
DROP TABLE IF EXISTS Contacts;
DROP TABLE IF EXISTS Accounts;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS __EFMigrationsHistory;

SET FOREIGN_KEY_CHECKS = 1;

-- Report anything still standing.
SELECT table_name AS remaining_table FROM information_schema.tables
WHERE table_schema = DATABASE() ORDER BY table_name;
