package com.example.crm.web;

import com.example.crm.config.AuthProperties;
import com.example.crm.config.JwtProperties;
import com.example.crm.domain.User;
import com.example.crm.security.AppPrincipal;
import com.example.crm.security.AuthMode;
import com.example.crm.security.CredentialAuthenticationFilter;
import com.example.crm.security.CredentialValidator;
import com.example.crm.security.CsrfService;
import com.example.crm.security.JwtTokenService;
import com.example.crm.service.AuthService;
import com.example.crm.web.dto.AuthDtos.CsrfResponse;
import com.example.crm.web.dto.AuthDtos.LoginRequest;
import com.example.crm.web.dto.AuthDtos.LoginResponse;
import com.example.crm.web.dto.AuthDtos.MeResponse;
import com.example.crm.web.dto.AuthDtos.RegisterRequest;
import com.example.crm.web.dto.AuthDtos.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthService authService;
    private final JwtTokenService tokens;
    private final CredentialValidator validator;
    private final CsrfService csrf;
    private final AuthProperties auth;
    private final JwtProperties jwt;
    private final Clock clock;

    public AuthController(AuthService authService, JwtTokenService tokens, CredentialValidator validator,
                          CsrfService csrf, AuthProperties auth, JwtProperties jwt, Clock clock) {
        this.authService = authService;
        this.tokens = tokens;
        this.validator = validator;
        this.csrf = csrf;
        this.auth = auth;
        this.jwt = jwt;
        this.clock = clock;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<UserDto> register(@RequestBody RegisterRequest request) {
        UserDto created = authService.register(request.username(), request.email(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@RequestBody LoginRequest request, HttpServletRequest http, HttpServletResponse response) {
        AuthMode mode = auth.defaultAuthMode();
        if (request.mode() != null) {
            mode = AuthMode.tryParse(request.mode()).orElseThrow(() -> new ValidationFailedException(
                    Map.of("Mode", List.of("Mode must be Jwt, Cookie or Session."))));
        }

        User user = authService.login(request.username(), request.password());
        UserDto dto = UserDto.from(user);

        switch (mode) {
            case Cookie -> {
                JwtTokenService.Issued issued = tokens.issueCookieToken(user);
                addCookie(response, ResponseCookie.from(CredentialAuthenticationFilter.AUTH_COOKIE, issued.token())
                        .httpOnly(true).sameSite("Lax").secure(auth.cookieSecure()).path("/")
                        .maxAge(Duration.ofMinutes(auth.cookieMinutes())).build());
                return new LoginResponse(dto, "Cookie", null, issued.expiresAt());
            }
            case Session -> {
                if (http.getSession(false) != null) {
                    http.changeSessionId();
                }
                HttpSession session = http.getSession(true);
                session.setAttribute(CredentialAuthenticationFilter.SESSION_USER_ID, user.getId());
                session.setAttribute(CredentialAuthenticationFilter.SESSION_USER_NAME, user.getUsername());
                session.setAttribute(CredentialAuthenticationFilter.SESSION_ROLE, user.getRole().name());
                return new LoginResponse(dto, "Session", null, null);
            }
            default -> {
                JwtTokenService.Issued issued = tokens.issueAccessToken(user);
                return new LoginResponse(dto, "Jwt", issued.token(), issued.expiresAt());
            }
        }
    }

    @GetMapping("/auth/me")
    public MeResponse me(@AuthenticationPrincipal AppPrincipal p) {
        return new MeResponse(p.userId(), p.username(), p.role(), p.via());
    }

    @GetMapping("/auth/csrf")
    public CsrfResponse csrf(@AuthenticationPrincipal AppPrincipal p, HttpServletResponse response) {
        String cookieValue = csrf.newCookieValue();
        addCookie(response, ResponseCookie.from(CsrfService.COOKIE_NAME, cookieValue)
                .httpOnly(true).sameSite("Strict").secure(auth.cookieSecure()).path("/").build());
        return new CsrfResponse(CsrfService.HEADER_NAME,
                csrf.requestToken(cookieValue, p.userId()));
    }

    /** Ends the credential this request used. The other two modes are left alone. */
    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AppPrincipal p,
                                       HttpServletRequest http, HttpServletResponse response) {
        Instant now = clock.instant();
        switch (p.via()) {
            case AppPrincipal.BEARER -> {
                if (p.tokenId() != null) {
                    validator.revoke(p.tokenId(), now.plus(Duration.ofMinutes(jwt.accessTokenMinutes())));
                }
            }
            case AppPrincipal.COOKIES -> {
                if (p.tokenId() != null) {
                    validator.revoke(p.tokenId(), now.plus(Duration.ofMinutes(auth.cookieMinutes())));
                }
                addCookie(response, expired(CredentialAuthenticationFilter.AUTH_COOKIE));
            }
            default -> {
                HttpSession session = http.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
                addCookie(response, expired("crm.session"));
            }
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users")
    public List<UserDto> listUsers(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return authService.listUsers(page, size);
    }

    private ResponseCookie expired(String name) {
        return ResponseCookie.from(name, "").httpOnly(true).sameSite("Lax").secure(auth.cookieSecure()).path("/")
                .maxAge(0).build();
    }

    private static void addCookie(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
