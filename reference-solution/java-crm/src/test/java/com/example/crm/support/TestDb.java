package com.example.crm.support;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

/**
 * One throwaway MySQL database for the whole test run, built by the real Flyway migration (the application does that on
 * start) and dropped when the JVM exits. The tests need a server where the account may CREATE and DROP databases:
 *
 *   CRM_TEST_MYSQL_URL       jdbc:mysql://127.0.0.1:3398   (no database name)
 *   CRM_TEST_MYSQL_USER      account name
 *   CRM_TEST_MYSQL_PASSWORD  its password
 *
 * When CRM_TEST_MYSQL_URL is not set every integration test is skipped, not failed. Never point it at a database you
 * care about.
 */
public final class TestDb {
    public static final String ENV_URL = "CRM_TEST_MYSQL_URL";

    private static final String NAME = "ct_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    private static boolean created;

    private TestDb() {}

    public static String user() {
        return System.getenv().getOrDefault("CRM_TEST_MYSQL_USER", "root");
    }

    public static String password() {
        return System.getenv().getOrDefault("CRM_TEST_MYSQL_PASSWORD", "");
    }

    public static synchronized String url() {
        String base = System.getenv(ENV_URL);
        if (!created) {
            execute(base + "/?useSSL=false&allowPublicKeyRetrieval=true",
                    "CREATE DATABASE `" + NAME + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
            Runtime.getRuntime().addShutdownHook(new Thread(() -> execute(
                    base + "/?useSSL=false&allowPublicKeyRetrieval=true", "DROP DATABASE IF EXISTS `" + NAME + "`")));
            created = true;
        }
        return base + "/" + NAME + "?useSSL=false&allowPublicKeyRetrieval=true&connectionTimeZone=UTC";
    }

    private static void execute(String url, String sql) {
        try (Connection c = DriverManager.getConnection(url, user(), password()); Statement s = c.createStatement()) {
            s.execute(sql);
        } catch (SQLException e) {
            throw new IllegalStateException("Could not run test database setup: " + e.getMessage(), e);
        }
    }
}
