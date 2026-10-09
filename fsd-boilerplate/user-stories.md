# User stories: FSD boilerplate

Stack: React + Spring Boot + MySQL. Roles: **Visitor** (not signed in), **User** (role USER) and **Admin** (role ADMIN).

How to read the status columns:
- **Built** means the code is written and compiles.
- **Verified** means it was run and the result seen. Today only the JWT token logic is verified, by 5 unit tests. Nothing has run against MySQL yet, because the database has not been created.

## Accounts and sign-in

| ID | As a... | I want to... | So that... | Built | Verified |
|---|---|---|---|---|---|
| F1 | Visitor | create an account with a username, email and password (8+ characters) | I can use the app | Yes | No |
| F2 | User | sign in with a **JWT** (token sent as an Authorization header) | I can use the app from a script or mobile client | Yes | Token logic only |
| F3 | User | sign in with a **cookie** (the token is kept in an HttpOnly cookie) | scripts in the page cannot read my login | Yes | No |
| F4 | User | sign in with a **session** (the server remembers me) | I can compare stateful and stateless login | Yes | No |
| F5 | User | stay signed in after a page reload, and sign out | my login is predictable and ends when I say so | Yes | No |

**What the user does:** open the app, choose "Create an account" or pick a sign-in method (JWT, Cookie or Session), enter the credentials and press Sign in. The top bar then shows the name, the role and the method used. Sign out ends the session and clears the cookie.

**Acceptance:**
- A duplicate username or email shows a clear "already taken" message.
- A wrong password shows "Wrong username or password" and a 401.
- Each of the three methods works alone, and all three work together.

## Data (products)

| ID | As a... | I want to... | So that... | Built | Verified |
|---|---|---|---|---|---|
| F6 | User | see products, 10 per page, and search by name or category | I can find an item quickly | Yes | No |
| F7 | User | add a product (name, category, price, quantity) | stock is recorded | Yes | No |
| F8 | User | edit a product | corrections are possible | Yes | No |
| F9 | Admin | delete a product after confirming | old items are removed | Yes | No |

**Acceptance:**
- A blank name, a negative price or a negative quantity gives a 400, and the message appears beside the field.
- A User who tries to delete gets a 403.
- Each product shows who added it.

## Administration

| ID | As a... | I want to... | So that... | Built | Verified |
|---|---|---|---|---|---|
| F10 | Admin | list, add, edit, disable and delete users, and change roles | I control who can do what | Yes | No |
| F11 | Admin | be prevented from demoting, disabling or deleting my own account | I cannot lock myself out | Yes | No |
| F12 | User | not see the Users screen, and get a 403 if I call it directly | roles mean something | Yes | No |

**Acceptance:** a disabled user cannot sign in, and a deleted user's old token stops working.

## Reporting

| ID | As a... | I want to... | So that... | Built | Verified |
|---|---|---|---|---|---|
| F13 | User | see totals: products, units and stock value, with value by category | I understand what is in stock | Yes | No |
| F14 | User | see which products are low (fewer than 5 left) | I know what to reorder | Yes | No |
| F15 | User | download the products as a CSV | I can use the data elsewhere | Yes | No |
| F16 | Admin | see how many users there are, by role | I can see who has access | Yes | No |

**Acceptance:**
- Totals are computed in the database and match the product list.
- The CSV has a header row (`id,name,category,price,quantity,stock_value,created_by`).
- Cells starting with `= + - @` are escaped so a spreadsheet will not run them as formulas.

## Not implemented

- Login rate limiting or account lockout.
- Revoking a JWT before it expires (60 minutes). Signing out only makes the browser forget it.
- CSRF protection. It is off on purpose because the UI and API share an origin. Turn it on before serving other origins.
- Database migrations. The tables are created by Hibernate on first start.
- Password reset and email verification.
- Automated tests beyond the 5 JWT tests. There are no API or UI tests.

## How to demo

1. Create the database once (`db/01-create-database.sql`, see the README).
2. `mvn spring-boot:run` in `backend/`, then `npm run dev` in `frontend/`.
3. Sign in as `admin` / `Admin#12345` in each of the three modes, then as `demo` / `User#12345`.
4. Add, edit, search and page through products. Try a delete as `demo` and see the 403.
5. Open Reports and download the CSV. Open Users as admin.
