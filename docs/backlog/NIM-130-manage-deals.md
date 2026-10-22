# NIM-130 · Create, edit and delete deals

| | |
|---|---|
| **Type** | Story |
| **Epic** | Data management (admin) |
| **Sprint** | Sprint 3 |
| **Priority** | Highest |
| **Story points** | 5 |
| **Depends on** | [NIM-121](NIM-121-deal-details.md) |

## User story

> As Priya, I want to add deals, correct them and remove ones created by mistake, so that the CRM stays the single source of truth.

## Context

Priya: "Every deal has a value and a date we think it will close. Both of those change constantly, which is fine, I just need them to be editable."

## Acceptance criteria

```gherkin
Scenario: Create
  When I create a deal
  Then I choose the company first, and then only people who work there
  And I give a title, a value in pounds and an expected close date
  And the new deal starts in Prospecting

Scenario: Validation
  When I give a zero value, a date in the past or no title
  Then each problem is shown next to the field it concerns, and nothing is saved

Scenario: Edit
  When I change a deal's title, value or expected close date
  Then the change is saved
  And a Won or Lost deal cannot be edited

Scenario: Delete
  When I delete a deal that is still in Prospecting, after confirming
  Then it and its history are gone
  And deals past Prospecting cannot be deleted

Scenario: No double submissions
  When I submit twice quickly
  Then only one deal is created
```

## Design

Design intent (not a pixel spec; states not shown are yours to design):

![Create, edit and delete deals](../designs/07-deal-form.png)

## Backend notes

`POST /api/deals`, `PUT /api/deals/{ref}`, `DELETE /api/deals/{ref}`, `GET /api/accounts/{ref}/contacts`. ADMIN only. 400 with fields, 409 `DEAL_CLOSED` / `DEAL_DELETE_NOT_ALLOWED`.
