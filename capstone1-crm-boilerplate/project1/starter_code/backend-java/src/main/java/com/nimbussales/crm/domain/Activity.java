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

/** Something that happened with a {@link Contact}: a call, an email, a meeting, a note. */
@Entity
@Table(name = "activities")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contact_id", nullable = false)
    private Long contactId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_code", nullable = false, length = 20)
    private ActivityType type;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(length = 2000)
    private String notes;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Activity() {
    }

    public Activity(Long contactId, ActivityType type, String subject, String notes, Instant occurredAt) {
        this.contactId = contactId;
        this.type = type;
        this.subject = subject;
        this.notes = notes;
        this.occurredAt = occurredAt;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getContactId() { return contactId; }
    public ActivityType getType() { return type; }
    public String getSubject() { return subject; }
    public String getNotes() { return notes; }
    public Instant getOccurredAt() { return occurredAt; }
    public Instant getCreatedAt() { return createdAt; }
}
