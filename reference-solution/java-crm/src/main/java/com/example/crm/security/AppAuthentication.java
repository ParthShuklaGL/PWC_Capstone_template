package com.example.crm.security;

import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** The authenticated state Spring Security sees: an AppPrincipal and one ROLE_ authority. */
public class AppAuthentication extends AbstractAuthenticationToken {
    private final AppPrincipal principal;

    public AppAuthentication(AppPrincipal principal) {
        super(List.of(new SimpleGrantedAuthority("ROLE_" + principal.role())));
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return "";
    }

    @Override
    public AppPrincipal getPrincipal() {
        return principal;
    }
}
