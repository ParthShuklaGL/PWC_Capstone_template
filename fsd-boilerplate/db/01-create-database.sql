-- Database and application user for the FSD boilerplate, on a local MySQL 8.
--
--   mysql -u root -p -e "source db/01-create-database.sql"
--
-- The app connects as fsd. Hibernate creates the tables on first start (ddl-auto: update).
-- Idempotent: safe to run again.

CREATE DATABASE IF NOT EXISTS fsd CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'fsd'@'localhost' IDENTIFIED BY 'fsd_pw';
GRANT ALL PRIVILEGES ON fsd.* TO 'fsd'@'localhost';
FLUSH PRIVILEGES;
