# Testing the API

You don't change this backend, but you depend on it. Test it the way you would test any API you
are given: first by hand, to learn what it does, then with checks you can re-run, to prove it
still does it. Every bug report you raise should come with a request and the response it got.

There are four tools, from quickest to most thorough:

| Tool | Good for | Where |
|---|---|---|
| Swagger UI | Learning the API by clicking | http://localhost:5080/swagger-ui.html |
| `api-tests.http` | Re-sending a known set of requests, kept in the repo | open it in VS Code with the REST Client extension |
| curl / PowerShell | Scripts, bug reports, CI | below |
| `crosscheck-backend.mjs` and `mvn test` | Proving nothing has broken | `../scripts/` and `src/test/` |

## 1. Swagger UI

1. Open http://localhost:5080/swagger-ui.html.
2. Open **Auth > POST /api/auth/login**, press *Try it out*, and send
   `{"email":"admin@nimbus.test","password":"Admin#2026"}`.
3. Copy the `token` from the response, press **Authorize** (top right), paste it and confirm.
4. Every endpoint can now be tried. Sign in as `aisha@nimbus.test` to see what a rep sees.

## 2. The `.http` file

Install the **REST Client** extension (`humao.rest-client`), open `api-tests.http`, and press *Send
Request* above each block. Send the three sign-in requests first: later requests reuse their
tokens through `{{admin.response.body.token}}`. The file covers every endpoint, along with the
refusals you should expect (401, 403, 404, 409, 400). IntelliJ IDEA runs the same file with its
built-in HTTP client.

Postman works too. Import the OpenAPI document from `http://localhost:5080/v3/api-docs`. Then add a
test script on the login request that stores the token
(`pm.environment.set("token", pm.response.json().token)`), and set *Authorization > Bearer Token*
to `{{token}}` on the collection.

## 3. From the command line

**PowerShell:**

```powershell
$base = "http://localhost:5080/api"
$token = (Invoke-RestMethod -Method Post "$base/auth/login" -ContentType application/json `
          -Body '{"email":"aisha@nimbus.test","password":"Rep#2026"}').token
$h = @{ Authorization = "Bearer $token" }

Invoke-RestMethod "$base/deals/summary" -Headers $h
(Invoke-RestMethod "$base/deals?size=100" -Headers $h).items | Format-Table dealRef, stage, value, ownerName
```

**bash:**

```bash
BASE=http://localhost:5080/api
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
        -d '{"email":"aisha@nimbus.test","password":"Rep#2026"}' | jq -r .token)

curl -s $BASE/deals/summary -H "Authorization: Bearer $TOKEN" | jq
curl -s -i $BASE/deals/D-00016 -H "Authorization: Bearer $TOKEN"   # Ben's deal: 404 for Aisha
```

To see what a token says, paste it into https://jwt.io. The claims are readable by anyone
(`sub`, `role`, `exp`…). Only the signature is secret. That's why the server never trusts a
role that the client sends, only the one inside a token it signed itself.

## 4. Automated checks that are already there

```bash
mvn test                                     # in backend/: 40 tests, no database needed
node ../scripts/crosscheck-backend.mjs       # end-to-end checks against the running API
```

- `DealStageRulesTest`: every allowed and refused stage move, with no Spring or database involved.
- `JwtServiceTest`: a token verifies; a tampered, expired or wrongly signed one does not.
- `DealsSecurityAndErrorsTest`: the real security rules, validation and error shapes, with the
  service mocked out (`@WebMvcTest` + MockMvc).
- `crosscheck-backend.mjs`: the full contract over HTTP. That covers reads, filters, paging order
  across page boundaries, every validation refusal, the whole deal lifecycle and its effect on
  the contact, and roles and ownership.

## What to test: a checklist per endpoint

For every endpoint your screens use, prove each of these at least once and keep the request:

| Case | Example | Expect |
|---|---|---|
| Happy path | `GET /deals/D-00016` as admin | 200 and the documented fields |
| No token | the same, without `Authorization` | 401 `UNAUTHENTICATED` |
| Wrong role | `POST /deals` as Aisha | 403 `FORBIDDEN` |
| Not yours | `GET /deals/D-00016` as Aisha (Ben's deal) | 404 `DEAL_NOT_FOUND` |
| Doesn't exist | `GET /deals/D-99999` | 404 `DEAL_NOT_FOUND` |
| Missing fields | `POST /deals` with `{}` | 400, with `fields` naming every missing field |
| Bad values | `value: 0`, `expectedCloseDate: "2020-01-01"`, `"next tuesday"`, a 201-character title | 400 on that field |
| Business rule | PROSPECTING → NEGOTIATION | 409 with a readable `message` |
| Boundary | `value: 0.01`, a title of exactly 200 characters, `expectedCloseDate` = today | accepted |
| Paging | `page=0` then `page=1`, `size=20` | no row on both pages, none missing, order holds across the boundary |
| Side effect | win a deal | the contact becomes CUSTOMER; history gains a row; the summary moves by exactly that value |

### Role matrix

Run each row as all three users:

| Action | admin | aisha | ben |
|---|---|---|---|
| List deals | all 32 | her 16 | his 16 |
| `GET /deals/summary` | whole pipeline | hers only | his only |
| Open D-00016 (Ben's) | 200 | 404 | 200 |
| Move one of your own deals one stage | 200 | 200 | 200 |
| Create, edit or delete a deal | 2xx | 403 | 403 |
| Add or edit a contact or account | 2xx | 403 | 403 |
| Log an activity | 201 | 201 | 201 |
| `GET /users` | 200 | 403 | 403 |

## Writing a test of your own

### An API check in JavaScript (Node 22, no libraries)

The cross-check script is plain `fetch`. Copy its pattern:

```js
const base = 'http://localhost:5080/api';
const login = await fetch(`${base}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'aisha@nimbus.test', password: 'Rep#2026' }),
});
const { token } = await login.json();

const res = await fetch(`${base}/deals/D-00016`, { headers: { Authorization: `Bearer ${token}` } });
console.assert(res.status === 404, `expected 404, got ${res.status}`);
```

### A web-layer test in Java

`DealsSecurityAndErrorsTest` is the template. It starts only the web layer, signs a real token
with `JwtService`, mocks the service and checks the HTTP answer:

```java
mvc.perform(post("/api/deals").header("Authorization", tokenFor(Role.USER))
        .contentType(MediaType.APPLICATION_JSON).content("{}"))
   .andExpect(status().isForbidden())
   .andExpect(jsonPath("$.error").value("FORBIDDEN"));
```

## Reporting a backend bug

When the API is wrong, write it up instead of working around it in silence. Include:

1. **What you sent:** the full request, including method, URL, the role you signed in as, and the body.
2. **What came back:** the status and body, copied, not paraphrased.
3. **What you expected, and why:** quote the rule from the README, the user story or the brief.
4. **Impact:** what the user would see, and who is affected.
5. **How to reproduce:** ideally one block from `api-tests.http`.

`../docs/bug-CRM-142.md` is a worked example.
