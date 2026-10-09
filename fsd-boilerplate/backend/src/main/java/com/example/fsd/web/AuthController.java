package com.example.fsd.web;

import com.example.fsd.domain.Role;
import com.example.fsd.domain.User;
import com.example.fsd.repo.UserRepository;
import com.example.fsd.security.JwtAuthFilter;
import com.example.fsd.security.JwtService;
import com.example.fsd.web.dto.Dtos.LoginRequest;
import com.example.fsd.web.dto.Dtos.RegisterRequest;
import com.example.fsd.web.dto.Dtos.TokenResponse;
import com.example.fsd.web.dto.Dtos.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registration, the three login modes, logout and "who am I".
 *
 * <ul>
 *   <li>POST /jwt/login: returns a token; the client sends it as Authorization: Bearer.</li>
 *   <li>POST /cookie/login: sets the same token in an HttpOnly cookie; the browser sends it.</li>
 *   <li>POST /session/login: stores the login in a server-side HttpSession (JSESSIONID).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwt;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final SecurityContextRepository contextRepository;
    private final boolean cookieSecure;

    public AuthController(AuthenticationManager authManager, JwtService jwt, UserRepository users,
                          PasswordEncoder encoder, SecurityContextRepository contextRepository,
                          @Value("${app.cookie.secure}") boolean cookieSecure) {
        this.authManager = authManager;
        this.jwt = jwt;
        this.users = users;
        this.encoder = encoder;
        this.contextRepository = contextRepository;
        this.cookieSecure = cookieSecure;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest req) {
        if (users.existsByUsername(req.username())) {
            throw ApiException.conflict("That username is taken.");
        }
        if (users.existsByEmail(req.email())) {
            throw ApiException.conflict("That email is already registered.");
        }
        // Self-registration always creates a plain USER. Admins are made by an admin.
        User saved = users.save(new User(req.username(), req.email(),
                encoder.encode(req.password()), Role.USER));
        return UserResponse.of(saved);
    }

    @PostMapping("/jwt/login")
    public TokenResponse jwtLogin(@Valid @RequestBody LoginRequest req) {
        User user = authenticate(req);
        return new TokenResponse(jwt.issue(user.getUsername(), user.getRole().name()),
                "Bearer", jwt.ttlSeconds(), UserResponse.of(user));
    }

    @PostMapping("/cookie/login")
    public UserResponse cookieLogin(@Valid @RequestBody LoginRequest req,
                                    HttpServletResponse response) {
        User user = authenticate(req);
        ResponseCookie cookie = ResponseCookie
                .from(JwtAuthFilter.COOKIE_NAME, jwt.issue(user.getUsername(), user.getRole().name()))
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofSeconds(jwt.ttlSeconds()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return UserResponse.of(user);
    }

    @PostMapping("/session/login")
    public UserResponse sessionLogin(@Valid @RequestBody LoginRequest req,
                                     HttpServletRequest request, HttpServletResponse response) {
        User user = authenticate(req);
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(), null,
                org.springframework.security.core.authority.AuthorityUtils
                        .createAuthorityList("ROLE_" + user.getRole().name()));

        // A new login gets a new session id, so an old id cannot be reused (session fixation).
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return UserResponse.of(user);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        ResponseCookie expired = ResponseCookie.from(JwtAuthFilter.COOKIE_NAME, "")
                .httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/").maxAge(0).build();
        response.addHeader(HttpHeaders.SET_COOKIE, expired.toString());
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return users.findByUsername(authentication.getName())
                .map(UserResponse::of)
                .orElseThrow(() -> ApiException.notFound("User"));
    }

    private User authenticate(LoginRequest req) {
        authManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(req.username(), req.password()));
        return users.findByUsername(req.username()).orElseThrow();
    }
}
