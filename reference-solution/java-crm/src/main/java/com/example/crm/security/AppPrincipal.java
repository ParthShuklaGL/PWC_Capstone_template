package com.example.crm.security;

/**
 * The same four facts describe a signed-in user whichever way they proved it, so one authorization rule works for
 * JWT, cookie and session. via is Bearer, Cookies or Session (the names the .NET API reports).
 */
public record AppPrincipal(long userId, String username, String role, String tokenId, String via) {
    public static final String BEARER = "Bearer";
    public static final String COOKIES = "Cookies";
    public static final String SESSION = "Session";

    public boolean usesBrowserCredential() {
        return COOKIES.equals(via) || SESSION.equals(via);
    }
}
