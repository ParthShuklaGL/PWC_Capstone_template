package com.example.crm.web;

import org.springframework.http.HttpStatus;

/** An expected business failure: becomes an RFC 9457 problem with the given status, a code and a message. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final String title;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    public ApiException(HttpStatus status, String code, String message, String title) {
        super(message);
        this.status = status;
        this.code = code;
        this.title = title;
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }
    public String title() { return title; }

    public static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    public static ApiException unauthorized(String code, String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, code, message);
    }

    // The business failures the CRM can report, one place for their codes and wording.
    public static ApiException accountNotFound() {
        return notFound("ACCOUNT_NOT_FOUND", "That account does not exist.");
    }

    public static ApiException contactNotFound() {
        return notFound("CONTACT_NOT_FOUND", "That contact does not exist.");
    }

    public static ApiException dealNotFound() {
        return notFound("DEAL_NOT_FOUND", "That deal does not exist.");
    }

    public static ApiException accountHasContacts() {
        return conflict("ACCOUNT_HAS_CONTACTS", "This account still has contacts. Move or delete them first.");
    }

    public static ApiException contactHasHistory() {
        return conflict("CONTACT_HAS_HISTORY",
                "This contact still has deals or logged activities, so it cannot be deleted.");
    }

    public static ApiException invalidCredentials() {
        return unauthorized("INVALID_CREDENTIALS", "Invalid username or password.");
    }
}
