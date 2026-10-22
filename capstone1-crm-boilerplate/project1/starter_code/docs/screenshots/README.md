# Reference screenshots

One way to meet each user story, captured from a reference React front end running against
this backend with the seeded data. Use them to understand **what** each screen needs to show
and how it changes by role. Don't treat them as a pixel-perfect design to copy. Your Angular or
React app can look different and still meet the story.

Every screen was captured at 1440 × 900, signed in as the user shown in the top-right corner.

## Sign-in (AUTH-01, AUTH-02)

| Screenshot | What it shows |
|---|---|
| [01-login](01-login.png) | The sign-in form. Demo accounts can be filled in with one click (local only) |
| [02-login-wrong-password](02-login-wrong-password.png) | 401 `INVALID_CREDENTIALS` shown as one message. The email is kept and the password cleared |
| [03-login-session-expired](03-login-session-expired.png) | Where any 401 sends you: the session has ended, and after signing in you return to the page you were on |

## As an admin: Priya, Head of Inside Sales

| Screenshot | Story | What it shows |
|---|---|---|
| [10-admin-dashboard](10-admin-dashboard.png) | US-06 | The whole team's pipeline, with a New deal action |
| [11-admin-contacts](11-admin-contacts.png) | C1, C2 | Contacts with search and status filter, and New contact. **Look at the order across pages: PD-1** |
| [12-admin-contact-detail](12-admin-contact-detail.png) | C3, US-07, C6 | Details, the contact's deals with owners, and the activity log and form. `creditRiskNote` is **not** shown (PD-2) |
| [13-admin-contact-edit](13-admin-contact-edit.png) | C4 | Editing a contact, including status |
| [14-admin-contact-new](14-admin-contact-new.png) | C4 | Adding a contact, with the account chosen first |
| [15-admin-accounts](15-admin-accounts.png) | C7 | All 30 accounts, filterable, with New account |
| [16-admin-account-detail](16-admin-account-detail.png) | C7, ADM-01 | An account and the people at it, with Edit account and Add contact |
| [17-admin-account-new](17-admin-account-new.png) | ADM-01 | Adding an account |
| [18-admin-deals](18-admin-deals.png) | US-03 | Every deal, with stage filter, paging and the Owner column |
| [19-admin-deal-detail](19-admin-deal-detail.png) | US-03, US-05 | A deal with owner, history, Edit, and the stage control (Delete appears only for a Prospecting deal) |
| [20-admin-deal-new](20-admin-deal-new.png) | US-04, ADM-03 | Account, then a contact **at that account**, then title, value, close date and owner |
| [21-admin-deal-new-validation](21-admin-deal-new-validation.png) | US-04 | The server's 400 messages, each beside its field |
| [22-admin-deal-edit](22-admin-deal-edit.png) | US-04, ADM-03 | Editing a deal and reassigning its owner |
| [23-admin-pipeline](23-admin-pipeline.png) | US-06 | The board: a column per stage, counts and values from `/deals/summary`, and one open total |

## As a sales rep: Aisha

| Screenshot | Story | What it shows |
|---|---|---|
| [30-rep-dashboard](30-rep-dashboard.png) | US-06, AUTH-03 | Her own numbers only, and no New deal action |
| [31-rep-my-deals](31-rep-my-deals.png) | US-03, AUTH-03 | "My deals": only deals she owns, and no New deal button |
| [32-rep-deal-detail](32-rep-deal-detail.png) | US-05, AUTH-03 | She can move her deal, but there is no Edit or Delete |
| [33-rep-stage-move-win](33-rep-stage-move-win.png) | US-05 | Choosing Won asks for a close date before the move is sent |
| [34-rep-pipeline](34-rep-pipeline.png) | US-06 | "My pipeline": the board scoped to her deals |
| [35-rep-contact-detail](35-rep-contact-detail.png) | US-07, C6 | No Edit contact. She can still log activity |
| [36-rep-accounts](36-rep-accounts.png) | C7 | Read-only accounts: no New account |
| [37-rep-forbidden](37-rep-forbidden.png) | AUTH-03 | Typing `/deals/new` lands here. The API would refuse with 403 anyway |
| [38-rep-other-reps-deal](38-rep-other-reps-deal.png) | AUTH-03 | Ben's deal D-00016: the API answers 404, so the UI says "not found", not "forbidden" |
