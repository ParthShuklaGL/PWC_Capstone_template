package com.nimbussales.crm.domain;

/**
 * Where a deal is in the pipeline. The declaration order is the order of the pipeline, and
 * {@link DealStageRules} relies on it. Matches the deal_stages lookup table.
 */
public enum DealStage {
    PROSPECTING,
    QUALIFIED,
    PROPOSAL,
    NEGOTIATION,
    /** Final. The customer signed. */
    WON,
    /** Final. The deal is dead. */
    LOST
}
