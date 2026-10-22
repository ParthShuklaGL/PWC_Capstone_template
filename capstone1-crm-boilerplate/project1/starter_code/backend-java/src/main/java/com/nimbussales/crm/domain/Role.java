package com.nimbussales.crm.domain;

/** What a signed-in user may do. Matches the roles lookup table. */
public enum Role {
    /** Manages accounts, contacts and deals, and assigns deal owners. */
    ADMIN,
    /** A sales rep: reads contacts and accounts, works the deals they own. */
    USER
}
