package com.example.crm.web;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Builds RFC 9457 problem documents in the same shape the .NET API produces. */
public final class Problems {
    private static final SecureRandom RANDOM = new SecureRandom();
    public static final MediaType PROBLEM_JSON = MediaType.APPLICATION_PROBLEM_JSON;

    private Problems() {}

    public static ResponseEntity<Object> of(HttpStatus status, String title, String detail, String code) {
        Map<String, Object> body = base(status, title);
        if (detail != null) {
            body.put("detail", detail);
        }
        if (code != null) {
            body.put("code", code);
        }
        body.put("traceId", traceId());
        return ResponseEntity.status(status).contentType(PROBLEM_JSON).body(body);
    }

    public static ResponseEntity<Object> of(ApiException e) {
        return of(e.status(), e.title() != null ? e.title() : title(e.status()), e.getMessage(), e.code());
    }

    public static ResponseEntity<Object> validation(Map<String, List<String>> errors) {
        Map<String, Object> body = base(HttpStatus.BAD_REQUEST, "One or more validation errors occurred.");
        body.put("errors", errors);
        body.put("traceId", traceId());
        return ResponseEntity.badRequest().contentType(PROBLEM_JSON).body(body);
    }

    public static ResponseEntity<Object> badRequest() {
        return of(HttpStatus.BAD_REQUEST, "The request could not be read.",
                "Check that the body is valid JSON and that every value, such as a stage or status name, "
                        + "is one the API accepts.", "BAD_REQUEST");
    }

    public static ResponseEntity<Object> serverError() {
        return of(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", null, null);
    }

    private static Map<String, Object> base(HttpStatus status, String title) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", type(status));
        body.put("title", title);
        body.put("status", status.value());
        return body;
    }

    private static String type(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> "https://tools.ietf.org/html/rfc9110#section-15.5.1";
            case UNAUTHORIZED -> "https://tools.ietf.org/html/rfc9110#section-15.5.2";
            case FORBIDDEN -> "https://tools.ietf.org/html/rfc9110#section-15.5.4";
            case NOT_FOUND -> "https://tools.ietf.org/html/rfc9110#section-15.5.5";
            case CONFLICT -> "https://tools.ietf.org/html/rfc9110#section-15.5.10";
            case INTERNAL_SERVER_ERROR -> "https://tools.ietf.org/html/rfc9110#section-15.6.1";
            default -> "about:blank";
        };
    }

    private static String title(HttpStatus status) {
        return status.getReasonPhrase();
    }

    /** A W3C-style trace id, so a caller can quote it. It carries no information about the server. */
    private static String traceId() {
        byte[] trace = new byte[16];
        byte[] span = new byte[8];
        RANDOM.nextBytes(trace);
        RANDOM.nextBytes(span);
        return "00-" + HexFormat.of().formatHex(trace) + "-" + HexFormat.of().formatHex(span) + "-00";
    }
}
