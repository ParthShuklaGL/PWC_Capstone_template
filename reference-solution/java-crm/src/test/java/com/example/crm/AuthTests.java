package com.example.crm;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.crm.domain.UserRole;
import com.example.crm.support.Api.Auth;
import com.example.crm.support.Api.Browser;
import com.example.crm.support.Api.Res;
import com.example.crm.support.ApiTestBase;
import com.fasterxml.jackson.databind.JsonNode;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Register, the three sign-in modes, logout and revocation, CSRF, lockout and the user list. */
class AuthTests extends ApiTestBase {

    private static String unique() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    private Res register(String username, String email, String password) {
        return api.post("/api/auth/register",
                "{\"username\":\"%s\",\"email\":\"%s\",\"password\":\"%s\"}".formatted(username, email, password),
                Auth.none());
    }

    // ---------------- register ----------------

    @Test
    void registerCreatesAPlainUserAndNeverReturnsAHash() {
        String name = "reg_" + unique();
        Res r = register(name, name + "@example.com", "Proof#Pass-2026!");
        assertThat(r.status()).isEqualTo(201);
        JsonNode u = r.json();
        assertThat(u.get("role").asText()).isEqualTo("USER");
        assertThat(u.get("isActive").asBoolean()).isTrue();
        assertThat(u.get("createdAt").asText()).endsWith("Z");
        assertThat(u.fieldNames()).toIterable().containsExactly("id", "username", "email", "role", "isActive", "createdAt");
        assertThat(r.body()).doesNotContainIgnoringCase("password").doesNotContain("$2");

        String stored = jdbc.queryForObject("select password_hash from users where username = ?", String.class, name);
        assertThat(stored).startsWith("$2").doesNotContain("Proof#Pass-2026!");
    }

    @Test
    void registerRefusesDuplicatesWithDistinctCodes() {
        String name = "dup_" + unique();
        assertThat(register(name, name + "@example.com", "Proof#Pass-2026!").status()).isEqualTo(201);
        Res sameName = register(name.toUpperCase(), "other_" + name + "@example.com", "Proof#Pass-2026!");
        assertThat(sameName.status()).isEqualTo(409);
        assertThat(sameName.json().get("code").asText()).isEqualTo("USERNAME_TAKEN");
        Res sameMail = register("n_" + name, name + "@example.com", "Proof#Pass-2026!");
        assertThat(sameMail.status()).isEqualTo(409);
        assertThat(sameMail.json().get("code").asText()).isEqualTo("EMAIL_TAKEN");
    }

    @Test
    void registerValidationUsesPascalCaseKeys() {
        Res r = register("x", "not-an-email", "short");
        assertThat(r.status()).isEqualTo(400);
        JsonNode e = r.json().get("errors");
        assertThat(e.fieldNames()).toIterable().containsExactlyInAnyOrder("Username", "Email", "Password");

        assertThat(register("has space", "a@b.c", "Proof#Pass-2026!").json().get("errors").get("Username")).isNotNull();
        assertThat(register("a".repeat(51), "a@b.c", "Proof#Pass-2026!").json().get("errors").get("Username")).isNotNull();
        assertThat(register("okname", "a".repeat(160) + "@b.c", "Proof#Pass-2026!").json().get("errors").get("Email")).isNotNull();
        assertThat(register("okname", "a@b.c", "p".repeat(101)).json().get("errors").get("Password")).isNotNull();
        // BCrypt reads 72 bytes; a longer password is refused rather than silently truncated.
        assertThat(register("okname", "a@b.c", "p".repeat(73)).json().get("errors").get("Password")).isNotNull();
        assertThat(api.post("/api/auth/register", "{}", Auth.none()).json().get("errors").fieldNames()).toIterable()
                .containsExactlyInAnyOrder("Username", "Email", "Password");
    }

