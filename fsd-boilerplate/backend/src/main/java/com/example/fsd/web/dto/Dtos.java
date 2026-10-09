package com.example.fsd.web.dto;

import com.example.fsd.domain.Product;
import com.example.fsd.domain.Role;
import com.example.fsd.domain.User;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Request and response shapes for the API. The entities never leave the server. */
public final class Dtos {

    private Dtos() {
    }

    // ---- auth / users ----

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Email @Size(max = 120) String email,
            @NotBlank @Size(min = 8, max = 100) String password) {}

    public record CreateUserRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Email @Size(max = 120) String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotNull Role role) {}

    public record UpdateUserRequest(
            @Email @Size(max = 120) String email,
            Role role,
            Boolean enabled,
            @Size(min = 8, max = 100) String password) {}

    public record UserResponse(Long id, String username, String email, Role role, boolean enabled,
                               Instant createdAt) {
        public static UserResponse of(User u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getEmail(), u.getRole(),
                    u.isEnabled(), u.getCreatedAt());
        }
    }

    public record TokenResponse(String token, String tokenType, long expiresInSeconds,
                                UserResponse user) {}

    // ---- products ----

    public record ProductRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 60) String category,
            @NotNull @DecimalMin("0.00") BigDecimal price,
            @NotNull @Min(0) Integer quantity) {}

    public record ProductResponse(Long id, String name, String category, BigDecimal price,
                                  int quantity, String createdBy, Instant createdAt,
                                  Instant updatedAt) {
        public static ProductResponse of(Product p) {
            return new ProductResponse(p.getId(), p.getName(), p.getCategory(), p.getPrice(),
                    p.getQuantity(), p.getCreatedBy(), p.getCreatedAt(), p.getUpdatedAt());
        }
    }

    public record PageResponse<T>(List<T> items, int page, int size, long totalElements,
                                  int totalPages) {}

    // ---- reports ----

    public record CategoryReport(String category, Long products, Long units, BigDecimal stockValue) {}

    public record ProductSummary(long totalProducts, long totalUnits, BigDecimal totalStockValue,
                                 List<CategoryReport> byCategory, List<ProductResponse> lowStock) {}

    public record UserReport(long totalUsers, Map<String, Long> byRole) {}

    // ---- errors ----

    public record ErrorBody(String error, String message, Map<String, String> fields) {}
}
