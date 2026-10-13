package com.example.crm.support;

import com.example.crm.domain.User;
import com.example.crm.domain.UserRole;
import com.example.crm.repo.ActivityRepository;
import com.example.crm.repo.UserRepository;
import com.example.crm.security.PasswordService;
import com.example.crm.support.Api.Auth;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Starts the real application once (on a random port, against the throwaway MySQL from {@link TestDb}) and shares it
 * between every integration test class. Skipped, not failed, when CRM_TEST_MYSQL_URL is not set.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(ApiTestBase.ClockConfig.class)
@ExtendWith(RequiresMySql.class)
public abstract class ApiTestBase {
    public static final String PASSWORD = "Test#Pass-2026!";
    private static final String JWT_KEY = String.join("", UUID.randomUUID().toString(), UUID.randomUUID().toString());

    @TestConfiguration
    static class ClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock();
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", TestDb::url);
        registry.add("spring.datasource.username", TestDb::user);
        registry.add("spring.datasource.password", TestDb::password);
        registry.add("app.jwt.signing-key", () -> JWT_KEY);
        registry.add("app.auth.bcrypt-strength", () -> "4");
        registry.add("app.auth.login-rate-limit-per-minute", () -> "100000");
        registry.add("spring.jpa.properties.hibernate.session_factory.statement_inspector",
                RecordingInspector.class::getName);
    }

    public record Cred(long id, String username, String password) {}

    @LocalServerPort protected int port;
    @Autowired protected UserRepository users;
    @Autowired protected ActivityRepository activities;
    @Autowired protected PasswordService passwords;
    @Autowired protected MutableClock clock;
    @Autowired protected JdbcTemplate jdbc;

    protected Api api;
    protected Cred admin;
    protected Cred member;
    protected Auth adminAuth;
    protected Auth memberAuth;

    @BeforeEach
    void startFresh() {
        clock.reset();
        api = new Api(port);
        admin = newUser(UserRole.ADMIN);
        member = newUser(UserRole.USER);
        adminAuth = Auth.bearer(api.jwt(admin.username(), PASSWORD));
        memberAuth = Auth.bearer(api.jwt(member.username(), PASSWORD));
    }

    protected Cred newUser(UserRole role) {
        User u = new User();
        u.setUsername("u" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        u.setEmail(u.getUsername() + "@example.com");
        u.setPasswordHash(passwords.hash(PASSWORD));
        u.setRole(role);
        users.save(u);
        return new Cred(u.getId(), u.getUsername(), PASSWORD);
    }

    /** Removes every CRM row (and every user), for the tests that need to count on an empty database. */
    protected void wipeAll() {
        jdbc.update("delete from activities");
        jdbc.update("delete from deals");
        jdbc.update("delete from contacts");
        jdbc.update("delete from accounts");
        jdbc.update("delete from revoked_tokens");
        jdbc.update("delete from users");
    }

    // ---- small builders over the real API ----

    protected long createAccount(String name) {
        Api.Res r = api.post("/api/accounts", "{\"name\":\"" + name + "\"}", adminAuth);
        if (r.status() != 201) {
            throw new IllegalStateException("account create failed: " + r.status() + " " + r.body());
        }
        return r.json().get("id").asLong();
    }

    protected long createContact(long accountId, String first, String last) {
        Api.Res r = api.post("/api/contacts", ("{\"accountId\":%d,\"firstName\":\"%s\",\"lastName\":\"%s\","
                + "\"email\":\"%s.%s@example.com\",\"status\":\"Prospect\"}").formatted(accountId, first, last, first, last),
                adminAuth);
        if (r.status() != 201) {
            throw new IllegalStateException("contact create failed: " + r.status() + " " + r.body());
        }
        return r.json().get("id").asLong();
    }

    protected Api.Res createDeal(long contactId, String title, String value, String stage, String lostReason) {
        String reason = lostReason == null ? "" : ",\"lostReason\":\"" + lostReason + "\"";
        return api.post("/api/deals", ("{\"contactId\":%d,\"title\":\"%s\",\"value\":%s,\"expectedCloseDate\":\"2030-06-01\","
                + "\"stage\":\"%s\"%s}").formatted(contactId, title, value, stage, reason), adminAuth);
    }
}
