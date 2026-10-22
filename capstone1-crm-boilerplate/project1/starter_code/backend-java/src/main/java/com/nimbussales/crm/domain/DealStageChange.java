package com.nimbussales.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** One move of one deal. There is no "moved by" yet: see docs/DATABASE.md, exercise 3. */
@Entity
@Table(name = "deal_stage_changes")
public class DealStageChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deal_id", nullable = false)
    private Long dealId;

    /** Null for the first row of a deal: it was created, not moved. */
    @Enumerated(EnumType.STRING)
    @Column(name = "from_stage", length = 20)
    private DealStage fromStage;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_stage", nullable = false, length = 20)
    private DealStage toStage;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    protected DealStageChange() {
    }

    public DealStageChange(Long dealId, DealStage fromStage, DealStage toStage, Instant changedAt) {
        this.dealId = dealId;
        this.fromStage = fromStage;
        this.toStage = toStage;
        this.changedAt = changedAt;
    }

    public Long getId() { return id; }
    public Long getDealId() { return dealId; }
    public DealStage getFromStage() { return fromStage; }
    public DealStage getToStage() { return toStage; }
    public Instant getChangedAt() { return changedAt; }
}
