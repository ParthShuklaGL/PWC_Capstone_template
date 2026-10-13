package com.example.crm.security;

import com.example.crm.config.JwtProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Anti-forgery tokens in the two-part style ASP.NET Core uses. GET /api/auth/csrf sets a random crm.csrf cookie and
 * returns a request token: an HMAC-SHA256 of that cookie value and the signed-in user id. A state-changing request made
 * with a cookie or session credential must send the token in X-CSRF-TOKEN. A token is bound to the cookie it was issued
 * for and to the user, so it cannot be used by anyone else or after signing in as someone else. The HMAC key is derived
 * from the JWT signing key; only the JDK Mac class is used.
 */
@Service
public class CsrfService {
    public static final String HEADER_NAME = "X-CSRF-TOKEN";
    public static final String COOKIE_NAME = "crm.csrf";

    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKey key;

    public CsrfService(JwtProperties jwt) {
        this.key = jwt.key();
    }

    public String newCookieValue() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String requestToken(String cookieValue, long userId) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hmac(cookieValue, userId));
    }

    public boolean isValid(HttpServletRequest request, long userId) {
        String header = request.getHeader(HEADER_NAME);
        String cookie = cookieValue(request);
        if (header == null || cookie == null) {
            return false;
        }
        byte[] supplied;
        try {
            supplied = Base64.getUrlDecoder().decode(header);
        } catch (IllegalArgumentException e) {
            return false;
        }
        return MessageDigest.isEqual(supplied, hmac(cookie, userId));
    }

    private static String cookieValue(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie c : request.getCookies()) {
            if (COOKIE_NAME.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private byte[] hmac(String cookieValue, long userId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return mac.doFinal(("csrf|" + cookieValue + "|" + userId).getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }
}
