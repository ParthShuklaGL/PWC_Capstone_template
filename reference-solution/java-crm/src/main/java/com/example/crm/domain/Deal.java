package com.example.crm.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** An opportunity, driven by one contact. Amounts are in GBP. */
@Entity
@Table(name = "deals")
public class Deal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contact_id")
    private Contact contact;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal value = BigDecimal.ZERO;
    @Column(name = "expected_close_date", nullable = false)
    private LocalDate expectedCloseDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DealStage stage = DealStage.PROSPECTING;
    @Column(name = "closed_date")
    private LocalDate closedDate;
    @Column(name = "lost_reason", length = 500)
    private String lostReason;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Times.now();
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Times.now();

    public Long getId() { return id; }
    public Contact getContact() { return contact; }
    public void setContact(Contact contact) { this.contact = contact; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }
    public LocalDate getExpectedCloseDate() { return expectedCloseDate; }
    public void setExpectedCloseDate(LocalDate expectedCloseDate) { this.expectedCloseDate = expectedCloseDate; }
    public DealStage getStage() { return stage; }
    public void setStage(DealStage stage) { this.stage = stage; }
    public LocalDate getClosedDate() { return closedDate; }
    public void setClosedDate(LocalDate closedDate) { this.closedDate = closedDate; }
    public String getLostReason() { return lostReason; }
    public void setLostReason(String lostReason) { this.lostReason = lostReason; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
