# Capstone 1: Pipeline CRM (Frontend + Copilot)

| File | Who gets it | What it is |
|---|---|---|
| `problem-statement.md` | Learners | The capstone: situation, API, ten user stories with Copilot prompt ladders, deliverables, rubric summary |
| `starter_code/` | Learners | The runnable repository: finished backend (accounts, contacts, activities, **deals**) and the React boilerplate |
| `mentor-guide.md` | Mentors only | Backend rules, planted defects, Priya's answers, scoring bands |
| `frontend-prompts.md` | Mentors only | Reference run of the whole frontend build with Copilot in VS Code, with checks after every story |

## Test the starter in VS Code (about 15 minutes)

1. Open `starter_code` in VS Code. Accept the recommended extensions.
2. `docker compose up -d db`, then **F5** and pick **API (.NET) - SQL Server in Docker**.
   If the build fails, see `mentor-guide.md` section 1: the backend was written without a compiler.
3. `node scripts/crosscheck-backend.mjs`. Expected on a fresh database: **98 passed, 0 failed, 0 warnings**.
4. `cd frontend && npm install && npm test && npm run dev`. Expected: 11 tests pass, the contacts
   list loads at `http://localhost:5173`.
5. Follow `frontend-prompts.md` from US-01.

`backend/Crm.http` has a ready-made request for every endpoint (REST Client extension), and
`http://localhost:5080/scalar/v1` is the browsable reference.
