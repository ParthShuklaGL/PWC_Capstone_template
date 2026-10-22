package com.nimbussales.crm.web.dto;

import com.nimbussales.crm.service.DealSummary;
import java.math.BigDecimal;
import java.util.List;

/** Count and value per stage, in pipeline order, plus the open total (not WON, not LOST). */
public record DealSummaryResponse(List<StageTotalResponse> stages, long openCount, BigDecimal openValue,
                                  String currency) {

    public record StageTotalResponse(String stage, long count, BigDecimal totalValue) {
    }

    public static DealSummaryResponse from(DealSummary summary) {
        return new DealSummaryResponse(
                summary.stages().stream()
                        .map(s -> new StageTotalResponse(s.stage().name(), s.count(), s.totalValue()))
                        .toList(),
                summary.openCount(), summary.openValue(), "GBP");
    }
}
