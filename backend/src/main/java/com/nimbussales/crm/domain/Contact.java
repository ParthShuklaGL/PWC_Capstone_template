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
import java.time.Instant;

/** A person at an {@link Account}. */
@Entity
@Table(name = "contacts")
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contact_ref", nullable = false, unique = true, length = 16)
    private String contactRef;

    /** The foreign key, read-only here: it is written through {@link #account}. */
    @Column(name = "account_id", insertable = false, updatable = false)
    private Long accountId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "first_name", nullable = false, length = 80)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 80)
    private String lastName;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(name = "job_title", length = 120)
    private String jobTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_code", nullable = false, length = 20)
    private ContactStatus status;

    /**
     * Internal only. Finance write this during onboarding.
     *
     * <p>It is not for the customer, and it is not for anyone outside Nimbus. It is held here
     * so that it moves with the record, not so that it is read.
     */
    @Column(name = "credit_risk_note", length = 500)
    private String creditRiskNote;

    @Column(name = "last_contacted_at")
    private Instant lastContactedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Contact() {
    }

    public Contact(String contactRef, Account account, String firstName, String lastName, String email) {
        this.contactRef = contactRef;
        this.account = account;
        this.accountId = account.getId();
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.status = ContactStatus.PROSPECT;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getContactRef() { return contactRef; }
    public Long getAccountId() { return accountId; }
    public Account getAccount() { return account; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
    public ContactStatus getStatus() { return status; }
    public void setStatus(ContactStatus status) { this.status = status; }
    public String getCreditRiskNote() { return creditRiskNote; }
    public void setCreditRiskNote(String creditRiskNote) { this.creditRiskNote = creditRiskNote; }
    public Instant getLastContactedAt() { return lastContactedAt; }
    public void setLastContactedAt(Instant lastContactedAt) { this.lastContactedAt = lastContactedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
