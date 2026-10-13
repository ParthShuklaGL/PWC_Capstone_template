package com.example.crm.security;

import com.example.crm.domain.RevokedToken;
import com.example.crm.repo.RevokedTokenRepository;
import com.example.crm.repo.UserRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The one question all three modes ask after their own check has passed: is this credential still good? Its user must
 * exist, be active and still have the same role, and the credential must not have been signed out. Nothing is cached,
 * so a deactivation, a role change or a sign-out is refused on the very next request.
 */
@Service
public class CredentialValidator {
    private final UserRepository users;
    private final RevokedTokenRepository revoked;
    private final Clock clock;

    public CredentialValidator(UserRepository users, RevokedTokenRepository revoked, Clock clock) {
        this.users = users;
        this.revoked = revoked;
        this.clock = clock;
    }

    public boolean isStillValid(long userId, String role, String tokenId) {
        if (tokenId != null && revoked.existsById(tokenId)) {
            return false;
        }
        return users.findById(userId).map(u -> u.isActive() && u.getRole().name().equals(role)).orElse(false);
    }

    /** Records a signed-out credential until the time it would have expired anyway. */
    @Transactional
    public void revoke(String tokenId, Instant expiresAt) {
        if (!expiresAt.isAfter(clock.instant()) || revoked.existsById(tokenId)) {
            return;
        }
        try {
            revoked.saveAndFlush(new RevokedToken(tokenId, expiresAt));
        } catch (DataIntegrityViolationException alreadyRevoked) {
            // two sign-outs raced; the credential is revoked either way
        }
    }

    /** After expiry a credential is dead anyway, so its revocation row can go. */
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    @Transactional
    public void deleteExpired() {
        revoked.deleteExpired(clock.instant());
    }
}
