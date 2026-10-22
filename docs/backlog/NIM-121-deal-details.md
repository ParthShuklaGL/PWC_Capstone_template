# NIM-121 · Deal details and history

| | |
|---|---|
| **Type** | Story |
| **Epic** | Deal pipeline |
| **Sprint** | Sprint 2 |
| **Priority** | High |
| **Story points** | 3 |
| **Depends on** | [NIM-120](NIM-120-deal-list.md) |

## User story

> As a rep, I want to see everything about a deal, including how it has moved through the pipeline, so that I can pick up where things stand.

## Context

Priya: "I need full audit history of every stage change — who moved it, when, and from what to what. Compliance have asked for this twice."

## Acceptance criteria

```gherkin
Scenario: Details
  When I open deal D-00016 as Priya
  Then I see its value, expected close date, stage, account, contact (with their current status) and owner
  And for a closed deal, the close date and, if lost, the reason

Scenario: History
  Then I see every stage change, oldest first, starting from when it was created

Scenario: Not found or not mine
  Given I am signed in as Aisha
  When I open a deal that does not exist, or one that Ben owns
  Then I am told it was not found
```

## Design

Design intent (not a pixel spec; states not shown are yours to design):

![Deal details and history](../designs/06-deal-details.png)

## Backend notes

`GET /api/deals/{ref}`, `GET /api/deals/{ref}/history`. Not found or not yours → 404 `DEAL_NOT_FOUND`.
