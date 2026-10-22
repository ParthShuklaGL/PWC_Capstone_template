package com.nimbussales.crm.web;

import com.nimbussales.crm.domain.AppUser;
import com.nimbussales.crm.repository.UserRepository;
import com.nimbussales.crm.security.CurrentUser;
import com.nimbussales.crm.security.JwtService;
import com.nimbussales.crm.web.dto.AuthDtos.LoginRequest;
import com.nimbussales.crm.web.dto.AuthDtos.LoginResponse;
import com.nimbussales.crm.web.dto.AuthDtos.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUser currentUser;
    /** Checked against when the email is unknown, so a miss takes as long as a wrong password. */
    private final String noSuchUserHash;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                          CurrentUser currentUser) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.currentUser = currentUser;
        this.noSuchUserHash = passwordEncoder.encode("no-such-user");
    }

    @PostMapping("/auth/login")
    @Operation(summary = "Sign in with email and password; returns a bearer token")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Optional<AppUser> user = users.findByEmailIgnoreCase(request.email().trim());
        boolean matches = passwordEncoder.matches(request.password(),
                user.map(AppUser::getPasswordHash).orElse(noSuchUserHash));
        // Same answer for an unknown email and a wrong password, so the API does not say
        // which addresses have accounts.
        if (user.isEmpty() || !matches) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "INVALID_CREDENTIALS",
                    "message", "Email or password is incorrect."));
        }
        JwtService.IssuedToken issued = jwtService.issue(user.get());
        return ResponseEntity.ok(new LoginResponse(issued.token(), issued.expiresAt(), UserResponse.from(user.get())));
    }

    @GetMapping("/auth/me")
    @Operation(summary = "Who the bearer token belongs to")
    public ResponseEntity<?> me() {
        return users.findByUserRef(currentUser.get().userRef())
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(UserResponse.from(user)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "error", "UNAUTHENTICATED",
                        "message", "Sign in to continue.")));
    }

    @GetMapping("/users")
    @Operation(summary = "Everyone who can sign in, for choosing a deal owner (ADMIN)")
    public List<UserResponse> listUsers() {
        return users.findAllByOrderByIdAsc().stream().map(UserResponse::from).toList();
    }
}
