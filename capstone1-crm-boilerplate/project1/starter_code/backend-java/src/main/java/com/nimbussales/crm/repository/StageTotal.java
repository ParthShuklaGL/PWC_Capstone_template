package com.nimbussales.crm.repository;

import com.nimbussales.crm.domain.DealStage;
import java.math.BigDecimal;

/** How many deals one stage holds, and what they are worth together (GBP). */
public record StageTotal(DealStage stage, long count, BigDecimal totalValue) {
}
