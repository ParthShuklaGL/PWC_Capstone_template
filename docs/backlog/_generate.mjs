// Generates the backlog tickets (NIM-*.md) and the index (README.md) from the data below.
// Edit the data, then run:  node docs/backlog/_generate.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const EPICS = {
  ACCESS: 'Access & identity',
  CUSTOMERS: 'Customers (contacts & accounts)',
  PIPELINE: 'Deal pipeline',
  ADMIN: 'Data management (admin)',
  QUALITY: 'Quality & release',
};

const SPRINTS = {
  1: 'A signed-in rep can find any customer and see the whole relationship.',
  2: 'Reps run their own pipeline in the CRM, and Priya has her Monday number.',
  3: 'Priya manages the data herself, the app is tested, and we release.',
};

/** @type {Array<{id:string,title:string,type:string,epic:string,sprint:number,priority:string,points:number,depends?:string[],story?:string,context:string,ac:string,design?:string,backend?:string,out?:string,notes?:string,slug:string}>} */
const T = [
  // ------------------------------------------------------------------ Sprint 1
  {
    id: 'NIM-100', slug: 'spike-api-and-spec', title: 'Explore the API and write the specification', type: 'Spike', epic: 'QUALITY', sprint: 1, priority: 'Highest', points: 3,
    context: `Before any screen is built, the team needs a shared understanding of what the client asked for, what the backend supports, and where the two disagree. Priya's brief (\`docs/stakeholder-brief.md\`) is an email, not a specification.`,
    ac: `Scenario: Specification exists before screen work starts
  Given the stakeholder brief, the KT handover and the running API
  When the spike is complete
  Then docs/specs/ contains a specification using docs/specs/_template.md
  And every brief requirement is marked supported, partly supported or not supported, with evidence (a request and its response)
  And every ambiguity or contradiction in the brief is listed with the question to ask Priya
  And the agreed answers are recorded once Priya has replied`,
    backend: 'Swagger UI `/swagger-ui.html`, `backend/api-tests.http`.',
    out: 'Writing UI code.',
    notes: 'Timebox: 1 day. This is the one process rule that is assessed: no screen ticket starts before this is done.',
  },
  {
    id: 'NIM-101', slug: 'project-setup', title: 'Front-end project setup', type: 'Task', epic: 'QUALITY', sprint: 1, priority: 'Highest', points: 2, depends: ['NIM-100'],
    context: `Create the front-end repository the team will work in. React or Angular is the team's choice; record the decision and why in the README.`,
    ac: `Scenario: A new developer can run the app
  Given a fresh clone of the front-end repository and the API running on port 5080
  When they follow the README
  Then the app starts locally and /api requests reach the API without CORS errors
  And a unit test command and a lint or type-check command both run and pass

Scenario: Agreed structure
  Then all HTTP calls go through one place in the codebase
  And the shapes of API responses are typed`,
    backend: 'Proxy `/api` to `http://localhost:5080`. Direct calls are allowed from ports 5173, 5176 and 4200.',
    out: 'Screens.',
  },
  {
    id: 'NIM-102', slug: 'sign-in', title: 'Sign in', type: 'Story', epic: 'ACCESS', sprint: 1, priority: 'Highest', points: 3, depends: ['NIM-101'],
    story: 'As a member of the Inside Sales team, I want to sign in with my work email and password, so that only Nimbus staff can see customer data.',
    context: `Every API call except sign-in now requires a token. Until the user signs in, the app can show nothing else.`,
    ac: `Scenario: Successful sign-in
  Given I am signed out
  When I sign in as aisha@nimbus.test with the correct password
  Then I land on the page I originally asked for, or the home page if I asked for none

Scenario: Wrong credentials
  When I sign in with a wrong password
  Then I am told the email or password is incorrect, without being told which
  And the email I typed is kept and the password is cleared

Scenario: Missing input
  When I submit with the email or password empty
  Then I am told which field is missing, and no request is sent

Scenario: Unsafe return address
  Given I followed a sign-in link whose return address points to another website
  When I sign in
  Then I land on the home page of this app`,
    design: '01-sign-in.png',
    backend: '`POST /api/auth/login` → `{token, expiresAt, user}`. Wrong credentials → 401 `INVALID_CREDENTIALS`. Empty body → 400 with `fields.email` / `fields.password`.',
    out: 'Password reset, "remember me", self sign-up.',
  },
  {
    id: 'NIM-103', slug: 'session-and-sign-out', title: 'Session lifetime and sign-out', type: 'Story', epic: 'ACCESS', sprint: 1, priority: 'High', points: 3, depends: ['NIM-102'],
    story: 'As a signed-in user, I want to stay signed in while I work and to know who I am signed in as, so that I am not interrupted and never act as the wrong person.',
    context: `Tokens last 8 hours and cannot be refreshed. Reps leave the CRM open all day.`,
    ac: `Scenario: Reload keeps me signed in
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
  And pressing Back or opening a bookmarked page does not show customer data`,
    backend: '`GET /api/auth/me`. Any call with a missing or expired token → 401 `UNAUTHENTICATED`.',
    out: 'Single sign-on, multi-tab session sync.',
  },
  {
    id: 'NIM-104', slug: 'role-aware-access', title: 'Only show what my role allows', type: 'Story', epic: 'ACCESS', sprint: 1, priority: 'High', points: 3, depends: ['NIM-103'],
    story: 'As a sales rep, I want to be offered only the actions I am allowed to take, so that I am not confused by buttons that fail.',
    context: `Priya: "Reps should only see their own deals. Right now everyone can see everything and it causes arguments about who owns what." Admins manage data; reps work their own deals. The server enforces this whatever the UI shows.`,
    ac: `Scenario: Rep does not see admin actions
  Given I am signed in as a rep
  Then I am never offered create, edit or delete for deals, contacts or accounts

Scenario: Rep opens an admin page directly
  Given I am signed in as a rep
  When I open the address of an admin-only page
  Then I am told I do not have access, and no admin form is shown

Scenario: Server refuses an action
  When the API answers 403 to anything I do
  Then I see a clear "not allowed" message and stay where I am`,
    backend: 'See the KT handover, section 5 (role matrix). 403 `FORBIDDEN`.',
  },
  {
    id: 'NIM-110', slug: 'contact-list', title: 'Contact list', type: 'Story', epic: 'CUSTOMERS', sprint: 1, priority: 'High', points: 3, depends: ['NIM-104'],
    story: 'As a rep, I want to browse contacts in surname order, a page at a time, and filter them by status, so that I can work through the people we sell to.',
    context: `This screen replaces the contacts tab of the old spreadsheet. Inside Sales expect surname order.`,
    ac: `Scenario: Browse
  Given I am signed in
  When I open the contacts list
  Then I see 20 contacts per page with name, account, job title and status
  And I can move to the next and previous pages and see which page I am on out of how many

Scenario: Filter by status
  When I filter by Customer
  Then only customers are listed, and paging applies to the filtered list

Scenario: Open a contact
  When I choose a contact
  Then I see their profile (NIM-112)

Scenario: Nothing to show
  When a filter matches nobody
  Then I am told so`,
    design: '03-contacts-list.png',
    backend: '`GET /api/contacts?page=&size=&status=` (status: `PROSPECT`, `CUSTOMER`, `CHURNED`).',
    notes: 'See NIM-114 before you sign this off.',
  },
  {
    id: 'NIM-111', slug: 'find-a-contact', title: 'Find a contact', type: 'Story', epic: 'CUSTOMERS', sprint: 1, priority: 'High', points: 2, depends: ['NIM-110'],
    story: 'As a rep, I want to find a contact by name or email, so that I can get to someone quickly while they are on the phone.',
    context: 'Anita: "This morning I went looking for Nadia Fenwick… then gave up and clicked through every page one at a time."',
    ac: `Scenario: Search
  When I search for "fenwick"
  Then every contact whose first name, last name or email contains "fenwick" is listed

Scenario: No match
  When I search for something that matches nobody
  Then I am told so

Scenario: Back to browsing
  When I clear the search
  Then I return to the paged list`,
    backend: '`GET /api/contacts/search?q=` (not paged).',
  },
  {
    id: 'NIM-112', slug: 'contact-profile', title: 'Contact profile', type: 'Story', epic: 'CUSTOMERS', sprint: 1, priority: 'High', points: 5, depends: ['NIM-110'],
    story: 'As a rep, I want to open a contact and see their details, their company and everything we have logged with them, so that I know where the relationship stands before I call.',
    context: 'The contact record is the heart of the CRM. Finance also keep information against contacts that is for their eyes only (see the data model in the KT handover).',
    ac: `Scenario: Profile
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
  Then nothing classified as finance-only is visible to me, in the page or anywhere else the browser keeps it`,
    design: '04-contact-profile.png',
    backend: '`GET /api/contacts/{ref}`, `GET /api/contacts/{ref}/activities`. Unknown ref → 404 `CONTACT_NOT_FOUND`.',
    out: 'Editing (NIM-133), deals on this page (NIM-124).',
  },
  {
    id: 'NIM-113', slug: 'accounts', title: 'Accounts and the people at them', type: 'Story', epic: 'CUSTOMERS', sprint: 1, priority: 'Medium', points: 3, depends: ['NIM-112'],
    story: 'As a rep, I want to see our accounts and the people at each one, so that I understand who I am dealing with at a company.',
    context: 'There are 30 accounts. Reps mostly arrive at an account from a contact.',
    ac: `Scenario: Account directory
  When I open accounts
  Then I see every account with industry, country and website

Scenario: Account page
  When I open account A-0008
  Then I see its details and the people who work there, each leading to their profile`,
    backend: '`GET /api/accounts`, `GET /api/accounts/{ref}`, `GET /api/accounts/{ref}/contacts`.',
    out: 'Creating or editing accounts (NIM-132).',
  },
  {
    id: 'NIM-114', slug: 'bug-crm-142-contact-order', title: 'CRM-142: Contacts list is not in the order it claims to be', type: 'Bug', epic: 'CUSTOMERS', sprint: 1, priority: 'High', points: 2, depends: ['NIM-110'],
    context: 'Reported three times by Inside Sales, closed twice as "cannot reproduce". The original report is in [`docs/bug-CRM-142.md`](../bug-CRM-142.md).',
    ac: `Scenario: Reproduced or ruled out
  Given the seeded data
  When the defect is investigated
  Then the report states whether it reproduces, with the exact requests and responses as evidence
  And it states whether the cause is in the UI or the API

Scenario: If the cause is in the API
  Then a bug report is raised to the backend team (see backend/docs/API-TESTING.md)
  And the contacts screen does not make the problem worse or hide it from users
  And the team agrees with Priya what users should be offered meanwhile`,
    backend: 'Report API defects; do not change the backend.',
    notes: 'The previous two investigations only looked at the first page.',
  },

  // ------------------------------------------------------------------ Sprint 2
  {
    id: 'NIM-120', slug: 'deal-list', title: 'Deal list', type: 'Story', epic: 'PIPELINE', sprint: 2, priority: 'Highest', points: 5, depends: ['NIM-104'],
    story: 'As a rep, I want to see my deals, soonest closing first, and filter them by stage, so that the spreadsheet is no longer needed.',
    context: 'Priya: "I want to open the CRM and see our deals, the same way I can see our contacts." Reps see their own deals; Priya sees everyone\'s.',
    ac: `Scenario: My deals
  Given I am signed in as aisha@nimbus.test
  When I open deals
  Then I see only deals I own: 16 on a freshly seeded database
  And each shows title, account, contact, value in pounds, expected close date, stage and owner

Scenario: Everyone's deals
  Given I am signed in as Priya
  Then I see all 32 deals

Scenario: Filter and page
  When I filter by Negotiation
  Then only deals in Negotiation are listed
  And the filter and page survive a browser reload and can be shared as a link

Scenario: Open a deal
  When I choose a deal
  Then I see its details (NIM-121)`,
    design: '05-deals-list.png',
    backend: '`GET /api/deals?page=&size=&stage=`. An unknown stage → 400 with `fields.stage`.',
  },
  {
    id: 'NIM-121', slug: 'deal-details', title: 'Deal details and history', type: 'Story', epic: 'PIPELINE', sprint: 2, priority: 'High', points: 3, depends: ['NIM-120'],
    story: 'As a rep, I want to see everything about a deal, including how it has moved through the pipeline, so that I can pick up where things stand.',
    context: 'Priya: "I need full audit history of every stage change — who moved it, when, and from what to what. Compliance have asked for this twice."',
    ac: `Scenario: Details
  When I open deal D-00016 as Priya
  Then I see its value, expected close date, stage, account, contact (with their current status) and owner
  And for a closed deal, the close date and, if lost, the reason

Scenario: History
  Then I see every stage change, oldest first, starting from when it was created

Scenario: Not found or not mine
  Given I am signed in as Aisha
  When I open a deal that does not exist, or one that Ben owns
  Then I am told it was not found`,
    design: '06-deal-details.png',
    backend: '`GET /api/deals/{ref}`, `GET /api/deals/{ref}/history`. Not found or not yours → 404 `DEAL_NOT_FOUND`.',
  },
  {
    id: 'NIM-122', slug: 'move-deal-stage', title: 'Move a deal through the pipeline', type: 'Story', epic: 'PIPELINE', sprint: 2, priority: 'Highest', points: 5, depends: ['NIM-121'],
    story: 'As a rep, I want to move my deal to its next stage, or back, or close it, so that the pipeline is accurate.',
    context: 'Priya: "It should not be possible to put a deal in a silly state. Deals do go backwards sometimes… but obviously not just anything to anything. When a deal is won I want that reflected on the customer record."',
    ac: `Scenario: Allowed moves only
  Given a deal in an open stage
  Then I am only offered the moves the business allows

Scenario: Winning and losing
  When I win a deal, I must give the close date
  When I lose a deal, I must give a reason
  And a closed deal (Won or Lost) cannot be moved again

Scenario: Effect on the customer
  When I win a deal for a prospect
  Then that contact is shown as a customer everywhere in the app

Scenario: Refused by the server
  When the server refuses a move
  Then I see its explanation and the deal is unchanged`,
    design: '06-deal-details.png',
    backend: '`POST /api/deals/{ref}/stage` with `{stage, closeDate?, lostReason?}`. Refusals → 409 `DEAL_STAGE_TRANSITION_INVALID` or 400 with fields. Rules: KT handover, section 8.',
    notes: 'The brief does not list the stages or the rules. Confirm them before building (NIM-100).',
  },
  {
    id: 'NIM-123', slug: 'pipeline-board', title: 'Pipeline board and the Monday number', type: 'Story', epic: 'PIPELINE', sprint: 2, priority: 'Highest', points: 5, depends: ['NIM-120'],
    story: 'As the Head of Inside Sales, I want to see what the pipeline is worth, broken down by stage, so that I have my number for the Monday call without working it out by hand.',
    context: 'Priya: "I need to see the total value of the pipeline at any moment, broken down by stage. This is the number I take into the Monday leadership call… If I only get one thing from this project, this is it. Ideally the board updates in real time."',
    ac: `Scenario: The board
  When I open the pipeline
  Then I see every stage in pipeline order with the number of deals and their total value
  And I see the pipeline total Priya asked for

Scenario: Numbers match the system of record
  Then every figure equals what the API reports, to the penny
  And on a freshly seeded database, Priya's figures agree with the KT handover's test data

Scenario: Each person's board
  Given I am signed in as a rep
  Then the board shows my pipeline only`,
    design: '08-pipeline-board.png',
    backend: '`GET /api/deals/summary` (count and value per stage plus open totals, scoped to the caller), `GET /api/deals?stage=`.',
    notes: '"The total value of the pipeline" is not defined precisely in the brief. Agree the definition with Priya and record it in the spec.',
  },
  {
    id: 'NIM-124', slug: 'contact-deals-and-activity', title: 'Deals and activity on the contact page', type: 'Story', epic: 'PIPELINE', sprint: 2, priority: 'High', points: 3, depends: ['NIM-112', 'NIM-120'],
    story: 'As a rep, I want to see a contact\'s deals and log a call or email on their page, so that I see the whole relationship and keep the history complete without leaving it.',
    context: 'Priya: "There is usually one person there who is actually driving it, so I should be able to see the deal from their record too."',
    ac: `Scenario: Deals on the contact
  When I open a contact
  Then I see the deals they are driving that I am allowed to see, with stage and value, each leading to the deal

Scenario: Log an activity
  When I log a call with a subject and notes
  Then it appears at the top of their history straight away
  And the contact's "last contacted" date reflects it

Scenario: Invalid activity
  When I try to log an activity without a subject
  Then I am told what is missing`,
    design: '04-contact-profile.png',
    backend: '`GET /api/contacts/{ref}/deals`, `POST /api/contacts/{ref}/activities` with `{type, subject, notes?, occurredAt?}`.',
  },
  {
    id: 'NIM-125', slug: 'home-dashboard', title: 'Home page', type: 'Story', epic: 'PIPELINE', sprint: 2, priority: 'Medium', points: 3, depends: ['NIM-123'],
    story: 'As anyone in Inside Sales, I want a home page that tells me how we are doing when I sign in, so that I know where to focus today.',
    context: 'Raised by Priya in passing: "Can the first page just tell me how we\'re doing?" No metrics were specified.',
    ac: `Scenario: Agreed content
  Given the team has agreed with Priya which figures and lists the home page shows
  When I sign in
  Then I see those figures, scoped to what my role allows
  And every figure matches the screens it summarises`,
    design: '02-dashboard.png',
    notes: 'The design shows one possibility. Content must be agreed with the product owner before it is built.',
  },

  // ------------------------------------------------------------------ Sprint 3
  {
    id: 'NIM-130', slug: 'manage-deals', title: 'Create, edit and delete deals', type: 'Story', epic: 'ADMIN', sprint: 3, priority: 'Highest', points: 5, depends: ['NIM-121'],
    story: 'As Priya, I want to add deals, correct them and remove ones created by mistake, so that the CRM stays the single source of truth.',
    context: 'Priya: "Every deal has a value and a date we think it will close. Both of those change constantly, which is fine, I just need them to be editable."',
    ac: `Scenario: Create
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
  Then only one deal is created`,
    design: '07-deal-form.png',
    backend: '`POST /api/deals`, `PUT /api/deals/{ref}`, `DELETE /api/deals/{ref}`, `GET /api/accounts/{ref}/contacts`. ADMIN only. 400 with fields, 409 `DEAL_CLOSED` / `DEAL_DELETE_NOT_ALLOWED`.',
  },
  {
    id: 'NIM-131', slug: 'deal-owner', title: 'Assign a deal owner', type: 'Story', epic: 'ADMIN', sprint: 3, priority: 'High', points: 2, depends: ['NIM-130'],
    story: 'As Priya, I want to choose which rep owns a deal and change it later, so that work is shared out and every deal has someone responsible.',
    context: 'Ownership decides who can see and move a deal.',
    ac: `Scenario: Choose owner
  When I create or edit a deal
  Then I can choose its owner from the people who can sign in

Scenario: Effect of ownership
  Given I create a deal owned by Ben
  When Ben signs in
  Then he can see and move it
  And Aisha cannot see it`,
    design: '07-deal-form.png',
    backend: '`GET /api/users` (ADMIN). `ownerRef` on create and update. Unknown owner → 400 `fields.ownerRef`.',
  },
  {
    id: 'NIM-132', slug: 'manage-accounts', title: 'Add and edit accounts', type: 'Story', epic: 'ADMIN', sprint: 3, priority: 'Medium', points: 3, depends: ['NIM-113'],
    story: 'As Priya, I want to add a new company and keep company details up to date, so that new customers can be set up without asking IT.',
    context: 'Accounts cannot be deleted.',
    ac: `Scenario: Add
  When I add an account with a name
  Then it appears in the directory with a new reference

Scenario: Edit
  When I change an account's details
  Then the change is saved

Scenario: Validation
  When the name is missing or a value is too long
  Then I am told which field and why`,
    backend: '`POST /api/accounts`, `PUT /api/accounts/{ref}`. ADMIN only.',
  },
  {
    id: 'NIM-133', slug: 'manage-contacts', title: 'Add and edit contacts', type: 'Story', epic: 'ADMIN', sprint: 3, priority: 'Medium', points: 3, depends: ['NIM-112', 'NIM-132'],
    story: 'As Priya, I want to add people to a company and correct their details, so that the record is right.',
    context: 'New contacts start as prospects.',
    ac: `Scenario: Add
  When I add a contact to an account
  Then they appear on that account and in the contact list as a prospect

Scenario: Edit
  When I correct a contact's details or change their status
  Then the change is saved

Scenario: Validation
  When the email address is not valid or a required field is missing
  Then I am told which field and why`,
    backend: '`POST /api/contacts`, `PUT /api/contacts/{ref}`. ADMIN only.',
  },
  {
    id: 'NIM-134', slug: 'import-leads', title: 'Import leads from the agency', type: 'Story', epic: 'ADMIN', sprint: 3, priority: 'Low', points: 5, depends: ['NIM-133'],
    story: 'As Priya, I want to upload the marketing agency\'s monthly file of leads, so that nobody has to type them in.',
    context: 'The agency sends a CSV every month. An example is in [`docs/sample-leads.csv`](../sample-leads.csv). Stretch goal.',
    ac: `Scenario: Upload
  When I upload the agency's file
  Then I am told how many contacts were created, skipped and rejected, and why each problem row was rejected

Scenario: Unreadable file
  When I upload a file that is not in the expected format
  Then I am told what is wrong with it`,
    backend: '`POST /api/contacts/import` with `Content-Type: text/csv`; returns a plain-text report. 400 `IMPORT_FORMAT_INVALID`.',
    notes: 'How partial failures should be presented is not specified. Ask.',
  },
  {
    id: 'NIM-140', slug: 'automated-tests', title: 'Automated tests, then audit them', type: 'Task', epic: 'QUALITY', sprint: 3, priority: 'High', points: 5,
    context: 'Every ticket has acceptance criteria. This ticket makes sure they are proven by tests that would fail if the behaviour broke.',
    ac: `Scenario: Traceability
  Then every acceptance criterion in this backlog maps to at least one automated test, recorded in the spec's traceability table

Scenario: End to end
  Then at least sign-in, role differences and one deal moving stage are tested end to end against the real API

Scenario: Audit
  Then each test has been checked to fail when the behaviour it covers is broken
  And any test that passes for the wrong reason is fixed and noted`,
  },
  {
    id: 'NIM-141', slug: 'review-and-harden', title: 'Review and harden', type: 'Task', epic: 'QUALITY', sprint: 3, priority: 'High', points: 3, depends: ['NIM-140'],
    context: 'Before release, the code and its use of the API are reviewed the way a security-minded senior developer would.',
    ac: `Scenario: Code review
  Then the code has been reviewed against docs/review-checklist.md and findings are recorded with file, line and fix

Scenario: Data exposure
  Then every API response the app receives has been checked for data the signed-in user should not have
  And any backend issue found has been raised as a bug report with evidence

Scenario: Failure behaviour
  Then the app's behaviour has been checked for expired sessions, 403, 404, 409, 500 and the API being down`,
  },
  {
    id: 'NIM-142', slug: 'release', title: 'Release', type: 'Task', epic: 'QUALITY', sprint: 3, priority: 'High', points: 2, depends: ['NIM-141'],
    context: 'Hand the app to Inside Sales.',
    ac: `Scenario: Ready to hand over
  Then the README explains how to run, test and build the app
  And the spec, prompt journal, bug reports and test evidence are in the repository
  And a five-minute demo shows a rep's day and Priya's Monday number`,
  },
];

