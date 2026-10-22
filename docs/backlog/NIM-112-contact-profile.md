# NIM-112 · Contact profile

| | |
|---|---|
| **Type** | Story |
| **Epic** | Customers (contacts & accounts) |
| **Sprint** | Sprint 1 |
| **Priority** | High |
| **Story points** | 5 |
| **Depends on** | [NIM-110](NIM-110-contact-list.md) |

## User story

> As a rep, I want to open a contact and see their details, their company and everything we have logged with them, so that I know where the relationship stands before I call.

## Context

The contact record is the heart of the CRM. Finance also keep information against contacts that is for their eyes only (see the data model in the KT handover).

## Acceptance criteria

```gherkin
Scenario: Profile
  When I open contact C-00089
  Then I see their name, job title, email, phone, status, when they were last contacted and their company
  And I can go from the contact to their company

Scenario: Activity history
  Then I see every logged activity, newest first, with type, date, subject and notes
  And if nothing has been logged I am told so

Scenario: Unknown contact
  When I open a contact reference that does not exist
  Then I am told it was not found and can get back to the list

Scenario: Restricted information
  Then nothing classified as finance-only is visible to me, in the page or anywhere else the browser keeps it
```

## Design

Design intent (not a pixel spec; states not shown are yours to design):

![Contact profile](../designs/04-contact-profile.png)

## Backend notes

`GET /api/contacts/{ref}`, `GET /api/contacts/{ref}/activities`. Unknown ref → 404 `CONTACT_NOT_FOUND`.

## Out of scope

Editing (NIM-133), deals on this page (NIM-124).
