package com.nimbussales.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Something Inside Sales is trying to sell to an {@link Account}, driven by one
 * {@link Contact} there. Amounts are GBP.
 */
@Entity
@Table(name = "deals")
public class Deal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deal_ref", nullable = false, unique = true, length = 16)
    private String dealRef;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    /** The rep who owns the deal. A USER sees only deals they own. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private AppUser owner;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal value;

    @Column(name = "expected_close_date", nullable = false)
    private LocalDate expectedCloseDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_code", nullable = false, length = 20)
    private DealStage stage;

    /** The day the deal was closed. Set when it is WON, and when it is LOST. */
    @Column(name = "closed_date")
    private LocalDate closedDate;

    /** Why it was lost. Only set when the deal is LOST. */
    @Column(name = "lost_reason", length = 500)
    private String lostReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Deal() {
    }

    public Deal(String dealRef, Account account, Contact contact, AppUser owner, String title,
                BigDecimal value, LocalDate expectedCloseDate) {
        this.dealRef = dealRef;
        this.account = account;
        this.contact = contact;
        this.owner = owner;
        this.title = title;
        this.value = value;
        this.expectedCloseDate = expectedCloseDate;
        this.stage = DealStage.PROSPECTING;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public Long getId() { return id; }
    public String getDealRef() { return dealRef; }
    public Account getAccount() { return account; }
    public Contact getContact() { return contact; }
    public AppUser getOwner() { return owner; }
    public void setOwner(AppUser owner) { this.owner = owner; }
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
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