const byId = Object.fromEntries(T.map((t) => [t.id, t]));
const file = (t) => `${t.id}-${t.slug}.md`;
const link = (id) => `[${id}](${file(byId[id])})`;

for (const t of T) {
  const rows = [
    ['Type', t.type], ['Epic', EPICS[t.epic]], ['Sprint', `Sprint ${t.sprint}`], ['Priority', t.priority],
    ['Story points', String(t.points)], ['Depends on', t.depends?.length ? t.depends.map(link).join(', ') : '—'],
  ];
  const md = [
    `# ${t.id} · ${t.title}`, '',
    '| | |', '|---|---|', ...rows.map(([k, v]) => `| **${k}** | ${v} |`), '',
    ...(t.story ? ['## User story', '', `> ${t.story}`, ''] : []),
    '## Context', '', t.context, '',
    '## Acceptance criteria', '', '```gherkin', t.ac, '```', '',
    ...(t.design ? ['## Design', '', `Design intent (not a pixel spec; states not shown are yours to design):`, '', `![${t.title}](../designs/${t.design})`, ''] : []),
    ...(t.backend ? ['## Backend notes', '', t.backend, ''] : []),
    ...(t.out ? ['## Out of scope', '', t.out, ''] : []),
    ...(t.notes ? ['## Notes', '', t.notes, ''] : []),
  ].join('\n');
  writeFileSync(join(here, file(t)), md);
}

