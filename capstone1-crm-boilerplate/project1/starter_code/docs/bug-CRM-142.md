# CRM-142 — Contacts list is not in the order it claims to be

**Reported by:** Anita Doshi, Inside Sales
**Component:** Contacts
**Priority:** High — reported three times, closed twice as "cannot reproduce"

---

## What was reported

> The contact list is supposed to be in surname order and it says it is, but it isn't. It starts at
> A on the first page, and then it starts at A again on the second page. And again on the third.
> Every single page runs from about A to about W and then starts over.
>
> This morning I went looking for Nadia Fenwick. F is near the front, so I looked on page one and
> page two, then gave up and clicked through every page one at a time. She was on **page five**.
> There are only 150 of us in there. I have no way of knowing where anyone is.
>
> The count at the bottom says 150, which is right, so we are not missing anyone. They are just not
> where they should be.
>
> The first page on its own looks completely fine, which I think is why nobody believes me.

---

## Notes from the previous attempt

The ticket was closed twice as "cannot reproduce". Both times the developer checked the first page,
confirmed it was in alphabetical order, and closed it.

The last engineer to look at it left this comment before rolling off the project:

> Data is fine, count is right, the query returns what it should. I can see the sort happening in
> the service and I have stepped through it — it definitely runs. Possibly a browser caching issue
> on Anita's machine?

No fix was applied.

---

## What we know

- The total count and the number of pages are both correct.
- Every contact does exist, and search finds all of them.
- It reproduces on a clean database with the seeded data. This is not a data problem.
- The sort is applied. The existing unit test for it passes.
