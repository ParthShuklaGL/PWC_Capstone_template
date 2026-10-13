package com.example.crm.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Picks the credential a request carries and authenticates it: a Bearer header wins over the crm.auth cookie, which
 * wins over the crm.session session. The first one present is the only one consulted (a bad Bearer token is not
 * rescued by a good cookie). After the mode accepts it, CredentialValidator confirms the user is still active with the
 * same role and that the credential was not signed out. If anything fails the request stays anonymous and the security
 * chain answers 401.
 */
public class CredentialAuthenticationFilter extends OncePerRequestFilter {
    public static final String AUTH_COOKIE = "crm.auth";
    public static final String SESSION_USER_ID = "uid";
    public static final String SESSION_USER_NAME = "uname";
    public static final String SESSION_ROLE = "urole";

    private final JwtTokenService tokens;
    private final CredentialValidator validator;

    public CredentialAuthenticationFilter(JwtTokenService tokens, CredentialValidator validator) {
        this.tokens = tokens;
        this.validator = validator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Optional<AppPrincipal> principal = authenticate(request);
        principal.filter(p -> validator.isStillValid(p.userId(), p.role(), p.tokenId()))
                .ifPresentOrElse(
                        p -> SecurityContextHolder.getContext().setAuthentication(new AppAuthentication(p)),
                        () -> endSessionIfAny(request));
        chain.doFilter(request, response);
    }

    private Optional<AppPrincipal> authenticate(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return tokens.readAccessToken(header.substring(7).trim());
        }
        Cookie auth = cookie(request, AUTH_COOKIE);
        if (auth != null) {
            return tokens.readCookieToken(auth.getValue());
        }
        if (cookie(request, "crm.session") != null) {
            return fromSession(request);
        }
        return Optional.empty();
    }

    private Optional<AppPrincipal> fromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return Optional.empty();
        }
        Object id = session.getAttribute(SESSION_USER_ID);
        Object name = session.getAttribute(SESSION_USER_NAME);
        Object role = session.getAttribute(SESSION_ROLE);
        if (!(id instanceof Long userId) || !(name instanceof String n) || !(role instanceof String r)) {
            return Optional.empty();
        }
        return Optional.of(new AppPrincipal(userId, n, r, null, AppPrincipal.SESSION));
    }

    /** A session whose user was deactivated or demoted is destroyed, not just refused. */
    private void endSessionIfAny(HttpServletRequest request) {
        if (cookie(request, "crm.session") != null
                && request.getHeader("Authorization") == null && cookie(request, AUTH_COOKIE) == null) {
            HttpSession session = request.getSession(false);
            if (session != null && session.getAttribute(SESSION_USER_ID) != null) {
                session.invalidate();
            }
        }
    }

    static Cookie cookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) {
                return c;
            }
        }
        return null;
    }
}
