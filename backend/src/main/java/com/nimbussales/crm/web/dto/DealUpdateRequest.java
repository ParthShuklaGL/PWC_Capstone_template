package com.nimbussales.crm.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** {@code ownerRef} reassigns the deal to another rep, and is left alone when omitted. */
public record DealUpdateRequest(
        @NotBlank(message = "title is required")
        @Size(max = 200, message = "title must be 200 characters or fewer")
        String title,
        @NotNull(message = "value is required")
        @DecimalMin(value = "0.01", message = "value must be greater than zero")
        @DecimalMax(value = "1000000000", message = "value must be 1,000,000,000 or less")
        BigDecimal value,
        @NotNull(message = "expectedCloseDate is required")
        LocalDate expectedCloseDate,
        String ownerRef) {
}
