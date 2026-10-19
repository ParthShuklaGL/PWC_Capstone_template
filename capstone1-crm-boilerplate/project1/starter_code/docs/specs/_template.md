# Specification template

Copy this to `docs/specs/deal-pipeline-ui.md` and fill it in. You are specifying **screens and
behaviour**, not an API: the backend already exists and you do not change it.

Delete the guidance in italics as you go.

---

**Purpose:**

*One paragraph. What this feature is for, who uses it and what they can do afterwards that they
could not do before. Not how it is built.*

---

**Conventions and notes**

*Anything that applies to every screen below: money and date formats, how references are shown and
linked, what a user sees while data loads, and what they see when it fails.*

---

**Contract summary**

*What you verified about the API by reading it (Scalar, `src/api/crm.ts`, the backend code) rather
than assuming. For each thing the brief asks for: does the API support it fully, partly or not at
all? Quote the endpoint or the file. Include the exact error shape and every error code you rely on.*

| Brief asks for | API support | Evidence (endpoint, file, real response) |
|---|---|---|
| | | |

---

**Screens and routes**

| Route | Screen | API calls it makes | States it must handle |
|---|---|---|---|
| | | | loading, empty, error, ... |

---

**Detailed behaviour**

*Per screen, numbered steps: what the user sees, what each control does, what is validated on the
client and what is left to the server, what happens when the server refuses, and what is on screen
afterwards. Enough that another developer could build it without asking you a question.*

---

**Out of scope**

*What you are deliberately not building, and why. This protects you.*

---

**Acceptance Criteria**

*Numbered `AC-01`, `AC-02`… Each one Given / When / Then. Each one independently checkable by a
single test. If you cannot see how to test it, it is not written specifically enough yet.*

- **AC-01** — Given … When … Then …

---

**Assumptions & Open Questions**

*Every place the brief did not tell you enough.*

*For an assumption: what you assumed, and why it is safe to proceed on it.*

*For an open question: what you need to know, who can answer it, and what you have done in the
meantime. Include anything the brief asked for that you have concluded cannot or should not be
built, and say why. Escalate it; do not invent an answer.*

*This section is graded. An empty one means you did not read the brief critically.*

| # | Item from the brief | Assumption / Question | Why, and what I did |
|---|---|---|---|
| | | | |

---

**Traceability**

*Every acceptance criterion, and the test that proves it. Fill the test column in as you write the
tests in US-08.*

| AC | Test |
|---|---|
| AC-01 | |