// Index
const idx = ['# Backlog', '',
  'Every piece of work for the Deals UI project. Pick tickets up in sprint order and respect the dependencies. Each ticket is done when its acceptance criteria are met and the definition of done in the [KT handover](../KT-HANDOVER.md#11-how-we-work-together) is satisfied.', ''];
for (const s of [1, 2, 3]) {
  const ts = T.filter((t) => t.sprint === s);
  idx.push(`## Sprint ${s}: ${SPRINTS[s]}`, '', '| Ticket | Type | Epic | Priority | Points |', '|---|---|---|---|---|');
  for (const t of ts) idx.push(`| [${t.id} · ${t.title}](${file(t)}) | ${t.type} | ${EPICS[t.epic]} | ${t.priority} | ${t.points} |`);
  idx.push('', `**Sprint ${s} total: ${ts.reduce((n, t) => n + t.points, 0)} points**`, '');
}
idx.push('## By epic', '');
for (const [k, name] of Object.entries(EPICS)) {
  idx.push(`- **${name}:** ${T.filter((t) => t.epic === k).map((t) => link(t.id)).join(', ')}`);
}
idx.push('', '*Ticket types: **Story**, user-facing value; **Task**, technical work; **Spike**, timeboxed investigation; **Bug**, a reported defect.*', '');
writeFileSync(join(here, 'README.md'), idx.join('\n'));
console.log(`wrote ${T.length} tickets and README.md`);
