package com.nimbussales.crm.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** The {@code crm.jwt.*} settings in application.yml. */
@ConfigurationProperties(prefix = "crm.jwt")
public record JwtProperties(String issuer, String audience, String secret, int expiryMinutes) {

    public JwtProperties {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                    "crm.jwt.secret must be at least 32 characters. Set it in application.yml or the JWT_SECRET environment variable.");
        }
    }
}
