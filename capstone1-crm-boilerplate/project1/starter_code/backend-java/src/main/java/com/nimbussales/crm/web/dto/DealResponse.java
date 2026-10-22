package com.nimbussales.crm.web.dto;

import com.nimbussales.crm.domain.Contact;
import com.nimbussales.crm.domain.Deal;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** {@code contactStatus} is the contact's status as it is right now. */
public record DealResponse(String dealRef, String title, BigDecimal value, String currency,
                           LocalDate expectedCloseDate, String stage, LocalDate closedDate, String lostReason,
                           String accountRef, String accountName, String contactRef, String contactName,
                           String contactStatus, String ownerRef, String ownerName,
                           Instant createdAt, Instant updatedAt) {

    public static DealResponse from(Deal deal) {
        Contact contact = deal.getContact();
        return new DealResponse(deal.getDealRef(), deal.getTitle(), deal.getValue(), "GBP",
                deal.getExpectedCloseDate(), deal.getStage().name(), deal.getClosedDate(), deal.getLostReason(),
                deal.getAccount().getAccountRef(), deal.getAccount().getName(),
                contact.getContactRef(), contact.getFirstName() + " " + contact.getLastName(),
                contact.getStatus().name(), deal.getOwner().getUserRef(), deal.getOwner().getDisplayName(),
                deal.getCreatedAt(), deal.getUpdatedAt());
    }
}
