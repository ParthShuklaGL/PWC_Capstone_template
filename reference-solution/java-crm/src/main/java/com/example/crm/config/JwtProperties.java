package com.example.crm.config;

import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * JWT settings (app.jwt.*). The signing key comes from the environment (JWT_SIGNING_KEY) and is never in a committed
 * file. A short or obviously non-random key stops the application at startup.
 */
@ConfigurationProperties("app.jwt")
public record JwtProperties(
        @DefaultValue("nimbus-crm") String issuer,
        @DefaultValue("nimbus-crm-api") String audience,
        @DefaultValue("15") int accessTokenMinutes,
        String signingKey) {

    public static final int MINIMUM_LENGTH = 32;
    public static final int MINIMUM_DISTINCT_CHARACTERS = 12;

    public JwtProperties {
        String problem = check(signingKey);
        if (problem != null) {
            throw new IllegalArgumentException("app.jwt.signing-key " + problem);
        }
    }

    /** Null when the key is acceptable, otherwise why it is not. */
    public static String check(String key) {
        if (key == null || key.length() < MINIMUM_LENGTH) {
            return "must be at least " + MINIMUM_LENGTH + " characters.";
        }
        long distinct = key.chars().boxed().collect(Collectors.toSet()).size();
        return distinct < MINIMUM_DISTINCT_CHARACTERS
                ? "is too repetitive: it needs at least " + MINIMUM_DISTINCT_CHARACTERS
                        + " different characters. Use a random value."
                : null;
    }

    public SecretKey key() {
        return new SecretKeySpec(signingKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }
}
