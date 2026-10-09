# CRM capstone: what we give you, and what you build (simple version)

A longer version with every detail is in
[boilerplate-and-frontend-tasks.detailed.md](boilerplate-and-frontend-tasks.detailed.md).

## The big picture

- **We give you the backend.** It is finished and tested. You do not change it.
- **You build the frontend**: the screens people click on.

## What we give you (the boilerplate)

A server at **http://localhost:5090** that can:

| It can | How you use it |
|---|---|
| Register a new user | `POST /api/auth/register` |
| Sign a user in (3 ways: JWT, Cookie, Session) | `POST /api/auth/login` |
| Say who is signed in | `GET /api/auth/me` |
| Sign a user out | `POST /api/auth/logout` |
| List users (ADMIN only) | `GET /api/users` |
| Show 4 reports, and download each as a CSV file | `GET /api/reports/...` and `.../....csv` |

It also comes with sample data (so the reports are not empty) and two test accounts:

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin#Dev-2026!` | ADMIN (can do everything) |
| `demo` | `User#Dev-2026!` | USER (cannot see the user list or the "users by role" report) |

To start it, follow the README in the `nimbus_crm` folder. When it works, `http://localhost:5090/health` shows `Healthy`.

## What we do not give you

- No frontend at all. That is your job.
- No screens or API for contacts, deals or accounts yet. Do not build those; they are not part of this task.

## What you build

Make a `frontend/` folder (React + TypeScript + Vite). Build these five things:

### 1. Sign in and sign out
- A sign-in form with username, password and a choice of **JWT / Cookie / Session**.
- A register form. If the server says a field is wrong, show its message next to that field.
- After signing in, show the person's name and role at the top, and a **Sign out** button.
- A wrong password just says "Invalid username or password."
- Disable the button while waiting, so it cannot be pressed twice.

### 2. Keep the right people out
- If you are not signed in, you are sent to the sign-in screen.
- Only ADMIN sees the **Users** link.
- If any request comes back `401`, go back to sign-in.

### 3. Users list (ADMIN)
- A table: username, email, role, active or not.
- Next and Previous buttons (20 per page).
- Show something sensible while loading, when there is nothing, and when it fails.

### 4. Reports page
- Four small tables: deals by stage, contacts per account, activities per user, users by role (ADMIN only).
- Each has a **Download CSV** button.
- Money is shown as GBP with two decimals.

### 5. Tests and tidiness
- `npm run typecheck`, `npm test` and `npm run build` all pass.
- Write a few tests (sign-in works, a wrong password shows the message, a signed-out user is sent to sign-in).
- It looks fine on a phone, and you can use it with only the keyboard.

## Five things that trip people up

1. **Call the API with a relative address** like `/api/auth/me`, and set up the Vite proxy to port 5090. Do not type `http://localhost:5090` in your code.
2. **`401` means "not signed in". `403` means "signed in but not allowed".** They are different.
3. **Cookie and Session sign-out need a CSRF token.** First `GET /api/auth/csrf`, then send what you get back in an `X-CSRF-TOKEN` header. JWT does not need this.
4. **Where do you keep the JWT?** Memory is safest but lost on reload. `localStorage` survives reload but any script can read it. Pick one and explain why in your write-up.
5. **The server says the same thing for every failed sign-in.** Do the same; do not write "this user does not exist".

## How to check your own work

- Sign in with each of the three methods. After signing out, the old sign-in must stop working.
- Sign in as `demo`: you must not see the Users link.
- Sign in as `admin`: open the Reports page and download a CSV. It should open as a table with a header row.

## Hand in

- [ ] Your `frontend/` folder
- [ ] A short screen recording of the five things above
- [ ] A half-page note: where you keep the JWT and why
