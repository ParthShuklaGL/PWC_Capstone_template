package com.example.crm.security;

import com.example.crm.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * CSRF protection for the credentials a browser sends on its own (the auth cookie and the session cookie). A
 * state-changing request authenticated by either must carry the token in X-CSRF-TOKEN (get one from GET
 * /api/auth/csrf). A Bearer request needs none: a forged cross-site request cannot set an Authorization header.
 * It runs after authentication and authorization, as an endpoint filter does in the .NET API, so a role refusal
 * (403 with no body) still comes first.
 */
public class CsrfInterceptor implements HandlerInterceptor {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final CsrfService csrf;

    public CsrfInterceptor(CsrfService csrf) {
        this.csrf = csrf;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!SAFE_METHODS.contains(request.getMethod()) && auth instanceof AppAuthentication app
                && app.getPrincipal().usesBrowserCredential()
                && !csrf.isValid(request, app.getPrincipal().userId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "CSRF_TOKEN_INVALID",
                    "Fetch a token from GET /api/auth/csrf and send it in the X-CSRF-TOKEN header.",
                    "Invalid or missing CSRF token.");
        }
        return true;
    }
}
