package com.example.crm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.crm.config.AuthProperties;
import com.example.crm.config.JwtProperties;
import com.example.crm.security.AuthMode;
import com.example.crm.security.LoginRateLimitFilter;
import com.example.crm.security.PasswordService;
import com.example.crm.service.Validation;
import com.example.crm.support.MutableClock;
import com.example.crm.web.CsvWriter;
import com.example.crm.web.CsvWriter.Value;
import com.example.crm.web.ValidationFailedException;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Pure logic: no database, always runs. */
class UnitTests {

    // ---------------- CSV ----------------

    @Test
    void csvHasHeadersThenOneCrlfLinePerRow() {
        String csv = CsvWriter.write(List.of("A", "B"),
                List.of(List.of(Value.text("x"), Value.number(7L)), List.of(Value.text("y"), Value.number(new BigDecimal("1.5")))));
        assertThat(csv).isEqualTo("A,B\r\nx,7\r\ny,1.50\r\n");
    }

    @Test
    void cellsAreQuotedAndFormulaDefused() {
        assertThat(CsvWriter.cell("=1+1")).isEqualTo("\"'=1+1\"");
        assertThat(CsvWriter.cell("+SUM(A1)")).isEqualTo("\"'+SUM(A1)\"");
        assertThat(CsvWriter.cell("-2+3")).isEqualTo("\"'-2+3\"");
        assertThat(CsvWriter.cell("@cmd")).isEqualTo("\"'@cmd\"");
        assertThat(CsvWriter.cell("plain")).isEqualTo("plain");
        assertThat(CsvWriter.cell("mid=dle")).isEqualTo("mid=dle");
        assertThat(CsvWriter.cell("a,b")).isEqualTo("\"a,b\"");
        assertThat(CsvWriter.cell("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
    }

    @Test
    void controlCharactersAndLineBreaksAreHandled() {
        assertThat(CsvWriter.cell("\tTab")).isEqualTo("\"'\tTab\"");
        assertThat(CsvWriter.cell("\rCr")).isEqualTo("\"'\rCr\"");
        assertThat(CsvWriter.cell("two\nlines")).isEqualTo("\"two\nlines\"");
        assertThat(CsvWriter.cell("")).isEmpty();
    }

    @Test
    void aNegativeNumberStaysANumberAndIsNotDefused() {
        String csv = CsvWriter.write(List.of("N"), List.of(List.of(Value.number(new BigDecimal("-5")))));
        assertThat(csv).isEqualTo("N\r\n-5.00\r\n");
    }

    @Test
    void moneyUsesADotAndTwoDecimalsWhateverTheLocale() {
        java.util.Locale old = java.util.Locale.getDefault();
        try {
            java.util.Locale.setDefault(java.util.Locale.GERMANY);
            assertThat(Value.number(new BigDecimal("1234567.5")).text()).isEqualTo("1234567.50");
            assertThat(Value.number(new BigDecimal("0.005")).text()).isEqualTo("0.01");
        } finally {
            java.util.Locale.setDefault(old);
        }
    }

    // ---------------- validation rules ----------------

    private static ValidationFailedException failure(Runnable rules) {
        return org.junit.jupiter.api.Assertions.assertThrows(ValidationFailedException.class, rules::run);
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://a.example", "http://localhost:8080/x?y=1", "HTTPS://EXAMPLE.COM"})
    void httpAndHttpsAddressesPass(String url) {
        Validation.start().httpUrl("Website", url).throwIfAny();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ftp://a.example", "example.com", "", "mailto:a@b.c", "http://", "//example.com", "javascript:alert(1)"})
    void otherAddressesFail(String url) {
        assertThat(failure(() -> Validation.start().httpUrl("Website", url).throwIfAny()).errors()).containsKey("Website");
    }

    @Test
    void aNullWebsiteIsAllowed() {
        Validation.start().httpUrl("Website", null).throwIfAny();
    }

    @ParameterizedTest
    @ValueSource(strings = {"a@b.c", "first.last@example.co.uk", "a+tag@example.com"})
    void sensibleEmailsPass(String email) {
        Validation.start().email("Email", email).throwIfAny();
    }

    @ParameterizedTest
    @ValueSource(strings = {"nope", "@b.c", "a@", "a@@b.c", "a@b@c"})
    void badEmailsFail(String email) {
        assertThat(failure(() -> Validation.start().email("Email", email).throwIfAny()).errors()).containsKey("Email");
    }

    @Test
    void everyRuleRunsSoACallerSeesAllProblemsAndKeysArePascalCase() {
        var ex = failure(() -> Validation.start().notEmpty("Name", " ").maxLength("Name", " ", 1)
                .greaterThanZero("AccountId", 0).between("Page", 20000, 0, 10000).throwIfAny());
        assertThat(ex.errors()).containsOnlyKeys("Name", "AccountId", "Page");
        assertThat(ex.errors().get("AccountId").get(0)).isEqualTo("'Account Id' must be greater than '0'.");
    }

    @Test
    void moneyMustFitTwoDecimalsAndTheRange() {
        BigDecimal max = new BigDecimal("1000000000000");
        Validation.start().money("Value", new BigDecimal("1234.56"), max).money("Value", BigDecimal.ZERO, max)
                .money("Value", max, max).throwIfAny();
        for (String bad : List.of("-0.01", "1000000000000.01", "1.234", "0.001")) {
            assertThat(failure(() -> Validation.start().money("Value", new BigDecimal(bad), max).throwIfAny()).errors())
                    .as(bad).containsKey("Value");
        }
    }

    @Test
    void blankOptionalTextBecomesNull() {
        assertThat(Validation.clean("  ")).isNull();
        assertThat(Validation.clean(null)).isNull();
        assertThat(Validation.clean("  x ")).isEqualTo("x");
    }

    // ---------------- sign-in modes and keys ----------------

    @ParameterizedTest
    @CsvSource({"Jwt,Jwt", "cookie,Cookie", "SESSION,Session", "'  Cookie  ',Cookie"})
    void authModeAcceptsTheThreeNamesInAnyCase(String text, AuthMode expected) {
        assertThat(AuthMode.tryParse(text)).contains(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "99", "-5", "Cookie,Jwt", " 1 ", "", "   ", "Carrier-pigeon", "2"})
    void authModeRefusesNumbersListsAndUnknownNames(String text) {
        assertThat(AuthMode.tryParse(text)).isEmpty();
        assertThat(AuthMode.tryParse(null)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"short", "", "abababababababababababababababababababab", "0123456789012345678901234567890123456789",
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void aShortOrRepetitiveSigningKeyStopsStartup(String key) {
        assertThatThrownBy(() -> new JwtProperties("i", "a", 15, key)).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.jwt.signing-key");
    }

    @Test
    void aMissingKeyStopsStartupAndARandomOneIsAccepted() {
        assertThatThrownBy(() -> new JwtProperties("i", "a", 15, null)).isInstanceOf(IllegalArgumentException.class);
        String random = java.util.UUID.randomUUID() + "-" + java.util.UUID.randomUUID();
        assertThat(new JwtProperties("i", "a", 15, random).key().getEncoded()).hasSize(random.length());
    }

    @Test
    void anUnknownDefaultModeStopsStartup() {
        assertThatThrownBy(() -> new AuthProperties("Pigeon", 60, 10, 5, 15, 4, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---------------- passwords ----------------

    private static PasswordService passwords() {
        return new PasswordService(new AuthProperties("Jwt", 60, 10, 5, 15, 4, false));
    }

    @Test
    void passwordsAreHashedAndVerified() {
        PasswordService p = passwords();
        String hash = p.hash("Correct#Horse-2026");
        assertThat(hash).startsWith("$2").doesNotContain("Correct");
        assertThat(p.verify(hash, "Correct#Horse-2026")).isTrue();
        assertThat(p.verify(hash, "wrong")).isFalse();
        assertThat(p.verify(null, "anything")).isFalse();            // no such user: compared against a decoy, never true
        assertThat(p.hash("Correct#Horse-2026")).isNotEqualTo(hash);   // salted
    }

    @Test
    void anOverlongPasswordIsNeverSilentlyTruncated() {
        PasswordService p = passwords();
        String seventyTwo = "p".repeat(72);
        String hash = p.hash(seventyTwo);
        assertThat(p.verify(hash, seventyTwo)).isTrue();
        assertThat(p.verify(hash, seventyTwo + "extra")).isFalse();
        assertThat(PasswordService.fits(seventyTwo + "x")).isFalse();
    }

    @Test
    void aHashMadeWithALowerWorkFactorIsFlaggedForRehash() {
        String weak = passwords().hash("Some#Password-2026");
        PasswordService stronger = new PasswordService(new AuthProperties("Jwt", 60, 10, 5, 15, 5, false));
        assertThat(stronger.needsRehash(weak)).isTrue();
        assertThat(passwords().needsRehash(weak)).isFalse();
    }

    // ---------------- rate limit ----------------

    private static int hit(LoginRateLimitFilter filter, String path, String client) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr(client);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response.getStatus();
    }

    @Test
    void loginAndRegisterAreLimitedPerClientPerMinute() throws Exception {
        MutableClock clock = new MutableClock();
        LoginRateLimitFilter filter = new LoginRateLimitFilter(new AuthProperties("Jwt", 60, 3, 5, 15, 4, false), clock);
        for (int i = 0; i < 3; i++) {
            assertThat(hit(filter, "/api/auth/login", "10.0.0.1")).isEqualTo(200);
        }
        assertThat(hit(filter, "/api/auth/login", "10.0.0.1")).isEqualTo(429);
        assertThat(hit(filter, "/api/auth/register", "10.0.0.1")).isEqualTo(429);   // the limit is shared
        assertThat(hit(filter, "/api/auth/login", "10.0.0.2")).isEqualTo(200);      // another client is unaffected
        assertThat(hit(filter, "/api/accounts", "10.0.0.1")).isEqualTo(200);        // other routes are not limited
        clock.advance(Duration.ofSeconds(61));
        assertThat(hit(filter, "/api/auth/login", "10.0.0.1")).isEqualTo(200);      // a new window
    }
}
