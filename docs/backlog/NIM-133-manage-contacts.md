# NIM-133 · Add and edit contacts

| | |
|---|---|
| **Type** | Story |
| **Epic** | Data management (admin) |
| **Sprint** | Sprint 3 |
| **Priority** | Medium |
| **Story points** | 3 |
| **Depends on** | [NIM-112](NIM-112-contact-profile.md), [NIM-132](NIM-132-manage-accounts.md) |

## User story

> As Priya, I want to add people to a company and correct their details, so that the record is right.

## Context

New contacts start as prospects.

## Acceptance criteria

```gherkin
Scenario: Add
  When I add a contact to an account
  Then they appear on that account and in the contact list as a prospect

Scenario: Edit
  When I correct a contact's details or change their status
  Then the change is saved

Scenario: Validation
  When the email address is not valid or a required field is missing
  Then I am told which field and why
```

## Backend notes

`POST /api/contacts`, `PUT /api/contacts/{ref}`. ADMIN only.
