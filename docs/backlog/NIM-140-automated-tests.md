# NIM-140 · Automated tests, then audit them

| | |
|---|---|
| **Type** | Task |
| **Epic** | Quality & release |
| **Sprint** | Sprint 3 |
| **Priority** | High |
| **Story points** | 5 |
| **Depends on** | — |

## Context

Every ticket has acceptance criteria. This ticket makes sure they are proven by tests that would fail if the behaviour broke.

## Acceptance criteria

```gherkin
Scenario: Traceability
  Then every acceptance criterion in this backlog maps to at least one automated test, recorded in the spec's traceability table

Scenario: End to end
  Then at least sign-in, role differences and one deal moving stage are tested end to end against the real API

Scenario: Audit
  Then each test has been checked to fail when the behaviour it covers is broken
  And any test that passes for the wrong reason is fixed and noted
```
