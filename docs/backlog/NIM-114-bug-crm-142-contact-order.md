# NIM-114 · CRM-142: Contacts list is not in the order it claims to be

| | |
|---|---|
| **Type** | Bug |
| **Epic** | Customers (contacts & accounts) |
| **Sprint** | Sprint 1 |
| **Priority** | High |
| **Story points** | 2 |
| **Depends on** | [NIM-110](NIM-110-contact-list.md) |

## Context

Reported three times by Inside Sales, closed twice as "cannot reproduce". The original report is in [`docs/bug-CRM-142.md`](../bug-CRM-142.md).

## Acceptance criteria

```gherkin
Scenario: Reproduced or ruled out
  Given the seeded data
  When the defect is investigated
  Then the report states whether it reproduces, with the exact requests and responses as evidence
  And it states whether the cause is in the UI or the API

Scenario: If the cause is in the API
  Then a bug report is raised to the backend team (see backend/docs/API-TESTING.md)
  And the contacts screen does not make the problem worse or hide it from users
  And the team agrees with Priya what users should be offered meanwhile
```

## Backend notes

Report API defects; do not change the backend.

## Notes

The previous two investigations only looked at the first page.
