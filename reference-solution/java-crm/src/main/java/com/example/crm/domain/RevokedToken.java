package com.example.crm.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** A JWT or auth cookie that was signed out before it expired, identified by its jti. */
@Entity
@Table(name = "revoked_tokens")
public class RevokedToken {
    @Id
    @Column(name = "token_id", length = 64)
    private String tokenId;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected RevokedToken() {}

    public RevokedToken(String tokenId, Instant expiresAt) {
        this.tokenId = tokenId;
        this.expiresAt = expiresAt;
    }

    public String getTokenId() { return tokenId; }
    public Instant getExpiresAt() { return expiresAt; }
}
