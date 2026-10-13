package com.example.crm.security;

import com.example.crm.config.AuthProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Fixed-window rate limit (app.auth.login-rate-limit-per-minute, default 10) per client address for register and
 * login. Over the limit the answer is 429 with no body. Counters live in memory, like the .NET limiter.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class LoginRateLimitFilter extends OncePerRequestFilter {
    private static final long WINDOW_MILLIS = 60_000;

    private static final class Window {
        long start;
        int count;
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final int permits;
    private final Clock clock;

    public LoginRateLimitFilter(AuthProperties auth, Clock clock) {
        this.permits = auth.loginRateLimitPerMinute();
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !("/api/auth/login".equals(path) || "/api/auth/register".equals(path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!tryAcquire(request.getRemoteAddr())) {
            response.setStatus(429);
            response.setHeader("Cache-Control", "no-store");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean tryAcquire(String client) {
        long now = clock.millis();
        if (windows.size() > 10_000) {
            windows.values().removeIf(w -> now - w.start >= WINDOW_MILLIS);
        }
        Window w = windows.computeIfAbsent(client, k -> new Window());
        synchronized (w) {
            if (now - w.start >= WINDOW_MILLIS) {
                w.start = now;
                w.count = 0;
            }
            return ++w.count <= permits;
        }
    }
}
