package com.nimbussales.crm.domain;

/** Where a contact sits in the relationship. Matches the contact_statuses lookup table. */
public enum ContactStatus {
    /** Not bought anything yet. */
    PROSPECT,
    /** Currently paying us. */
    CUSTOMER,
    /** Was a customer, is not any more. */
    CHURNED
}
