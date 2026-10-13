package com.example.crm.service;

import org.springframework.data.jpa.domain.Specification;

/** Small helpers for the list filters. */
final class Specs {
    private static final char ESCAPE = '!';

    private Specs() {}

    /**
     * "Contains" over one or more text columns. MySQL compares with the column collation (utf8mb4_0900_ai_ci), so the
     * match ignores case and accents, like the .NET API. The user's % and _ are escaped so they match themselves.
     */
    static <T> Specification<T> containsAny(String term, String... fields) {
        String pattern = "%" + term.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        return (root, query, cb) -> {
            var predicates = new jakarta.persistence.criteria.Predicate[fields.length];
            for (int i = 0; i < fields.length; i++) {
                predicates[i] = cb.like(root.get(fields[i]), pattern, ESCAPE);
            }
            return cb.or(predicates);
        };
    }

    static <T> Specification<T> and(Specification<T> left, Specification<T> right) {
        return left == null ? right : left.and(right);
    }
}
