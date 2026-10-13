package com.example.crm.security;

import com.example.crm.config.AuthProperties;
import com.example.crm.config.JwtProperties;
import com.example.crm.domain.Times;
import com.example.crm.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Issues and reads the two signed credentials: the Bearer access token (audience nimbus-crm-api) and the value of the
 * crm.auth cookie (audience nimbus-crm-api-cookie, so one can never be replayed as the other). HS256 only.
 */
@Service
public class JwtTokenService {
    public record Issued(String token, Instant expiresAt) {}

    private static final String COOKIE_AUDIENCE_SUFFIX = "-cookie";

    private final JwtProperties jwt;
    private final AuthProperties auth;
    private final Clock clock;
    private final SecretKey key;

    public JwtTokenService(JwtProperties jwt, AuthProperties auth, Clock clock) {
        this.jwt = jwt;
        this.auth = auth;
        this.clock = clock;
        this.key = jwt.key();
    }

    public Issued issueAccessToken(User user) {
        return issue(user, jwt.audience(), Duration.ofMinutes(jwt.accessTokenMinutes()));
    }

    public Issued issueCookieToken(User user) {
        return issue(user, cookieAudience(), Duration.ofMinutes(auth.cookieMinutes()));
    }

    /** Verifies signature, algorithm, issuer, audience and lifetime (30 s of clock skew). Empty when anything is wrong. */
    public Optional<AppPrincipal> readAccessToken(String token) {
        return read(token, jwt.audience(), AppPrincipal.BEARER);
    }

    public Optional<AppPrincipal> readCookieToken(String token) {
        return read(token, cookieAudience(), AppPrincipal.COOKIES);
    }

    private String cookieAudience() {
        return jwt.audience() + COOKIE_AUDIENCE_SUFFIX;
    }

    private Issued issue(User user, String audience, Duration lifetime) {
        Instant now = Times.now(clock);
        Instant expires = now.plus(lifetime);
        String token = Jwts.builder()
                .issuer(jwt.issuer())
                .audience().add(audience).and()
                .issuedAt(Date.from(now))
                .notBefore(Date.from(now))
                .expiration(Date.from(expires))
                .id(UUID.randomUUID().toString().replace("-", ""))
                .subject(String.valueOf(user.getId()))
                .claim("name", user.getUsername())
                .claim("role", user.getRole().name())
                .signWith(key, Jwts.SIG.HS256)
                .compact();
        return new Issued(token, expires);
    }

    private Optional<AppPrincipal> read(String token, String audience, String via) {
        try {
            var jws = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(jwt.issuer())
                    .requireAudience(audience)
                    .clockSkewSeconds(30)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token);
            if (!"HS256".equals(jws.getHeader().getAlgorithm())) {
                return Optional.empty();
            }
            Claims c = jws.getPayload();
            String role = c.get("role", String.class);
            String name = c.get("name", String.class);
            if (c.getSubject() == null || role == null || name == null || c.getId() == null) {
                return Optional.empty();
            }
            return Optional.of(new AppPrincipal(Long.parseLong(c.getSubject()), name, role, c.getId(), via));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
