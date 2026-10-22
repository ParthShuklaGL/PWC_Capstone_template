# NIM-103 · Session lifetime and sign-out

| | |
|---|---|
| **Type** | Story |
| **Epic** | Access & identity |
| **Sprint** | Sprint 1 |
| **Priority** | High |
| **Story points** | 3 |
| **Depends on** | [NIM-102](NIM-102-sign-in.md) |

## User story

> As a signed-in user, I want to stay signed in while I work and to know who I am signed in as, so that I am not interrupted and never act as the wrong person.

## Context

Tokens last 8 hours and cannot be refreshed. Reps leave the CRM open all day.

## Acceptance criteria

```gherkin
Scenario: Reload keeps me signed in
  Given I am signed in
  When I reload the browser tab
  Then I am still signed in as the same user

Scenario: Expired session
  Given my session has expired
  When the app makes any request
  Then I am taken to sign-in with a message that my session has ended
  And after signing in again I return to the page I was on

Scenario: Who am I
  Then my name and role are visible on every page

Scenario: Sign out
  When I sign out
  Then I am on the sign-in page
  And pressing Back or opening a bookmarked page does not show customer data
```

## Backend notes

`GET /api/auth/me`. Any call with a missing or expired token → 401 `UNAUTHENTICATED`.

## Out of scope

Single sign-on, multi-tab session sync.
