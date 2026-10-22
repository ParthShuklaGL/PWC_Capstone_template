package com.nimbussales.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AccountRequest(
        @NotBlank(message = "name is required")
        @Size(max = 200, message = "name must be 200 characters or fewer")
        String name,
        @Size(max = 80, message = "industry must be 80 characters or fewer")
        String industry,
        @Size(max = 80, message = "country must be 80 characters or fewer")
        String country,
        @Size(max = 200, message = "website must be 200 characters or fewer")
        String website) {
}
