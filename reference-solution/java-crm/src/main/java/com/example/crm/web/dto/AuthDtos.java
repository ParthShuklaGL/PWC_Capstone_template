package com.example.crm.web.dto;

import com.example.crm.domain.User;
import java.time.Instant;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(String username, String email, String password) {}

    /** mode is Jwt, Cookie or Session; omit it to use the configured default. */
    public record LoginRequest(String username, String password, String mode) {}

    /** What the API shows about a user. There is deliberately no password field. */
    public record UserDto(long id, String username, String email, String role, boolean isActive, Instant createdAt) {
        public static UserDto from(User u) {
            return new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole().name(), u.isActive(),
                    u.getCreatedAt());
        }
    }

    /** accessToken is only present for the Jwt mode; the other modes hold the login in a cookie. */
    public record LoginResponse(UserDto user, String mode, String accessToken, Instant expiresAt) {}

    public record MeResponse(long id, String username, String role, String authenticatedVia) {}

    public record CsrfResponse(String headerName, String token) {}
}
