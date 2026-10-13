package com.example.crm.config;

import com.example.crm.security.AuthMode;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Sign-in behaviour (app.auth.*). */
@ConfigurationProperties("app.auth")
public record AuthProperties(
        @DefaultValue("Jwt") String defaultMode,
        @DefaultValue("60") int cookieMinutes,
        @DefaultValue("10") int loginRateLimitPerMinute,
        @DefaultValue("5") int maxFailedLogins,
        @DefaultValue("15") int lockoutMinutes,
        @DefaultValue("12") int bcryptStrength,
        @DefaultValue("false") boolean cookieSecure) {

    public AuthProperties {
        if (!AuthMode.tryParse(defaultMode).isPresent()) {
            throw new IllegalArgumentException("app.auth.default-mode must be Jwt, Cookie or Session.");
        }
        if (loginRateLimitPerMinute < 1 || maxFailedLogins < 1 || lockoutMinutes < 1 || cookieMinutes < 1) {
            throw new IllegalArgumentException("app.auth limits must be positive.");
        }
    }

    public AuthMode defaultAuthMode() {
        return AuthMode.tryParse(defaultMode).orElseThrow();
    }
}
