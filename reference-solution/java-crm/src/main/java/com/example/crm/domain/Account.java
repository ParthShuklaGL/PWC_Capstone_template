package com.example.crm.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** A company we sell to. */
@Entity
@Table(name = "accounts")
public class Account {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 200)
    private String name;
    @Column(length = 80)
    private String industry;
    @Column(length = 80)
    private String country;
    @Column(length = 200)
    private String website;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Times.now();

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
