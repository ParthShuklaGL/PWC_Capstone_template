package com.nimbussales.crm.security;

import com.nimbussales.crm.domain.AppUser;
import com.nimbussales.crm.domain.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Issues and checks the bearer token.
 *
 * <p>The token is an HS256-signed JWT. Its claims are: {@code sub} the userRef, {@code uid}
 * the database id, {@code email}, {@code name} and {@code role}, plus issuer, audience,
 * issued-at and expiry. Anyone can read the claims (paste a token into jwt.io); only the
 * server, which holds the secret, can produce a valid signature.
 */
@Service
public class JwtService {

    static final String UID_CLAIM = "uid";
    static final String NAME_CLAIM = "name";
    static final String EMAIL_CLAIM = "email";
    static final String ROLE_CLAIM = "role";

    private final JwtProperties properties;
    private final SecretKey key;
    private final Clock clock;

    @Autowired
    public JwtService(JwtProperties properties) {
        this(properties, Clock.systemUTC());
    }

    JwtService(JwtProperties properties, Clock clock) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.clock = clock;
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }

    public IssuedToken issue(AppUser user) {
        Instant now = clock.instant();
        Instant expires = now.plus(Duration.ofMinutes(properties.expiryMinutes()));
        String token = Jwts.builder()
                .issuer(properties.issuer())
                .audience().add(properties.audience()).and()
                .subject(user.getUserRef())
                .claim(UID_CLAIM, user.getId())
                .claim(EMAIL_CLAIM, user.getEmail())
                .claim(NAME_CLAIM, user.getDisplayName())
                .claim(ROLE_CLAIM, user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expires))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
        return new IssuedToken(token, expires);
    }

    /** The user the token belongs to, or empty when it is forged, expired or malformed. */
    public Optional<AuthenticatedUser> verify(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(properties.issuer())
                    .requireAudience(properties.audience())
                    .clock(() -> Date.from(clock.instant()))
                    .clockSkewSeconds(30)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(new AuthenticatedUser(
                    claims.get(UID_CLAIM, Long.class),
                    claims.getSubject(),
                    claims.get(EMAIL_CLAIM, String.class),
                    claims.get(NAME_CLAIM, String.class),
                    Role.valueOf(claims.get(ROLE_CLAIM, String.class))));
        } catch (JwtException | IllegalArgumentException | NullPointerException invalid) {
            return Optional.empty();
        }
    }
}
