package com.nimbussales.crm.service;

import java.util.Map;

/**
 * A business rule on the input, as opposed to its shape. Answers in the same
 * VALIDATION_FAILED shape as a failed request body, keyed by property name.
 */
public class FieldValidationException extends RuntimeException {

    private final Map<String, String> fields;

    public FieldValidationException(String field, String message) {
        super(message);
        this.fields = Map.of(field, message);
    }

    public Map<String, String> getFields() {
        return fields;
    }
}
