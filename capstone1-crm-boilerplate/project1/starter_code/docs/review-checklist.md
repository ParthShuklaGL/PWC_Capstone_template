# Code review checklist (frontend)

Use this to steer the review in US-09. It is a checklist, not a script: the point is to get
findings you can act on, not to tick boxes.

Record what comes back in `docs/review-report.md`, including the findings you decide are wrong.

---

## Correctness

- Does every acceptance criterion in `docs/specs/deal-pipeline-ui.md` actually appear in the code?
- Are there rules enforced only in the browser that the server also enforces, and is the server
  still treated as the authority when the two disagree?
- What happens on the boundaries: no deals, one deal, a hundred deals, an empty value, a negative
  value, a close date in the past, a stage move to the stage the deal is already in?
- When a request fails, is the message the user sees specific and actionable, or a status code?
- After a write, is everything on screen up to date: the list, the board, the totals, the contact?
- Can a double click or a slow response submit twice, or show an old response over a new one?

## Fit with this codebase

- Does all HTTP go through `src/api/crm.ts`, or does a component call `fetch` itself?
- Are the response shapes typed in `src/types.ts`? Any `any`, any `as` that hides a mismatch?
- Do new screens follow the existing ones: `LoadStatus`, the `cancelled` flag in effects, the
  shared components, the CSS class conventions?
- Are money and dates formatted with the shared helpers, and never added up as floating point?
- Are dates sent and read as plain calendar dates, so a timezone cannot move them a day?

## States and accessibility

- Does every screen have distinct loading, empty and error states?
- Is every control reachable and usable from the keyboard, with a visible label?
- Are errors announced (`role="alert"`) and tied to the field they are about?
- Is anything communicated by colour alone?

## Security and privacy

- Any credential, token or key committed to the repository, in any folder?
- Does any response carry a field the UI never shows but the browser still receives? Where would
  the fix belong?
- Is any API data written to the console, to browser storage or into a URL?
- Does anything render user-supplied text as HTML (`dangerouslySetInnerHTML`, `innerHTML`)?

## Tests

- Does each test assert something that would actually break if the code were wrong?
- Is there a test that passes for the wrong reason: asserting before the data has arrived,
  mocking away the thing under test, or checking that something exists rather than what it says?
- Are the failure paths tested, or only the happy path?

## Documentation and delivery

- Would the `README` get a new joiner running, on a clean machine?
- Is `AGENTS.md` still true after your changes?
- Does the build in CI fail when the tests fail?
