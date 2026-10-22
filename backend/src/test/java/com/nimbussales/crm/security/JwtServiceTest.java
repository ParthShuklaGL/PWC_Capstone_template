package com.nimbussales.crm.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.nimbussales.crm.domain.AppUser;
import com.nimbussales.crm.domain.Role;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final JwtProperties PROPERTIES =
            new JwtProperties("nimbus-crm", "nimbus-crm-clients", "test-signing-key-0123456789-0123456789", 60);
    private static final Instant NOW = Instant.parse("2026-10-22T09:00:00Z");

    private final JwtService service = new JwtService(PROPERTIES, Clock.fixed(NOW, ZoneOffset.UTC));

    static AppUser aisha() {
        AppUser user = mock(AppUser.class);
        when(user.getId()).thenReturn(2L);
        when(user.getUserRef()).thenReturn("U-0002");
        when(user.getEmail()).thenReturn("aisha@nimbus.test");
        when(user.getDisplayName()).thenReturn("Aisha Khan");
        when(user.getRole()).thenReturn(Role.USER);
        return user;
    }

    @Test
    void aTokenItIssuedVerifiesBackToTheSameUser() {
        JwtService.IssuedToken issued = service.issue(aisha());

        assertThat(issued.expiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(60)));
        assertThat(service.verify(issued.token())).contains(
                new AuthenticatedUser(2L, "U-0002", "aisha@nimbus.test", "Aisha Khan", Role.USER));
    }

    @Test
    void aTamperedTokenIsRefused() {
        String token = service.issue(aisha()).token();
        String[] parts = token.split("\\.");
        // Swap the payload for one that claims to be an admin; the signature no longer matches.
        String forgedPayload = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"sub\":\"U-0002\",\"uid\":2,\"role\":\"ADMIN\"}".getBytes());
        assertThat(service.verify(parts[0] + "." + forgedPayload + "." + parts[2])).isEmpty();
    }

    @Test
    void aTokenSignedWithAnotherKeyIsRefused() {
        JwtService other = new JwtService(new JwtProperties("nimbus-crm", "nimbus-crm-clients",
                "some-other-key-that-is-long-enough-0123456789", 60), Clock.fixed(NOW, ZoneOffset.UTC));
        assertThat(service.verify(other.issue(aisha()).token())).isEmpty();
    }

    @Test
    void anExpiredTokenIsRefused() {
        String token = service.issue(aisha()).token();
        JwtService later = new JwtService(PROPERTIES, Clock.fixed(NOW.plus(Duration.ofMinutes(62)), ZoneOffset.UTC));
        assertThat(later.verify(token)).isEmpty();
    }

    @Test
    void garbageIsRefused() {
        assertThat(service.verify("not-a-token")).isEmpty();
        assertThat(service.verify("")).isEmpty();
    }
}
