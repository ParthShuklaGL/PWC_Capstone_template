# NIM-134 · Import leads from the agency

| | |
|---|---|
| **Type** | Story |
| **Epic** | Data management (admin) |
| **Sprint** | Sprint 3 |
| **Priority** | Low |
| **Story points** | 5 |
| **Depends on** | [NIM-133](NIM-133-manage-contacts.md) |

## User story

> As Priya, I want to upload the marketing agency's monthly file of leads, so that nobody has to type them in.

## Context

The agency sends a CSV every month. An example is in [`docs/sample-leads.csv`](../sample-leads.csv). Stretch goal.

## Acceptance criteria

```gherkin
Scenario: Upload
  When I upload the agency's file
  Then I am told how many contacts were created, skipped and rejected, and why each problem row was rejected

Scenario: Unreadable file
  When I upload a file that is not in the expected format
  Then I am told what is wrong with it
```

## Backend notes

`POST /api/contacts/import` with `Content-Type: text/csv`; returns a plain-text report. 400 `IMPORT_FORMAT_INVALID`.

## Notes

How partial failures should be presented is not specified. Ask.
