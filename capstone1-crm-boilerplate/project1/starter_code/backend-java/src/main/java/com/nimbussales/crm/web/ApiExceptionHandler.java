package com.nimbussales.crm.web;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.nimbussales.crm.service.ConflictException;
import com.nimbussales.crm.service.FieldValidationException;
import com.nimbussales.crm.service.ImportFormatException;
import com.nimbussales.crm.service.NotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Turns exceptions into the house error shapes:
 *
 * <pre>
 *   { "error": "DEAL_NOT_FOUND", "message": "No deal with reference D-99999" }      404, 409, 401, 403
 *   { "error": "VALIDATION_FAILED", "fields": { "title": "title is required" } }    400
 * </pre>
 *
 * The 401 and 403 answers come from SecurityConfig, before a controller is reached.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<Map<String, Object>> notFound(NotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getError(), ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    ResponseEntity<Map<String, Object>> conflict(ConflictException ex) {
        return error(HttpStatus.CONFLICT, ex.getError(), ex.getMessage());
    }

    @ExceptionHandler(FieldValidationException.class)
    ResponseEntity<Map<String, Object>> rule(FieldValidationException ex) {
        return validation(ex.getFields());
    }

    @ExceptionHandler(ImportFormatException.class)
    ResponseEntity<Map<String, Object>> importFormat(ImportFormatException ex) {
        return error(HttpStatus.BAD_REQUEST, "IMPORT_FORMAT_INVALID", ex.getMessage());
    }

    /** A body that failed its @NotBlank, @Size, @DecimalMin... annotations. First message per field. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> invalidBody(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));
        return validation(fields);
    }

    /** A body that is not JSON, or a value of the wrong type, such as "next tuesday" for a date. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> unreadableBody(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof JsonMappingException mapping && !mapping.getPath().isEmpty()) {
            String field = mapping.getPath().get(mapping.getPath().size() - 1).getFieldName();
            Class<?> type = mapping instanceof InvalidFormatException format ? format.getTargetType() : null;
            return validation(Map.of(field, describeType(field, type)));
        }
        return error(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "The request body is not valid JSON.");
    }

    /** A query or path parameter of the wrong type, such as page=abc. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Map<String, Object>> badParameter(TypeMismatchException ex) {
        String name = ex.getPropertyName() == null ? "parameter" : ex.getPropertyName();
        return validation(Map.of(name, describeType(name, ex.getRequiredType())));
    }

    /** Spring's own errors (unknown URL, wrong method, missing parameter) keep their status. */
    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(Exception ex) {
        if (ex instanceof ErrorResponse known) {
            HttpStatus status = HttpStatus.valueOf(known.getStatusCode().value());
            return error(status, status.name(), known.getBody().getDetail());
        }
        LOG.error("Unhandled exception", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Something went wrong on the server.");
    }

    private static String describeType(String field, Class<?> type) {
        if (type == LocalDate.class) {
            return field + " must be a date in the form yyyy-MM-dd";
        }
        if (type == OffsetDateTime.class) {
            return field + " must be a date and time, such as 2026-10-05T14:30:00Z";
        }
        if (type != null && (Number.class.isAssignableFrom(type) || type == BigDecimal.class
                || type == int.class || type == long.class)) {
            return field + " must be a number";
        }
        return field + " is not in a valid format";
    }

    private static ResponseEntity<Map<String, Object>> validation(Map<String, String> fields) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "VALIDATION_FAILED");
        body.put("fields", fields);
        return ResponseEntity.badRequest().body(body);
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String error, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
