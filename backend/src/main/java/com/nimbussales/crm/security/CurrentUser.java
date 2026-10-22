package com.nimbussales.crm.security;

import com.nimbussales.crm.domain.Role;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Who is calling, for the services. Read from the token the filter has already checked. */
@Component
public class CurrentUser {

    public AuthenticatedUser get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new IllegalStateException("No signed-in user on this request");
        }
        return user;
    }

    public Long id() {
        return get().id();
    }

    public boolean isAdmin() {
        return get().role() == Role.ADMIN;
    }
}
