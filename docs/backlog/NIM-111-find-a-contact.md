# NIM-111 · Find a contact

| | |
|---|---|
| **Type** | Story |
| **Epic** | Customers (contacts & accounts) |
| **Sprint** | Sprint 1 |
| **Priority** | High |
| **Story points** | 2 |
| **Depends on** | [NIM-110](NIM-110-contact-list.md) |

## User story

> As a rep, I want to find a contact by name or email, so that I can get to someone quickly while they are on the phone.

## Context

Anita: "This morning I went looking for Nadia Fenwick… then gave up and clicked through every page one at a time."

## Acceptance criteria

```gherkin
Scenario: Search
  When I search for "fenwick"
  Then every contact whose first name, last name or email contains "fenwick" is listed

Scenario: No match
  When I search for something that matches nobody
  Then I am told so

Scenario: Back to browsing
  When I clear the search
  Then I return to the paged list
```

## Backend notes

`GET /api/contacts/search?q=` (not paged).
