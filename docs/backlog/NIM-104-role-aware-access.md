# NIM-104 · Only show what my role allows

| | |
|---|---|
| **Type** | Story |
| **Epic** | Access & identity |
| **Sprint** | Sprint 1 |
| **Priority** | High |
| **Story points** | 3 |
| **Depends on** | [NIM-103](NIM-103-session-and-sign-out.md) |

## User story

> As a sales rep, I want to be offered only the actions I am allowed to take, so that I am not confused by buttons that fail.

## Context

Priya: "Reps should only see their own deals. Right now everyone can see everything and it causes arguments about who owns what." Admins manage data; reps work their own deals. The server enforces this whatever the UI shows.

## Acceptance criteria

```gherkin
Scenario: Rep does not see admin actions
  Given I am signed in as a rep
  Then I am never offered create, edit or delete for deals, contacts or accounts

Scenario: Rep opens an admin page directly
  Given I am signed in as a rep
  When I open the address of an admin-only page
  Then I am told I do not have access, and no admin form is shown

Scenario: Server refuses an action
  When the API answers 403 to anything I do
  Then I see a clear "not allowed" message and stay where I am
```

## Backend notes

See the KT handover, section 5 (role matrix). 403 `FORBIDDEN`.
