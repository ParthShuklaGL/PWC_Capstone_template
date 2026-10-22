package com.nimbussales.crm.service;

/** The request is well formed, but the deal's state does not allow it. Answers 409. */
public class ConflictException extends RuntimeException {

    private final String error;

    private ConflictException(String error, String message) {
        super(message);
        this.error = error;
    }

    public static ConflictException stageTransition(String message) {
        return new ConflictException("DEAL_STAGE_TRANSITION_INVALID", message);
    }

    public static ConflictException dealClosed(String dealRef) {
        return new ConflictException("DEAL_CLOSED", "Deal " + dealRef + " is closed and cannot be changed");
    }

    public static ConflictException deleteNotAllowed(String dealRef, String stage) {
        return new ConflictException("DEAL_DELETE_NOT_ALLOWED", "Deal " + dealRef + " is in " + stage
                + " and cannot be deleted. Only PROSPECTING deals can be deleted; move it to LOST instead");
    }

    public String getError() {
        return error;
    }
}
