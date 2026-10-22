# NIM-100 · Explore the API and write the specification

| | |
|---|---|
| **Type** | Spike |
| **Epic** | Quality & release |
| **Sprint** | Sprint 1 |
| **Priority** | Highest |
| **Story points** | 3 |
| **Depends on** | — |

## Context

Before any screen is built, the team needs a shared understanding of what the client asked for, what the backend supports, and where the two disagree. Priya's brief (`docs/stakeholder-brief.md`) is an email, not a specification.

## Acceptance criteria

```gherkin
Scenario: Specification exists before screen work starts
  Given the stakeholder brief, the KT handover and the running API
  When the spike is complete
  Then docs/specs/ contains a specification using docs/specs/_template.md
  And every brief requirement is marked supported, partly supported or not supported, with evidence (a request and its response)
  And every ambiguity or contradiction in the brief is listed with the question to ask Priya
  And the agreed answers are recorded once Priya has replied
```

## Backend notes

Swagger UI `/swagger-ui.html`, `backend/api-tests.http`.

## Out of scope

Writing UI code.

## Notes

Timebox: 1 day. This is the one process rule that is assessed: no screen ticket starts before this is done.
