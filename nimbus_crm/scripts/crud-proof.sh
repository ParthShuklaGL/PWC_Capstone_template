#!/bin/bash
# Live proof of the accounts / contacts / deals API: status codes AND bodies, roles, validation, the
# delete refusals, the deal close-date rules, and CSRF on cookie sign-in.
#
# Needs the API running in Development (so the seeder has created admin / demo and the sample data):
#   cd nimbus_crm && dotnet run --project src/Api --launch-profile http
# Start it with Auth__LoginRateLimitPerMinute=1000 if you run this more than a few times a minute.
# BASE_URL overrides the address (default http://localhost:5090), so it can be pointed at any backend with the same contract.
# Cleans up after itself (it deletes what it creates). Run: bash scripts/crud-proof.sh
B="${BASE_URL:-http://localhost:5090}"
J='Content-Type: application/json'

say() { printf '\n### %s\n' "$1"; }
# call METHOD PATH [TOKEN] [BODY]  -> prints status line and body (trimmed)
call() {
  local m=$1 p=$2 t=$3 d=$4
  local args=(-s -o /tmp/crud_body -w '%{http_code}' -X "$m" "$B$p")
  [ -n "$t" ] && args+=(-H "Authorization: Bearer $t")
  [ -n "$d" ] && args+=(-H "$J" -d "$d")
  CODE=$(curl "${args[@]}")
  printf '%s %s -> %s\n' "$m" "$p" "$CODE"
  head -c 600 /tmp/crud_body; echo
}
field() { sed -n "s/.*\"$1\":\([0-9]*\).*/\1/p" /tmp/crud_body | head -1; }
login() { curl -s -X POST "$B/api/auth/login" -H "$J" -d "{\"username\":\"$1\",\"password\":\"$2\",\"mode\":\"Jwt\"}" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'; }

ADMIN=$(login admin 'Admin#Dev-2026!')
USER=$(login demo 'User#Dev-2026!')
echo "tokens: admin=${#ADMIN} chars, demo=${#USER} chars (values not printed)"

say "1. Anonymous is refused"
call GET /api/accounts

say "2. List accounts (signed in, first page of 2) - sample data from the seeder"
call GET '/api/accounts?size=2' "$ADMIN"

say "3. Create an account"
call POST /api/accounts "$ADMIN" '{"name":"  Proof Co  ","industry":"Testing","country":"","website":"https://proof.example"}'
ACC=$(field id)

say "4. Invalid account: blank name and a bad website -> field errors"
call POST /api/accounts "$ADMIN" '{"name":"","website":"proof.example"}'

say "5. Contact for an account that does not exist -> 404"
call POST /api/contacts "$ADMIN" '{"accountId":999999,"firstName":"Ann","lastName":"Lee","email":"ann@example.com","status":"Prospect"}'

say "6. Create a contact, then a deal"
call POST /api/contacts "$ADMIN" "{\"accountId\":$ACC,\"firstName\":\"Mia\",\"lastName\":\"Park\",\"email\":\"mia@example.com\",\"jobTitle\":\"CTO\",\"status\":\"Customer\"}"
CON=$(field id)
call POST /api/deals "$ADMIN" "{\"contactId\":$CON,\"title\":\"Proof renewal\",\"value\":1234.56,\"expectedCloseDate\":\"2026-12-01\",\"stage\":\"Negotiation\"}"
DEAL=$(field id)

say "7. Mark the deal Lost without a reason -> 400; with a reason -> closedDate stamped"
call PUT "/api/deals/$DEAL" "$ADMIN" "{\"contactId\":$CON,\"title\":\"Proof renewal\",\"value\":1234.56,\"expectedCloseDate\":\"2026-12-01\",\"stage\":\"Lost\"}"
call PUT "/api/deals/$DEAL" "$ADMIN" "{\"contactId\":$CON,\"title\":\"Proof renewal\",\"value\":1234.56,\"expectedCloseDate\":\"2026-12-01\",\"stage\":\"Lost\",\"lostReason\":\"Budget cut\"}"

say "8. Reopen it -> closedDate and lostReason cleared"
call PUT "/api/deals/$DEAL" "$ADMIN" "{\"contactId\":$CON,\"title\":\"Proof renewal\",\"value\":1234.56,\"expectedCloseDate\":\"2026-12-01\",\"stage\":\"Negotiation\",\"lostReason\":\"ignored\"}"

say "9. Unknown stage name -> 400"
call POST /api/deals "$ADMIN" "{\"contactId\":$CON,\"title\":\"x\",\"value\":1,\"expectedCloseDate\":\"2026-12-01\",\"stage\":\"Maybe\"}"

call POST /api/deals "$ADMIN" '{not json'
say "9b. Stage as a number is refused; any letter case is accepted; filter is case-insensitive"
call POST /api/deals "$ADMIN" "{\"contactId\":$CON,\"title\":\"x\",\"value\":1,\"expectedCloseDate\":\"2026-12-01\",\"stage\":4}"
call POST /api/deals "$ADMIN" "{\"contactId\":$CON,\"title\":\"lower\",\"value\":1,\"expectedCloseDate\":\"2026-12-01\",\"stage\":\"negotiation\"}"
EXTRA=$(field id)
call GET '/api/deals?stage=won&size=1' "$ADMIN"
call DELETE "/api/deals/$EXTRA" "$ADMIN"

say "10. Filtered list: deals of that account, and Won deals (2 rows)"
call GET "/api/deals?accountId=$ACC" "$ADMIN"
call GET '/api/deals?stage=Won&size=2' "$ADMIN"

say "11. Delete rules: a plain USER may not delete (403); ADMIN is blocked by dependants (409)"
call DELETE "/api/deals/$DEAL" "$USER"
call DELETE "/api/accounts/$ACC" "$ADMIN"
call DELETE "/api/contacts/$CON" "$ADMIN"

say "12. Delete bottom-up as ADMIN (204 each), then it is gone (404)"
call DELETE "/api/deals/$DEAL" "$ADMIN"
call DELETE "/api/contacts/$CON" "$ADMIN"
call DELETE "/api/accounts/$ACC" "$ADMIN"
call GET "/api/accounts/$ACC" "$ADMIN"

say "13. Cookie sign-in needs the CSRF token on a change"
rm -f /tmp/crud_jar
curl -s -c /tmp/crud_jar -X POST "$B/api/auth/login" -H "$J" -d '{"username":"demo","password":"User#Dev-2026!","mode":"Cookie"}' -o /dev/null -w 'cookie login -> %{http_code}\n'
printf 'POST /api/accounts (cookie, no token) -> '
curl -s -b /tmp/crud_jar -o /tmp/crud_body -w '%{http_code}\n' -X POST "$B/api/accounts" -H "$J" -d '{"name":"Cookie Co"}'
head -c 300 /tmp/crud_body; echo
TOKEN=$(curl -s -b /tmp/crud_jar -c /tmp/crud_jar "$B/api/auth/csrf" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
printf 'POST /api/accounts (cookie + X-CSRF-TOKEN) -> '
curl -s -b /tmp/crud_jar -o /tmp/crud_body -w '%{http_code}\n' -X POST "$B/api/accounts" -H "$J" -H "X-CSRF-TOKEN: $TOKEN" -d '{"name":"Cookie Co"}'
head -c 300 /tmp/crud_body; echo
CKID=$(field id)
curl -s -o /dev/null -X DELETE "$B/api/accounts/$CKID" -H "Authorization: Bearer $ADMIN"
echo done
say "14. Filters: WON, lower-case won, and a bad name"
call GET '/api/deals?stage=WON&size=1' "$ADMIN"
call GET '/api/deals?stage=won&size=1' "$ADMIN"
call GET '/api/deals?stage=Maybe' "$ADMIN"
call GET '/api/deals?stage=1' "$ADMIN"
call GET '/api/contacts?status=customer&size=1' "$ADMIN"
