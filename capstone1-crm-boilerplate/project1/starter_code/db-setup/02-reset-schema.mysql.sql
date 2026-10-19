-- Start the CRM database over.
--
--   mysql -u crm_app -p nimbus_crm < db-setup/02-reset-schema.mysql.sql
--
-- This drops the tables, NOT the database: crm_app has no CREATE DATABASE right and could
-- not put it back. The next `dotnet run` re-applies every migration and re-seeds.
--
-- __EFMigrationsHistory goes too. Dropping the tables while leaving that table behind is
-- the silent killer: Migrate() reads only the history, decides there is nothing to do, and
-- the first seeder query then dies with "Table 'nimbus_crm.Contacts' doesn't exist".

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS DealStageChanges;
DROP TABLE IF EXISTS Deals;
DROP TABLE IF EXISTS Activities;
DROP TABLE IF EXISTS Contacts;
DROP TABLE IF EXISTS Accounts;
DROP TABLE IF EXISTS __EFMigrationsHistory;
SET FOREIGN_KEY_CHECKS = 1;

-- Report anything still standing.
SELECT table_name AS remaining_table FROM information_schema.tables
WHERE table_schema = DATABASE() ORDER BY table_name;
