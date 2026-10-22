package com.nimbussales.crm.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactCreateRequest(
        @NotBlank(message = "accountRef is required")
        String accountRef,
        @NotBlank(message = "firstName is required")
        @Size(max = 80, message = "firstName must be 80 characters or fewer")
        String firstName,
        @NotBlank(message = "lastName is required")
        @Size(max = 80, message = "lastName must be 80 characters or fewer")
        String lastName,
        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid email address")
        @Size(max = 160, message = "email must be 160 characters or fewer")
        String email,
        @Size(max = 40, message = "phone must be 40 characters or fewer")
        String phone,
        @Size(max = 120, message = "jobTitle must be 120 characters or fewer")
        String jobTitle) {
}