    @Test
    void passwordsAreHashedWithASaltSoEqualPasswordsGiveDifferentHashes() {
        String a = "salt_a" + unique();
        String b = "salt_b" + unique();
        register(a, a + "@example.com", "Same#Password-2026");
        register(b, b + "@example.com", "Same#Password-2026");
        String ha = jdbc.queryForObject("select password_hash from users where username = ?", String.class, a);
        String hb = jdbc.queryForObject("select password_hash from users where username = ?", String.class, b);
        assertThat(ha).isNotEqualTo(hb);
        assertThat(api.login(a, "Same#Password-2026", "Jwt").status()).isEqualTo(200);
    }

    // ---------------- login ----------------

    @Test
    void jwtLoginReturnsTheDocumentedShape() {
        Res r = api.login(member.username(), PASSWORD, "Jwt");
        assertThat(r.status()).isEqualTo(200);
        JsonNode j = r.json();
        assertThat(j.fieldNames()).toIterable().containsExactly("user", "mode", "accessToken", "expiresAt");
        assertThat(j.get("mode").asText()).isEqualTo("Jwt");
        assertThat(j.get("accessToken").asText()).startsWith("eyJ");
        assertThat(j.get("expiresAt").asText()).endsWith("Z");
        assertThat(j.get("user").get("username").asText()).isEqualTo(member.username());
        assertThat(j.get("user").get("role").asText()).isEqualTo("USER");
        assertThat(r.header("cache-control")).isEqualTo("no-store");
        assertThat(r.setCookies()).isEmpty();
    }

