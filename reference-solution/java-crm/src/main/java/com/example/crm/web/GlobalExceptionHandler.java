package com.example.crm.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns every exception that reaches the MVC layer into the same problem documents the .NET API sends:
 * validation 400 with PascalCase field keys, BAD_REQUEST for unreadable bodies, 404/409 with a code, a duplicate-key
 * race as 409, and a 500 that says nothing about the cause (the cause goes to the log).
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Object> apiException(ApiException e) {
        return Problems.of(e);
    }

    @ExceptionHandler(ValidationFailedException.class)
    ResponseEntity<Object> validation(ValidationFailedException e) {
        return Problems.validation(e.errors());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Object> integrity(DataIntegrityViolationException e) {
        if (isDuplicateKey(e)) {
            return Problems.of(HttpStatus.CONFLICT, "That value already exists.", null, "DUPLICATE_VALUE");
        }
        log.error("Data integrity failure", e);
        return Problems.serverError();
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> unexpected(Exception e) {
        log.error("Unhandled exception", e);
        return Problems.serverError();
    }

    /** Malformed JSON, a wrong type, or a name that is not in an enum. The framework message names internal types, so it stays out. */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return Problems.badRequest();
    }

    /** A non-numeric id in a path is a route that does not exist (404); a bad query value is a 400. */
    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        if (ex instanceof MethodArgumentTypeMismatchException m && m.getParameter().hasParameterAnnotation(PathVariable.class)) {
            return ResponseEntity.notFound().build();
        }
        return Problems.badRequest();
    }

    /** 404 unknown route, 405, 415 and the like: the status with an empty body, as ASP.NET Core does. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        if (statusCode.value() == 400) {
            return Problems.badRequest();
        }
        if (statusCode.is5xxServerError()) {
            log.error("Framework failure", ex);
        }
        return ResponseEntity.status(statusCode).headers(headers).build();
    }

    private static boolean isDuplicateKey(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof java.sql.SQLException sql && sql.getErrorCode() == 1062) {
                return true;
            }
        }
        return false;
    }
}
