package com.example.crm.service;

import com.example.crm.web.ValidationFailedException;
import java.math.BigDecimal;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Collects field errors under PascalCase keys (Name, Website, LostReason ...) with FluentValidation-style
 * messages, then throws one ValidationFailedException. Every rule runs, so a caller sees all problems at once.
 */
public final class Validation {
    private final Map<String, List<String>> errors = new LinkedHashMap<>();

    public static Validation start() {
        return new Validation();
    }

    public Validation error(String field, String message) {
        List<String> list = errors.computeIfAbsent(field, k -> new ArrayList<>());
        if (!list.contains(message)) {
            list.add(message);
        }
        return this;
    }

    public boolean has(String field) {
        return errors.containsKey(field);
    }

    public Validation notEmpty(String field, String value) {
        if (value == null || value.isBlank()) {
            error(field, "'" + label(field) + "' must not be empty.");
        }
        return this;
    }

    public Validation maxLength(String field, String value, int max) {
        if (value != null && value.length() > max) {
            error(field, "The length of '" + label(field) + "' must be " + max + " characters or fewer. You entered "
                    + value.length() + " characters.");
        }
        return this;
    }

    public Validation length(String field, String value, int min, int max) {
        int n = value == null ? 0 : value.length();
        if (n < min || n > max) {
            error(field, "'" + label(field) + "' must be between " + min + " and " + max + " characters. You entered "
                    + n + " characters.");
        }
        return this;
    }

    public Validation minLength(String field, String value, int min) {
        int n = value == null ? 0 : value.length();
        if (n < min) {
            error(field, label(field) + " must be at least " + min + " characters.");
        }
        return this;
    }

    public Validation greaterThanZero(String field, long value) {
        if (value <= 0) {
            error(field, "'" + label(field) + "' must be greater than '0'.");
        }
        return this;
    }

    public Validation between(String field, long value, long min, long max) {
        if (value < min || value > max) {
            error(field, "'" + label(field) + "' must be between " + min + " and " + max + ". You entered " + value + ".");
        }
        return this;
    }

    /** Same rule as ASP.NET Core's email attribute: exactly one @, not first, not last. Not a deliverability check. */
    public Validation email(String field, String value) {
        if (value != null && !value.isEmpty()) {
            int at = value.indexOf('@');
            if (at <= 0 || at != value.lastIndexOf('@') || at == value.length() - 1) {
                error(field, "'" + label(field) + "' is not a valid email address.");
            }
        }
        return this;
    }

    public Validation matches(String field, String value, String regex, String message) {
        if (value != null && !value.isEmpty() && !value.matches(regex)) {
            error(field, message);
        }
        return this;
    }

    /** Null passes (the field is optional); anything else must be a full http or https address with a host. */
    public Validation httpUrl(String field, String value) {
        if (value == null) {
            return this;
        }
        boolean ok = false;
        try {
            URI uri = new URI(value);
            ok = uri.isAbsolute() && uri.getHost() != null
                    && ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()));
        } catch (java.net.URISyntaxException ignored) {
            // not a URL
        }
        if (!ok) {
            error(field, "Website must be a full http or https address.");
        }
        return this;
    }

    /** A money amount that fits decimal(18,2): 0 to 1 000 000 000 000, at most two decimals, not rounded silently. */
    public Validation money(String field, BigDecimal value, BigDecimal max) {
        if (value.signum() < 0 || value.compareTo(max) > 0) {
            error(field, "'" + label(field) + "' must be between 0 and " + max.toPlainString() + ". You entered "
                    + value.toPlainString() + ".");
        }
        if (value.scale() > 2 || value.precision() - value.scale() > 16) {
            error(field, "'" + label(field) + "' must not be more than 18 digits in total, with allowance for 2 decimals.");
        }
        return this;
    }

    public void throwIfAny() {
        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
    }

    /** "AccountId" becomes "Account Id", as FluentValidation words it. */
    private static String label(String field) {
        return field.replaceAll("(?<=[a-z])(?=[A-Z])", " ");
    }

    /** Page 0..10000 and size 1..100, capped so page * size cannot overflow. Shared by every list. */
    public Validation paging(int page, int size) {
        between("Page", page, 0, 10_000);
        between("Size", size, 1, 100);
        return this;
    }

    /** Trims, and turns blank into null, for optional text fields. */
    public static String clean(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
