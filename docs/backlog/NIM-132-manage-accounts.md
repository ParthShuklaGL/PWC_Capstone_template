# NIM-132 · Add and edit accounts

| | |
|---|---|
| **Type** | Story |
| **Epic** | Data management (admin) |
| **Sprint** | Sprint 3 |
| **Priority** | Medium |
| **Story points** | 3 |
| **Depends on** | [NIM-113](NIM-113-accounts.md) |

## User story

> As Priya, I want to add a new company and keep company details up to date, so that new customers can be set up without asking IT.

## Context

Accounts cannot be deleted.

## Acceptance criteria

```gherkin
Scenario: Add
  When I add an account with a name
  Then it appears in the directory with a new reference

Scenario: Edit
  When I change an account's details
  Then the change is saved

Scenario: Validation
  When the name is missing or a value is too long
  Then I am told which field and why
```

## Backend notes

`POST /api/accounts`, `PUT /api/accounts/{ref}`. ADMIN only.
