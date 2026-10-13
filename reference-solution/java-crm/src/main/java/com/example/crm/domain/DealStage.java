package com.example.crm.domain;

/** Where a deal is in the pipeline, in pipeline order. WON and LOST are the two closed stages. */
public enum DealStage {
    PROSPECTING, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST;

    public boolean isClosed() {
        return this == WON || this == LOST;
    }
}