    @Test
    void theModeDefaultsToJwtAndIsCaseInsensitive() {
        assertThat(api.login(member.username(), PASSWORD, null).json().get("mode").asText()).isEqualTo("Jwt");
        Res cookie = api.login(member.username(), PASSWORD, " cookie ");
        assertThat(cookie.json().get("mode").asText()).isEqualTo("Cookie");
        assertThat(cookie.json().get("accessToken").isNull()).isTrue();
        assertThat(api.login(member.username(), PASSWORD, "SESSION").json().get("mode").asText()).isEqualTo("Session");
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "99", "-5", "Carrier-pigeon", "", "Cookie,Jwt", " 1 "})
    void anUnknownOrNumericModeIsRefused(String mode) {
        Res r = api.login(member.username(), PASSWORD, mode);
        assertThat(r.status()).as(mode).isEqualTo(400);
        assertThat(r.json().get("errors").get("Mode")).isNotNull();
    }

    @Test
    void everyLoginFailureGivesTheSameAnswer() {
        Res wrong = api.login(member.username(), "wrong-password", "Jwt");
        Res unknown = api.login("nobody_" + unique(), "wrong-password", "Jwt");
        com.example.crm.domain.User inactive = users.findById(newUser(UserRole.USER).id()).orElseThrow();
        inactive.setActive(false);
        users.save(inactive);
        Res deactivated = api.login(inactive.getUsername(), PASSWORD, "Jwt");

        for (Res r : List.of(wrong, unknown, deactivated)) {
            assertThat(r.status()).isEqualTo(401);
            assertThat(r.json().get("code").asText()).isEqualTo("INVALID_CREDENTIALS");
            assertThat(r.json().get("detail").asText()).isEqualTo("Invalid username or password.");
            assertThat(r.json().get("title").asText()).isEqualTo("Unauthorized");
            assertThat(r.body()).doesNotContain("locked").doesNotContain("inactive");
        }
    }

    @Test
    void loginValidationNamesTheFields() {
        Res r = api.post("/api/auth/login", "{\"username\":\"\",\"password\":\"\"}", Auth.none());
        assertThat(r.status()).isEqualTo(400);
        assertThat(r.json().get("errors").fieldNames()).toIterable().containsExactlyInAnyOrder("Username", "Password");
        assertThat(api.login("a".repeat(51), "x", "Jwt").json().get("errors").get("Username")).isNotNull();
        assertThat(api.post("/api/auth/login", "", Auth.none()).json().get("code").asText()).isEqualTo("BAD_REQUEST");
    }

    // ---------------- who am I, in each mode ----------------

    @Test
    void meReportsTheCredentialThatWasUsed() {
        assertThat(api.get("/api/auth/me", memberAuth).json().get("authenticatedVia").asText()).isEqualTo("Bearer");
        JsonNode me = api.get("/api/auth/me", memberAuth).json();
        assertThat(me.fieldNames()).toIterable().containsExactly("id", "username", "role", "authenticatedVia");
        assertThat(me.get("id").asLong()).isEqualTo(member.id());
        assertThat(me.get("role").asText()).isEqualTo("USER");

        Browser cookie = api.browser();
        Res login = cookie.login(member.username(), PASSWORD, "Cookie");
        assertThat(cookie.get("/api/auth/me").json().get("authenticatedVia").asText()).isEqualTo("Cookies");
        String setCookie = login.setCookies().get(0);
        assertThat(setCookie).startsWith("crm.auth=").contains("HttpOnly").contains("SameSite=Lax").contains("Max-Age=3600");

        Browser session = api.browser();
        Res sessionLogin = session.login(member.username(), PASSWORD, "Session");
        assertThat(session.get("/api/auth/me").json().get("authenticatedVia").asText()).isEqualTo("Session");
        assertThat(sessionLogin.setCookies().get(0)).startsWith("crm.session=").contains("HttpOnly").contains("SameSite=Lax");
        assertThat(sessionLogin.body()).doesNotContain("accessToken\":\"");
    }

    @Test
    void theSessionIdIsStableAcrossRequests() {
        Browser session = api.browser();
        session.login(member.username(), PASSWORD, "Session");
        String id = session.cookie("crm.session");
        for (int i = 0; i < 3; i++) {
            Res r = session.get("/api/auth/me");
            assertThat(r.status()).isEqualTo(200);
            assertThat(r.setCookies()).isEmpty();
        }
        assertThat(session.cookie("crm.session")).isEqualTo(id);
    }

    @Test
    void aBearerHeaderWinsOverCookiesAndAnInvalidOneIsNotRescued() {
        Browser cookie = api.browser();
        cookie.login(admin.username(), PASSWORD, "Cookie");
        Auth both = Auth.bearer(api.jwt(member.username(), PASSWORD)).with("Cookie", cookie.cookieHeader());
        assertThat(api.get("/api/auth/me", both).json().get("username").asText()).isEqualTo(member.username());

        Auth badBearerGoodCookie = Auth.bearer("not.a.token").with("Cookie", cookie.cookieHeader());
        assertThat(api.get("/api/auth/me", badBearerGoodCookie).status()).isEqualTo(401);
    }

    // ---------------- logout and revocation ----------------

    @Test
    void loggingOutAJwtRevokesIt() {
        Res logout = api.post("/api/auth/logout", null, memberAuth);
        assertThat(logout.status()).isEqualTo(204);
        assertThat(api.get("/api/auth/me", memberAuth).status()).isEqualTo(401);
        assertThat(api.get("/api/accounts", memberAuth).status()).isEqualTo(401);
        // The revocation is stored in the database, not just remembered in memory.
        assertThat(jdbc.queryForObject("select count(*) from revoked_tokens", Integer.class)).isPositive();
    }

    @Test
    void cookieLogoutNeedsTheCsrfTokenAndRevokesTheOldCookie() {
        Browser b = api.browser();
        b.login(member.username(), PASSWORD, "Cookie");
        String oldCookie = b.cookieHeader();

        Res refused = b.send("POST", "/api/auth/logout", null, null);
        assertThat(refused.status()).isEqualTo(403);
        assertThat(refused.json().get("code").asText()).isEqualTo("CSRF_TOKEN_INVALID");
        assertThat(b.get("/api/auth/me").status()).isEqualTo(200);   // still signed in

        String token = b.fetchCsrfToken();
        Res done = b.send("POST", "/api/auth/logout", null, token);
        assertThat(done.status()).isEqualTo(204);
        assertThat(done.setCookies().toString()).contains("crm.auth=").contains("Max-Age=0");
        assertThat(b.get("/api/auth/me").status()).isEqualTo(401);
        assertThat(api.get("/api/auth/me", Auth.cookie(oldCookie)).status()).isEqualTo(401);   // replay
    }

    @Test
    void sessionLogoutDestroysTheServerSideSession() {
        Browser b = api.browser();
        b.login(member.username(), PASSWORD, "Session");
        String oldCookie = b.cookieHeader();
        assertThat(b.send("POST", "/api/auth/logout", null, null).status()).isEqualTo(403);
        assertThat(b.send("POST", "/api/auth/logout", null, b.fetchCsrfToken()).status()).isEqualTo(204);
        assertThat(b.get("/api/auth/me").status()).isEqualTo(401);
        assertThat(api.get("/api/auth/me", Auth.cookie(oldCookie)).status()).isEqualTo(401);   // replay
    }

    @Test
    void signingOutOfOneModeLeavesTheOthersWorking() {
        String bearer = api.jwt(member.username(), PASSWORD);
        Browser cookie = api.browser();
        cookie.login(member.username(), PASSWORD, "Cookie");
        Browser session = api.browser();
        session.login(member.username(), PASSWORD, "Session");

        assertThat(api.post("/api/auth/logout", null, Auth.bearer(bearer)).status()).isEqualTo(204);
        assertThat(api.get("/api/auth/me", Auth.bearer(bearer)).status()).isEqualTo(401);
        assertThat(cookie.get("/api/auth/me").status()).isEqualTo(200);
        assertThat(session.get("/api/auth/me").status()).isEqualTo(200);

        assertThat(cookie.send("POST", "/api/auth/logout", null, cookie.fetchCsrfToken()).status()).isEqualTo(204);
        assertThat(cookie.get("/api/auth/me").status()).isEqualTo(401);
        assertThat(session.get("/api/auth/me").status()).isEqualTo(200);
    }

    @Test
    void logoutNeedsASignedInCaller() {
        assertThat(api.post("/api/auth/logout", null, Auth.none()).status()).isEqualTo(401);
    }

    // ---------------- credentials that stop working ----------------

    @Test
    void aDeactivatedUserIsRefusedOnTheNextRequestInEveryMode() {
        String bearer = api.jwt(member.username(), PASSWORD);
        Browser cookie = api.browser();
        cookie.login(member.username(), PASSWORD, "Cookie");
        Browser session = api.browser();
        session.login(member.username(), PASSWORD, "Session");
        assertThat(api.get("/api/auth/me", Auth.bearer(bearer)).status()).isEqualTo(200);

        jdbc.update("update users set is_active = false where id = ?", member.id());

        assertThat(api.get("/api/auth/me", Auth.bearer(bearer)).status()).isEqualTo(401);
        assertThat(cookie.get("/api/auth/me").status()).isEqualTo(401);
        assertThat(session.get("/api/auth/me").status()).isEqualTo(401);
        assertThat(api.login(member.username(), PASSWORD, "Jwt").status()).isEqualTo(401);
    }

    @Test
    void aChangedRoleEndsOldCredentials() {
        String bearer = api.jwt(member.username(), PASSWORD);
        assertThat(api.get("/api/accounts", Auth.bearer(bearer)).status()).isEqualTo(200);
        jdbc.update("update users set role = 'ADMIN' where id = ?", member.id());
        assertThat(api.get("/api/accounts", Auth.bearer(bearer)).status()).isEqualTo(401);
        // a fresh sign-in carries the new role
        assertThat(api.get("/api/users", Auth.bearer(api.jwt(member.username(), PASSWORD))).status()).isEqualTo(200);
    }

    @Test
    void aDeletedUsersCredentialIsRefused() {
        Cred gone = newUser(UserRole.USER);
        String bearer = api.jwt(gone.username(), PASSWORD);
        jdbc.update("delete from users where id = ?", gone.id());
        assertThat(api.get("/api/auth/me", Auth.bearer(bearer)).status()).isEqualTo(401);
    }

    @Test
    void jwtLifetimeIsFifteenMinutesAndCookieLifetimeSixty() {
        Browser cookie = api.browser();
        cookie.login(member.username(), PASSWORD, "Cookie");
        String bearer = api.jwt(member.username(), PASSWORD);
        assertThat(api.get("/api/auth/me", Auth.bearer(bearer)).status()).isEqualTo(200);

        clock.advance(Duration.ofMinutes(14));
        assertThat(api.get("/api/auth/me", Auth.bearer(bearer)).status()).isEqualTo(200);
        clock.advance(Duration.ofMinutes(2));      // 16 minutes: past 15 plus the 30 second skew
        assertThat(api.get("/api/auth/me", Auth.bearer(bearer)).status()).isEqualTo(401);
        assertThat(cookie.get("/api/auth/me").status()).isEqualTo(200);
        clock.advance(Duration.ofMinutes(45));     // 61 minutes
        assertThat(cookie.get("/api/auth/me").status()).isEqualTo(401);
    }

    @Test
    void forgedAndMisdirectedTokensAreRefused() {
        String good = api.jwt(member.username(), PASSWORD);
        String tampered = good.substring(0, good.length() - 2) + (good.endsWith("AA") ? "BB" : "AA");
        assertThat(api.get("/api/auth/me", Auth.bearer(tampered)).status()).isEqualTo(401);
        assertThat(api.get("/api/auth/me", Auth.bearer("not.a.token")).status()).isEqualTo(401);
        assertThat(api.get("/api/auth/me", Auth.bearer("")).status()).isEqualTo(401);

        // the cookie value cannot be replayed as a Bearer token, nor the Bearer token as a cookie
        Browser cookie = api.browser();
        cookie.login(member.username(), PASSWORD, "Cookie");
        assertThat(api.get("/api/auth/me", Auth.bearer(cookie.cookie("crm.auth"))).status()).isEqualTo(401);
        assertThat(api.get("/api/auth/me", Auth.cookie("crm.auth=" + good)).status()).isEqualTo(401);

        // unsigned token
        String header = b64("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        String payload = b64("{\"iss\":\"nimbus-crm\",\"aud\":\"nimbus-crm-api\",\"sub\":\"" + admin.id()
                + "\",\"name\":\"" + admin.username() + "\",\"role\":\"ADMIN\",\"jti\":\"abc\",\"exp\":4102444800}");
        assertThat(api.get("/api/auth/me", Auth.bearer(header + "." + payload + ".")).status()).isEqualTo(401);

        // signed with some other key
        String other = Jwts.builder().issuer("nimbus-crm").audience().add("nimbus-crm-api").and()
                .subject(String.valueOf(admin.id())).claim("name", admin.username()).claim("role", "ADMIN")
                .id("zzz").expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(new SecretKeySpec("a-completely-different-signing-key-0123456789".getBytes(StandardCharsets.UTF_8),
                        "HmacSHA256"), Jwts.SIG.HS256).compact();
        assertThat(api.get("/api/auth/me", Auth.bearer(other)).status()).isEqualTo(401);
    }

    private static String b64(String s) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }

    // ---------------- CSRF ----------------

    @Test
    void csrfEndpointReturnsTheHeaderNameAndATokenAndSetsItsCookie() {
        Browser b = api.browser();
        b.login(member.username(), PASSWORD, "Cookie");
        Res r = b.get("/api/auth/csrf");
        assertThat(r.status()).isEqualTo(200);
        assertThat(r.json().fieldNames()).toIterable().containsExactly("headerName", "token");
        assertThat(r.json().get("headerName").asText()).isEqualTo("X-CSRF-TOKEN");
        assertThat(r.json().get("token").asText()).isNotBlank();
        assertThat(r.setCookies().get(0)).startsWith("crm.csrf=").contains("HttpOnly").contains("SameSite=Strict");
        assertThat(api.get("/api/auth/csrf", Auth.none()).status()).isEqualTo(401);
    }

    @Test
    void cookieAndSessionChangesNeedTheTokenButReadsAndBearerDoNot() {
        Browser cookie = api.browser();
        cookie.login(member.username(), PASSWORD, "Cookie");
        Browser session = api.browser();
        session.login(member.username(), PASSWORD, "Session");

        for (Browser b : List.of(cookie, session)) {
            assertThat(b.get("/api/accounts").status()).isEqualTo(200);                       // safe method: no token
            Res refused = b.send("POST", "/api/accounts", "{\"name\":\"Csrf Co\"}", null);
            assertThat(refused.status()).isEqualTo(403);
            assertThat(refused.json().get("code").asText()).isEqualTo("CSRF_TOKEN_INVALID");
            assertThat(refused.json().get("title").asText()).isEqualTo("Invalid or missing CSRF token.");
            assertThat(b.send("POST", "/api/accounts", "{\"name\":\"Csrf Co\"}", "garbage").status()).isEqualTo(403);
            assertThat(b.send("POST", "/api/accounts", "{\"name\":\"Csrf Co\"}", "%%%").status()).isEqualTo(403);

            String token = b.fetchCsrfToken();
            assertThat(b.send("POST", "/api/accounts", "{\"name\":\"Csrf Co\"}", token).status()).isEqualTo(201);
            assertThat(b.send("PUT", "/api/accounts/999999999", "{\"name\":\"x\"}", token).status()).isEqualTo(404);
        }
        // Bearer needs no token
        assertThat(api.post("/api/accounts", "{\"name\":\"Csrf Co\"}", memberAuth).status()).isEqualTo(201);
    }

    @Test
    void aTokenBelongsToTheUserAndTheCookieItWasIssuedFor() {
        Browser alice = api.browser();
        alice.login(member.username(), PASSWORD, "Cookie");
        Browser bob = api.browser();
        bob.login(admin.username(), PASSWORD, "Cookie");
        String aliceToken = alice.fetchCsrfToken();
        bob.fetchCsrfToken();

        // Alice's token, sent with Bob's cookies
        assertThat(bob.send("POST", "/api/accounts", "{\"name\":\"x\"}", aliceToken).status()).isEqualTo(403);
        // her own token works for her
        assertThat(alice.send("POST", "/api/accounts", "{\"name\":\"x\"}", aliceToken).status()).isEqualTo(201);
        // a fresh token after signing in again is a different token
        alice.login(member.username(), PASSWORD, "Cookie");
        assertThat(alice.fetchCsrfToken()).isNotEqualTo(aliceToken);
    }

    @Test
    void aRoleRefusalComesBeforeTheCsrfCheck() {
        Browser b = api.browser();
        b.login(member.username(), PASSWORD, "Cookie");
        Res r = b.send("DELETE", "/api/accounts/1", null, null);
        assertThat(r.status()).isEqualTo(403);
        assertThat(r.body()).isEmpty();
    }

    // ---------------- lockout ----------------

    @Test
    void fiveWrongPasswordsLockTheAccountEvenForTheRightPassword() {
        Cred who = newUser(UserRole.USER);
        for (int i = 0; i < 5; i++) {
            assertThat(api.login(who.username(), "wrong-password", "Jwt").status()).isEqualTo(401);
        }
        Res locked = api.login(who.username(), PASSWORD, "Jwt");
        assertThat(locked.status()).isEqualTo(401);
        assertThat(locked.json().get("code").asText()).isEqualTo("INVALID_CREDENTIALS");   // same generic answer
        assertThat(locked.body()).doesNotContainIgnoringCase("locked");
        assertThat(jdbc.queryForObject("select lockout_ends_at from users where id = ?", java.sql.Timestamp.class, who.id()))
                .isNotNull();

        clock.advance(Duration.ofMinutes(14));
        assertThat(api.login(who.username(), PASSWORD, "Jwt").status()).isEqualTo(401);
        clock.advance(Duration.ofMinutes(2));
        assertThat(api.login(who.username(), PASSWORD, "Jwt").status()).isEqualTo(200);
    }

    @Test
    void aGoodLoginResetsTheFailureCount() {
        Cred who = newUser(UserRole.USER);
        for (int round = 0; round < 3; round++) {
            for (int i = 0; i < 4; i++) {
                assertThat(api.login(who.username(), "wrong-password", "Jwt").status()).isEqualTo(401);
            }
            assertThat(api.login(who.username(), PASSWORD, "Jwt").status()).as("round " + round).isEqualTo(200);
        }
        assertThat(jdbc.queryForObject("select failed_login_attempts from users where id = ?", Integer.class, who.id()))
                .isZero();
    }

    @Test
    void failuresAgainstOneAccountDoNotLockAnother() {
        Cred a = newUser(UserRole.USER);
        Cred b = newUser(UserRole.USER);
        for (int i = 0; i < 6; i++) {
            api.login(a.username(), "wrong-password", "Jwt");
        }
        assertThat(api.login(b.username(), PASSWORD, "Jwt").status()).isEqualTo(200);
    }

    // ---------------- users list ----------------

    @Test
    void theUserListIsAdminOnlyAndPaged() {
        assertThat(api.get("/api/users", Auth.none()).status()).isEqualTo(401);
        Res forbidden = api.get("/api/users", memberAuth);
        assertThat(forbidden.status()).isEqualTo(403);
        assertThat(forbidden.body()).isEmpty();

        Res ok = api.get("/api/users?page=0&size=100", adminAuth);
        assertThat(ok.status()).isEqualTo(200);
        JsonNode list = ok.json();
        assertThat(list.isArray()).isTrue();
        assertThat(list.size()).isGreaterThanOrEqualTo(2);
        assertThat(list.get(0).fieldNames()).toIterable()
                .containsExactly("id", "username", "email", "role", "isActive", "createdAt");
        assertThat(ok.body()).doesNotContainIgnoringCase("password").doesNotContain("$2");
        List<String> names = new java.util.ArrayList<>();
        list.forEach(u -> names.add(u.get("username").asText()));
        assertThat(names).isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER);

        assertThat(api.get("/api/users?page=0&size=1", adminAuth).json()).hasSize(1);
        assertThat(api.get("/api/users", adminAuth).json().size()).isLessThanOrEqualTo(20);   // default size 20
        assertThat(api.get("/api/users?size=0", adminAuth).json().get("errors").get("Size")).isNotNull();
        assertThat(api.get("/api/users?size=101", adminAuth).status()).isEqualTo(400);
        assertThat(api.get("/api/users?page=-1", adminAuth).json().get("errors").get("Page")).isNotNull();
        assertThat(api.get("/api/users?page=10001", adminAuth).status()).isEqualTo(400);
        assertThat(api.get("/api/users?page=2147483647&size=100", adminAuth).status()).isEqualTo(400);
        assertThat(api.get("/api/users?page=10000&size=100", adminAuth).json()).isEmpty();
    }

    @Test
    void theUserListIsAdminOnlyInEveryMode() {
        for (String mode : List.of("Cookie", "Session")) {
            Browser m = api.browser();
            m.login(member.username(), PASSWORD, mode);
            assertThat(m.get("/api/users").status()).as("USER via " + mode).isEqualTo(403);
            Browser a = api.browser();
            a.login(admin.username(), PASSWORD, mode);
            assertThat(a.get("/api/users").status()).as("ADMIN via " + mode).isEqualTo(200);
        }
    }

    // ---------------- housekeeping ----------------

    @Test
    void healthAnswersHealthyAndUnknownRoutesAre404() {
        Res h = api.get("/health", Auth.none());
        assertThat(h.status()).isEqualTo(200);
        assertThat(h.body()).isEqualTo("Healthy");
        assertThat(api.get("/api/nothing-here", adminAuth).status()).isEqualTo(404);
        assertThat(api.send("PATCH", "/api/accounts", "{}", adminAuth).status()).isEqualTo(405);
    }
}
