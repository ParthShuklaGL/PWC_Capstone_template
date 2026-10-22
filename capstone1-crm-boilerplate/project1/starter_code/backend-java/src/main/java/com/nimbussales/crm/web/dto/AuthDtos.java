package com.nimbussales.crm.web.dto;

import com.nimbussales.crm.domain.AppUser;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/** Request and response shapes for sign-in. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "email is required")
            String email,
            @NotBlank(message = "password is required")
            String password) {
    }

    /** Send {@code token} back as {@code Authorization: Bearer <token>} until {@code expiresAt}. */
    public record LoginResponse(String token, Instant expiresAt, UserResponse user) {
    }

    /** {@code role} is ADMIN or USER. */
    public record UserResponse(String userRef, String displayName, String email, String role) {

        public static UserResponse from(AppUser user) {
            return new UserResponse(user.getUserRef(), user.getDisplayName(), user.getEmail(), user.getRole().name());
        }
    }
}
