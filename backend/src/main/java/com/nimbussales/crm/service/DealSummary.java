package com.nimbussales.crm.service;

import com.nimbussales.crm.domain.DealStageRules;
import com.nimbussales.crm.repository.StageTotal;
import java.math.BigDecimal;
import java.util.List;

/**
 * What the pipeline is worth. Every stage is present, with zeros where it is empty, so the
 * board always has a column for it. The open figures leave out WON and LOST.
 */
public record DealSummary(List<StageTotal> stages) {

    public long openCount() {
        return stages.stream()
                .filter(s -> DealStageRules.isOpen(s.stage()))
                .mapToLong(StageTotal::count)
                .sum();
    }

    public BigDecimal openValue() {
        return stages.stream()
                .filter(s -> DealStageRules.isOpen(s.stage()))
                .map(StageTotal::totalValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
