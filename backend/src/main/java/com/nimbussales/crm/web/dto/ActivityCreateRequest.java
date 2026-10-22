package com.nimbussales.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/** {@code type} is CALL, EMAIL, MEETING or NOTE. {@code occurredAt} defaults to now. */
public record ActivityCreateRequest(
        @NotBlank(message = "type is required")
        String type,
        @NotBlank(message = "subject is required")
        @Size(max = 200, message = "subject must be 200 characters or fewer")
        String subject,
        @Size(max = 2000, message = "notes must be 2000 characters or fewer")
        String notes,
        OffsetDateTime occurredAt) {
}
