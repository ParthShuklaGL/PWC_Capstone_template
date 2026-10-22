package com.nimbussales.crm.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * {@code value} is GBP. {@code expectedCloseDate} is yyyy-MM-dd and not in the past.
 * {@code ownerRef} (a userRef such as U-0002) defaults to the caller.
 */
public record DealCreateRequest(
        @NotBlank(message = "title is required")
        @Size(max = 200, message = "title must be 200 characters or fewer")
        String title,
        @NotBlank(message = "accountRef is required")
        String accountRef,
        @NotBlank(message = "contactRef is required")
        String contactRef,
        @NotNull(message = "value is required")
        @DecimalMin(value = "0.01", message = "value must be greater than zero")
        @DecimalMax(value = "1000000000", message = "value must be 1,000,000,000 or less")
        BigDecimal value,
        @NotNull(message = "expectedCloseDate is required")
        LocalDate expectedCloseDate,
        String ownerRef) {
}
