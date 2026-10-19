# User stories: Nimbus CRM

Stack: React + .NET 10 + MySQL. The person using it is a **sales rep** or the **Head of Inside Sales** (Priya in the stakeholder brief).

How to read the status columns:
- **Backend** means the API endpoints exist, and 38 backend tests pass.
- **Frontend** means a screen exists for it.
- **Verified** means it was run against the live app. Nothing has been yet, because the MySQL database is not created and the API is not running.

## Contacts (already in the app)

| ID | As a... | I want to... | So that... | Backend | Frontend | Verified |
|---|---|---|---|---|---|---|
| C1 | Rep | see contacts 20 per page, in surname order, and filter by status (Prospect, Customer, Churned) | I can browse people | Yes | Yes | No |
| C2 | Rep | search contacts by name or email | I can find someone fast | Yes | Yes | No |
| C3 | Rep | open a contact and see their details, account and activity history | I know where the relationship stands | Yes | Yes | No |
| C4 | Rep | edit a contact | the record is right | Yes | No | No |
| C5 | Rep | bulk-import leads from the agency's monthly CSV | I don't type them in | Yes | No | No |
| C6 | Rep | log a call, email, meeting or note against a contact | the history is complete | Yes | No | No |
| C7 | Rep | list accounts and the people at an account | I can see a company's contacts | Yes | No (a `fetchAccounts` helper exists) | No |

**What the user does today:** open the contacts list, page, filter or search, click a name to see the detail page.

## Deals (the Head of Inside Sales's request)

The brief is in `docs/stakeholder-brief.md`. The stories follow the review checklist numbering.

| ID | As a... | I want to... | So that... | Backend | Frontend | Verified |
|---|---|---|---|---|---|---|
| US-02 | Developer | turn the brief into a spec | ambiguities are settled before building | n/a | n/a | Brief reviewed: 12 ambiguities, 5 contradictions and 4 unsupported requests identified |
| US-03 | Rep | see all deals in a list (20 per page, stage filter) and open one | the spreadsheet is no longer needed | Yes | **No** | No |
| US-04 | Rep | create, edit and delete a deal (account, then a contact at that account, title, value, expected close date) | deals are kept in the CRM | Yes | **No** | No |
| US-05 | Rep | move a deal between stages, giving a close date to win and a reason to lose | the pipeline is accurate and invalid moves are blocked | Yes | **No** | No |
| US-06 | Head of Inside Sales | see a pipeline board with a column per stage, counts, values and one total | I have the Monday-call number without computing it by hand | Yes (`/api/deals/summary`) | **No** | No |
| US-07 | Rep | see a contact's deals on their page and add an activity without leaving it | I see the whole relationship | Yes | **No** | No |

**Rules the backend already enforces:**
- A deal moves forward or back one stage at a time. It can be Lost from any open stage and Won only from Negotiation. Won and Lost are final.
- Winning a deal needs a close date and marks the contact as a customer.
- A deal's stage history is recorded (what it moved from and to, and when).
- Amounts are in GBP.

## Not implemented

**Frontend (all of US-03 to US-07):**
- The `/deals` list, the `/deals/:dealRef` detail page, the create, edit and delete form, the stage-move control, the `/pipeline` board, and the deals section and add-activity form on the contact page.

**Gaps against the brief that the system cannot support today:**
- Reps seeing only their own deals. There is no user, login or owner concept.
- "Who moved it" in the audit trail. The stage history has the time and the from/to stages but not the person.
- Amounts in several currencies. There is no currency field.
- A board that updates in real time. The API is plain request and response.

**Known issues:**
- `GET /api/contacts/{ref}` returns the raw contact entity, including the finance-only `creditRiskNote`. It should return a DTO without it.
- `AGENTS.md` in this repo is out of date (wrong port, database, library and a method that does not exist).
- `appsettings.json` holds a Postmark API key and the database password.

## How to demo (once the database exists)

1. Create the database: `db-setup/01-create-database.mysql.sql`.
2. `dotnet run --project NimbusSales.Crm.Api` in `backend/`, then `npm run dev` in `frontend/`.
3. Browse, filter and search contacts. Open one to see its activities.
4. Use the Scalar API page served by the API (`MapScalarApiReference`, on port 5080) to try the deals endpoints, since the deal screens are not built yet.
