package com.example.crm.web;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /health answers the text Healthy when the database answers, like the .NET health check. */
@RestController
@io.swagger.v3.oas.annotations.Hidden
public class HealthController {
    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        try {
            jdbc.queryForObject("select 1", Integer.class);
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body("Healthy");
        } catch (RuntimeException e) {
            return ResponseEntity.status(503).contentType(MediaType.TEXT_PLAIN).body("Unhealthy");
        }
    }
}
