package com.nimbussales.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * {@code stage} is PROSPECTING, QUALIFIED, PROPOSAL, NEGOTIATION, WON or LOST.
 * {@code closeDate} (yyyy-MM-dd) is required to win; {@code lostReason} is required to lose.
 */
public record DealStageRequest(
        @NotBlank(message = "stage is required")
        String stage,
        LocalDate closeDate,
        @Size(max = 500, message = "lostReason must be 500 characters or fewer")
        String lostReason) {
}
