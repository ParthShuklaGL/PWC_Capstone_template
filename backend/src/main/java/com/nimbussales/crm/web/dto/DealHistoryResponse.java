package com.nimbussales.crm.web.dto;

import com.nimbussales.crm.domain.DealStageChange;
import java.time.Instant;

/** One move of a deal. {@code fromStage} is null on the first row: the deal was created, not moved. */
public record DealHistoryResponse(String fromStage, String toStage, Instant changedAt) {

    public static DealHistoryResponse from(DealStageChange change) {
        return new DealHistoryResponse(change.getFromStage() == null ? null : change.getFromStage().name(),
                change.getToStage().name(), change.getChangedAt());
    }
}
