package com.example.fsd.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Not a Spring bean: SecurityConfig creates it so it runs once, inside the security chain.
 * Authenticates a request from a JWT, taken from the Authorization header (JWT mode) or from
 * the access_token cookie (cookie mode). A request that already has a session login is left
 * alone. A bad or expired token is ignored, so the request is simply anonymous and gets a 401.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "access_token";

    private final JwtService jwt;
    private final UserDetailsService userDetails;

    public JwtAuthFilter(JwtService jwt, UserDetailsService userDetails) {
        this.jwt = jwt;
        this.userDetails = userDetails;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            extractToken(request).flatMap(jwt::validate).ifPresent(username -> {
                try {
                    UserDetails user = userDetails.loadUserByUsername(username);
                    if (user.isEnabled()) {
                        SecurityContextHolder.getContext().setAuthentication(
                                UsernamePasswordAuthenticationToken.authenticated(
                                        user, null, user.getAuthorities()));
                    }
                } catch (UsernameNotFoundException ignored) {
                    // the user was deleted after the token was issued
                }
            });
        }
        chain.doFilter(request, response);
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return Optional.of(header.substring(7));
        }
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if (COOKIE_NAME.equals(c.getName())) {
                    return Optional.of(c.getValue());
                }
            }
        }
        return Optional.empty();
    }
}
