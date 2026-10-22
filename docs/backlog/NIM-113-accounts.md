# NIM-113 · Accounts and the people at them

| | |
|---|---|
| **Type** | Story |
| **Epic** | Customers (contacts & accounts) |
| **Sprint** | Sprint 1 |
| **Priority** | Medium |
| **Story points** | 3 |
| **Depends on** | [NIM-112](NIM-112-contact-profile.md) |

## User story

> As a rep, I want to see our accounts and the people at each one, so that I understand who I am dealing with at a company.

## Context

There are 30 accounts. Reps mostly arrive at an account from a contact.

## Acceptance criteria

```gherkin
Scenario: Account directory
  When I open accounts
  Then I see every account with industry, country and website

Scenario: Account page
  When I open account A-0008
  Then I see its details and the people who work there, each leading to their profile
```

## Backend notes

`GET /api/accounts`, `GET /api/accounts/{ref}`, `GET /api/accounts/{ref}/contacts`.

## Out of scope

Creating or editing accounts (NIM-132).
