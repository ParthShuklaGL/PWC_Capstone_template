package com.nimbussales.crm.service;

/** A reference that matches nothing (or nothing the caller may see). Answers 404. */
public class NotFoundException extends RuntimeException {

    private final String error;

    private NotFoundException(String error, String message) {
        super(message);
        this.error = error;
    }

    public static NotFoundException account(String accountRef) {
        return new NotFoundException("ACCOUNT_NOT_FOUND", "No account with reference " + accountRef);
    }

    public static NotFoundException contact(String contactRef) {
        return new NotFoundException("CONTACT_NOT_FOUND", "No contact with reference " + contactRef);
    }

    public static NotFoundException deal(String dealRef) {
        return new NotFoundException("DEAL_NOT_FOUND", "No deal with reference " + dealRef);
    }

    public String getError() {
        return error;
    }
}
