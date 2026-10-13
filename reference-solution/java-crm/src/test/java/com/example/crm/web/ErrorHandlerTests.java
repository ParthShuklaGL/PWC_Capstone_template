package com.example.crm.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** The shape of every problem document, without a server. Always runs. */
class ErrorHandlerTests {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @SuppressWarnings("unchecked")
    private static Map<String, Object> body(ResponseEntity<Object> r) {
        return (Map<String, Object>) r.getBody();
    }

    @Test
    void anUnexpectedFailureIsAGenericFiveHundredThatLeaksNothing() {
        ResponseEntity<Object> r = handler.unexpected(new IllegalStateException("jdbc:mysql://secret-host password=hunter2"));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(r.getHeaders().getContentType().toString()).isEqualTo("application/problem+json");
        assertThat(body(r)).containsEntry("status", 500).containsEntry("title", "An unexpected error occurred.")
                .containsKeys("type", "traceId").doesNotContainKeys("detail", "code", "errors");
        assertThat(body(r).toString()).doesNotContain("hunter2").doesNotContain("secret-host");
    }

    @Test
    void aDuplicateKeyRaceIsAConflictAndAnyOtherIntegrityFailureIsAGenericFiveHundred() {
        var duplicate = new DataIntegrityViolationException("x", new SQLException("Duplicate entry", "23000", 1062));
        ResponseEntity<Object> r = handler.integrity(duplicate);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(body(r)).containsEntry("code", "DUPLICATE_VALUE");

        var other = new DataIntegrityViolationException("x", new SQLException("Data too long", "22001", 1406));
        assertThat(handler.integrity(other).getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Test
    void businessFailuresCarryACodeAndADetail() {
        ResponseEntity<Object> r = handler.apiException(ApiException.accountHasContacts());
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(body(r)).containsEntry("title", "Conflict").containsEntry("status", 409)
                .containsEntry("code", "ACCOUNT_HAS_CONTACTS").containsKeys("type", "detail", "traceId");
        assertThat(body(handler.apiException(ApiException.invalidCredentials()))).containsEntry("title", "Unauthorized")
                .containsEntry("code", "INVALID_CREDENTIALS");
    }

    @Test
    void validationFailuresListFieldKeysInOrder() {
        ResponseEntity<Object> r = handler.validation(new ValidationFailedException(
                Map.of("Name", List.of("'Name' must not be empty."))));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(body(r)).containsEntry("title", "One or more validation errors occurred.").containsEntry("status", 400)
                .containsKeys("type", "errors", "traceId");
    }

    @Test
    void anUnreadableBodyIsBadRequestWithoutFrameworkText() {
        ResponseEntity<Object> r = Problems.badRequest();
        assertThat(body(r)).containsEntry("code", "BAD_REQUEST").containsEntry("title", "The request could not be read.");
        assertThat(body(r).toString()).doesNotContain("Jackson").doesNotContain("com.example");
    }
}
