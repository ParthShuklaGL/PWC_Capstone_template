package com.example.crm.security;

import java.util.Optional;

public enum AuthMode {
    Jwt, Cookie, Session;

    /**
     * Accepts the names Jwt, Cookie and Session in any letter case, with surrounding spaces. Numbers, lists and
     * unknown names are refused.
     */
    public static Optional<AuthMode> tryParse(String text) {
        if (text == null) {
            return Optional.empty();
        }
        String trimmed = text.strip();
        if (trimmed.isEmpty() || !trimmed.chars().allMatch(Character::isLetter)) {
            return Optional.empty();
        }
        for (AuthMode mode : values()) {
            if (mode.name().equalsIgnoreCase(trimmed)) {
                return Optional.of(mode);
            }
        }
        return Optional.empty();
    }
}
