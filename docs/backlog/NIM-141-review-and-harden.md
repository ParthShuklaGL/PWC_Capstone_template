# NIM-141 · Review and harden

| | |
|---|---|
| **Type** | Task |
| **Epic** | Quality & release |
| **Sprint** | Sprint 3 |
| **Priority** | High |
| **Story points** | 3 |
| **Depends on** | [NIM-140](NIM-140-automated-tests.md) |

## Context

Before release, the code and its use of the API are reviewed the way a security-minded senior developer would.

## Acceptance criteria

```gherkin
Scenario: Code review
  Then the code has been reviewed against docs/review-checklist.md and findings are recorded with file, line and fix

Scenario: Data exposure
  Then every API response the app receives has been checked for data the signed-in user should not have
  And any backend issue found has been raised as a bug report with evidence

Scenario: Failure behaviour
  Then the app's behaviour has been checked for expired sessions, 403, 404, 409, 500 and the API being down
```
