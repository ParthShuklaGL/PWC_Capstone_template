package com.example.crm.web;

import java.util.List;
import java.util.Map;

/** Field errors keyed by PascalCase property name, exactly as the .NET API emits them. */
public class ValidationFailedException extends RuntimeException {
    private final Map<String, List<String>> errors;

    public ValidationFailedException(Map<String, List<String>> errors) {
        super("Validation failed");
        this.errors = errors;
    }

    public Map<String, List<String>> errors() { return errors; }
}
