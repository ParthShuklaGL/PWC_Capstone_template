-- A quick look at the database behind the API, for a demo or a sanity check.
--
--   mysql -u crm_app -p nimbus_crm < scripts/check-db.sql
--
-- Reads only. On a freshly seeded database expect: 3 users, 30 accounts, 150 contacts,
-- 224 activities, 32 deals, 103 stage changes, 12 foreign keys, and an open pipeline of
-- 20 deals worth 1,247,500.00.

SELECT 'migrations' AS what, GROUP_CONCAT(CONCAT('V', version, ' ', description) ORDER BY installed_rank SEPARATOR ', ') AS detail
FROM flyway_schema_history WHERE success = 1;

SELECT 'users' AS table_name, COUNT(*) AS rows_now FROM users
UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'activities', COUNT(*) FROM activities
UNION ALL SELECT 'deals', COUNT(*) FROM deals
UNION ALL SELECT 'deal_stage_changes', COUNT(*) FROM deal_stage_changes;

-- Every foreign key, and what it points at
SELECT table_name, constraint_name, GROUP_CONCAT(column_name ORDER BY ordinal_position) AS columns_,
       referenced_table_name AS references_table
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL
GROUP BY table_name, constraint_name, referenced_table_name
ORDER BY table_name, constraint_name;

-- The pipeline board, straight from the tables (compare with GET /api/deals/summary)
SELECT s.code AS stage, COUNT(d.id) AS deals, COALESCE(SUM(d.value), 0) AS total_value
FROM deal_stages s LEFT JOIN deals d ON d.stage_code = s.code
GROUP BY s.code, s.sort_order ORDER BY s.sort_order;

SELECT COUNT(*) AS open_deals, SUM(d.value) AS open_value
FROM deals d JOIN deal_stages s ON s.code = d.stage_code WHERE s.is_open;

-- Each rep's open pipeline (what they see when they sign in)
SELECT u.display_name, u.role_code, COUNT(d.id) AS open_deals, COALESCE(SUM(d.value), 0) AS open_value
FROM users u
LEFT JOIN deals d ON d.owner_id = u.id AND d.stage_code IN (SELECT code FROM deal_stages WHERE is_open)
GROUP BY u.id, u.display_name, u.role_code ORDER BY u.id;
