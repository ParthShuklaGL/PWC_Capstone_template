package com.nimbussales.crm.web.dto;

import com.nimbussales.crm.domain.Contact;

/** What the contact list shows for each row. */
public record ContactSummaryResponse(String contactRef, String firstName, String lastName, String email,
                                     String phone, String jobTitle, String status, String accountRef,
                                     String accountName) {

    public static ContactSummaryResponse from(Contact contact) {
        return new ContactSummaryResponse(contact.getContactRef(), contact.getFirstName(), contact.getLastName(),
                contact.getEmail(), contact.getPhone(), contact.getJobTitle(), contact.getStatus().name(),
                contact.getAccount() == null ? null : contact.getAccount().getAccountRef(),
                contact.getAccount() == null ? null : contact.getAccount().getName());
    }
}
