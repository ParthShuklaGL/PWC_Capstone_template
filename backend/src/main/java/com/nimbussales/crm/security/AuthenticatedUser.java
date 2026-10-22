package com.nimbussales.crm.security;

import com.nimbussales.crm.domain.Role;

/** Who is calling, as read from a valid token. The principal of every authenticated request. */
public record AuthenticatedUser(Long id, String userRef, String email, String displayName, Role role) {
}
