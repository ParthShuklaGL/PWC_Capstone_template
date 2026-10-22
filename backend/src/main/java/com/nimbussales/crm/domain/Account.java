package com.nimbussales.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A company Nimbus sells to. */
@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_ref", nullable = false, unique = true, length = 16)
    private String accountRef;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 80)
    private String industry;

    @Column(length = 80)
    private String country;

    @Column(length = 200)
    private String website;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Account() {
    }

    public Account(String accountRef, String name, String industry, String country, String website) {
        this.accountRef = accountRef;
        this.name = name;
        this.industry = industry;
        this.country = country;
        this.website = website;
        this.createdAt = Instant.now();
    }

    public void update(String name, String industry, String country, String website) {
        this.name = name;
        this.industry = industry;
        this.country = country;
        this.website = website;
    }

    public Long getId() { return id; }
    public String getAccountRef() { return accountRef; }
    public String getName() { return name; }
    public String getIndustry() { return industry; }
    public String getCountry() { return country; }
    public String getWebsite() { return website; }
    public Instant getCreatedAt() { return createdAt; }
}
