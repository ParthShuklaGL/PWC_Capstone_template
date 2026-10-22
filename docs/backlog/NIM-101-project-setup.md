# NIM-101 · Front-end project setup

| | |
|---|---|
| **Type** | Task |
| **Epic** | Quality & release |
| **Sprint** | Sprint 1 |
| **Priority** | Highest |
| **Story points** | 2 |
| **Depends on** | [NIM-100](NIM-100-spike-api-and-spec.md) |

## Context

Create the front-end repository the team will work in. React or Angular is the team's choice; record the decision and why in the README.

## Acceptance criteria

```gherkin
Scenario: A new developer can run the app
  Given a fresh clone of the front-end repository and the API running on port 5080
  When they follow the README
  Then the app starts locally and /api requests reach the API without CORS errors
  And a unit test command and a lint or type-check command both run and pass

Scenario: Agreed structure
  Then all HTTP calls go through one place in the codebase
  And the shapes of API responses are typed
```

## Backend notes

Proxy `/api` to `http://localhost:5080`. Direct calls are allowed from ports 5173, 5176 and 4200.

## Out of scope

Screens.
