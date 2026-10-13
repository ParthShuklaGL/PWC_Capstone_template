package com.example.crm.web.dto;

import com.example.crm.domain.Account;
import com.example.crm.domain.Contact;
import com.example.crm.domain.ContactStatus;
import com.example.crm.domain.Deal;
import com.example.crm.domain.DealStage;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Request and response shapes for accounts, contacts and deals. Field names are the JSON names. */
public final class CrmDtos {
    private CrmDtos() {}

    /** One page of a list, with the total so a screen can draw its pager. */
    public record PageResult<T>(List<T> items, int page, int size, long total) {}

    // ---- accounts ----

    public record AccountInput(String name, String industry, String country, String website) {}

    public record AccountDto(long id, String name, String industry, String country, String website,
                             Instant createdAt, long contactCount) {
        public static AccountDto from(Account a, long contactCount) {
            return new AccountDto(a.getId(), a.getName(), a.getIndustry(), a.getCountry(), a.getWebsite(),
                    a.getCreatedAt(), contactCount);
        }
    }

    // ---- contacts ----

    /** A missing or null status means PROSPECT, as it does in the .NET API (the enum default). */
    public record ContactInput(long accountId, String firstName, String lastName, String email, String phone,
                               String jobTitle, ContactStatus status) {}

    public record ContactDto(long id, long accountId, String accountName, String firstName, String lastName,
                             String email, String phone, String jobTitle, ContactStatus status,
                             Instant lastContactedAt, Instant createdAt) {
        public static ContactDto from(Contact c) {
            return new ContactDto(c.getId(), c.getAccount().getId(), c.getAccount().getName(), c.getFirstName(),
                    c.getLastName(), c.getEmail(), c.getPhone(), c.getJobTitle(), c.getStatus(),
                    c.getLastContactedAt(), c.getCreatedAt());
        }
    }

    // ---- deals ----

    /** closedDate is not an input: the server sets it. A missing stage means PROSPECTING. */
    public record DealInput(long contactId, String title, BigDecimal value, LocalDate expectedCloseDate,
                            DealStage stage, String lostReason) {}

    public record DealDto(long id, long contactId, String contactName, long accountId, String accountName,
                          String title, BigDecimal value, LocalDate expectedCloseDate, DealStage stage,
                          LocalDate closedDate, String lostReason, Instant createdAt, Instant updatedAt) {
        public static DealDto from(Deal d) {
            Contact c = d.getContact();
            return new DealDto(d.getId(), c.getId(), c.getFirstName() + " " + c.getLastName(),
                    c.getAccount().getId(), c.getAccount().getName(), d.getTitle(), d.getValue(),
                    d.getExpectedCloseDate(), d.getStage(), d.getClosedDate(), d.getLostReason(),
                    d.getCreatedAt(), d.getUpdatedAt());
        }
    }
}
