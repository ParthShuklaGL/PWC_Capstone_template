#!/usr/bin/env bash
# Proves the three sign-in modes, CSRF protection and the roles against a RUNNING API.
# Prints every curl command and its response. Needs bash, curl and python.
#
#   dotnet run --project src/Api --launch-profile http     # in another terminal, in Development
#   bash scripts/auth-proof.sh
#
# Settings (environment variables, all optional):
#   BASE_URL        default http://localhost:5090
#   ADMIN_USER / ADMIN_PASSWORD, DEMO_USER / DEMO_PASSWORD
#                   default to the Development seed accounts documented in README.md
#
# The API must allow enough logins per minute (Auth:LoginRateLimitPerMinute, default 10);
# this script makes about 30. Start the API with Auth__LoginRateLimitPerMinute=1000 for it.

set -u
B="${BASE_URL:-http://localhost:5090}"
ADMIN_USER="${ADMIN_USER:-admin}";  ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin#Dev-2026!}"
DEMO_USER="${DEMO_USER:-demo}";     DEMO_PASSWORD="${DEMO_PASSWORD:-User#Dev-2026!}"
D="$(mktemp -d)"; trap 'rm -rf "$D"' EXIT
NEWUSER="proof_$(date +%s)"

trim() { sed -E 's/(eyJ[A-Za-z0-9_-]{12})[A-Za-z0-9._-]+/\1.../g; s/^(Set-Cookie: [^=]+=)([^;]{12})[^;]*/\1\2.../'; }
c() { echo; echo "\$ curl ${*//$D/<tmp>}"; curl -s -i "$@" | tr -d '\r' | grep -v -E '^(Date|Server|Transfer-Encoding|Cache-Control|Expires|Pragma|Content-Length):' | trim; echo; }
cookie_val() { awk -F'\t' -v n="$2" '$6==n{print $7}' "$1"; }
json() { python -c "import sys,json; print(json.load(sys.stdin)$1)" 2>/dev/null || python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }
login() { curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"$2\",\"mode\":\"$3\"}" "${@:4}"; }
h() { echo; echo "=================== $* ==================="; }

h "0. REGISTER, and a response never contains a password hash"
c -X POST "$B/api/auth/register" -H 'Content-Type: application/json' -d "{\"username\":\"$NEWUSER\",\"email\":\"$NEWUSER@example.com\",\"password\":\"Proof#Pass-2026!\"}"
c -X POST "$B/api/auth/register" -H 'Content-Type: application/json' -d "{\"username\":\"$NEWUSER\",\"email\":\"other-$NEWUSER@example.com\",\"password\":\"Proof#Pass-2026!\"}"
c -X POST "$B/api/auth/register" -H 'Content-Type: application/json' -d '{"username":"x","email":"not-an-email","password":"short"}'

h "0b. LOGIN failures give the same answer for a wrong password and an unknown user"
c -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$DEMO_USER\",\"password\":\"wrong-password\"}"
c -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"nobody","password":"wrong-password"}'

h "1A. JWT BEARER ALONE: login, call, logout, call again"
T=$(login "$DEMO_USER" "$DEMO_PASSWORD" Jwt | json "['accessToken']")
c -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$DEMO_USER\",\"password\":\"$DEMO_PASSWORD\",\"mode\":\"Jwt\"}"
c "$B/api/auth/me" -H "Authorization: Bearer $T"
c -X POST "$B/api/auth/logout" -H "Authorization: Bearer $T"
c "$B/api/auth/me" -H "Authorization: Bearer $T"

h "1B. HTTPONLY COOKIE ALONE: login, call, logout needs CSRF, call again, replay the old cookie"
c -c "$D/cookie.jar" -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$DEMO_USER\",\"password\":\"$DEMO_PASSWORD\",\"mode\":\"Cookie\"}"
c -b "$D/cookie.jar" "$B/api/auth/me"
cp "$D/cookie.jar" "$D/cookie.old"
echo "# logout WITHOUT a CSRF token is refused:"
c -b "$D/cookie.jar" -X POST "$B/api/auth/logout"
CT=$(curl -s -b "$D/cookie.jar" -c "$D/cookie.jar" "$B/api/auth/csrf" | json "['token']")
echo "# logout WITH the token:"
c -b "$D/cookie.jar" -X POST "$B/api/auth/logout" -H "X-CSRF-TOKEN: $CT"
c -b "$D/cookie.jar" "$B/api/auth/me"
echo "# replay of the OLD cookie:"
c -b "$D/cookie.old" "$B/api/auth/me"

h "1C. SERVER-SIDE SESSION ALONE: login, call, logout needs CSRF, call again, replay the old cookie"
c -c "$D/session.jar" -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$DEMO_USER\",\"password\":\"$DEMO_PASSWORD\",\"mode\":\"Session\"}"
c -b "$D/session.jar" "$B/api/auth/me"
cp "$D/session.jar" "$D/session.old"
c -b "$D/session.jar" -X POST "$B/api/auth/logout"
ST=$(curl -s -b "$D/session.jar" -c "$D/session.jar" "$B/api/auth/csrf" | json "['token']")
c -b "$D/session.jar" -X POST "$B/api/auth/logout" -H "X-CSRF-TOKEN: $ST"
c -b "$D/session.jar" "$B/api/auth/me"
c -b "$D/session.old" "$B/api/auth/me"

h "2. ALL THREE TOGETHER: none overrides another"
T=$(login "$DEMO_USER" "$DEMO_PASSWORD" Jwt | json "['accessToken']")
login "$DEMO_USER" "$DEMO_PASSWORD" Cookie -o /dev/null -c "$D/c2.jar"
login "$DEMO_USER" "$DEMO_PASSWORD" Session -o /dev/null -c "$D/s2.jar"
AUTHC=$(cookie_val "$D/c2.jar" crm.auth); SESS=$(cookie_val "$D/s2.jar" crm.session)
echo "# each credential on its own:"
c "$B/api/auth/me" -H "Authorization: Bearer $T"
c -b "crm.auth=$AUTHC" "$B/api/auth/me"
c -b "crm.session=$SESS" "$B/api/auth/me"
echo "# all three sent at once (Bearer takes precedence):"
c "$B/api/auth/me" -H "Authorization: Bearer $T" -b "crm.auth=$AUTHC; crm.session=$SESS"
echo "# sign out of the JWT only. The other two must keep working:"
c -X POST "$B/api/auth/logout" -H "Authorization: Bearer $T"
c "$B/api/auth/me" -H "Authorization: Bearer $T"
c -b "crm.auth=$AUTHC" "$B/api/auth/me"
c -b "crm.session=$SESS" "$B/api/auth/me"
echo "# sign out of the cookie only. The session must keep working:"
CT2=$(curl -s -b "crm.auth=$AUTHC" -c "$D/c2.jar" "$B/api/auth/csrf" | json "['token']"); CSRFC=$(cookie_val "$D/c2.jar" crm.csrf)
c -b "crm.auth=$AUTHC; crm.csrf=$CSRFC" -X POST "$B/api/auth/logout" -H "X-CSRF-TOKEN: $CT2"
c -b "crm.auth=$AUTHC" "$B/api/auth/me"
c -b "crm.session=$SESS" "$B/api/auth/me"
echo "# finally sign out of the session:"
ST2=$(curl -s -b "crm.session=$SESS" -c "$D/s2.jar" "$B/api/auth/csrf" | json "['token']"); CSRFS=$(cookie_val "$D/s2.jar" crm.csrf)
c -b "crm.session=$SESS; crm.csrf=$CSRFS" -X POST "$B/api/auth/logout" -H "X-CSRF-TOKEN: $ST2"
c -b "crm.session=$SESS" "$B/api/auth/me"

h "3. ROLES on GET /api/users: anonymous 401, USER 403, ADMIN 200"
c "$B/api/users"
UT=$(login "$DEMO_USER" "$DEMO_PASSWORD" Jwt | json "['accessToken']")
AT=$(login "$ADMIN_USER" "$ADMIN_PASSWORD" Jwt | json "['accessToken']")
echo "# USER:"; c "$B/api/users" -H "Authorization: Bearer $UT"
echo "# ADMIN:"; c "$B/api/users" -H "Authorization: Bearer $AT"
echo "# the same rule through the other two modes (status only):"
for who in "$DEMO_USER:$DEMO_PASSWORD" "$ADMIN_USER:$ADMIN_PASSWORD"; do
  u="${who%%:*}"; p="${who#*:}"
  for m in Cookie Session; do
    login "$u" "$p" "$m" -o /dev/null -c "$D/r.jar"
    echo "$u via $m -> $(curl -s -o /dev/null -w '%{http_code}' -b "$D/r.jar" "$B/api/users")"
  done
done
echo "# invalid and tampered tokens:"
c "$B/api/users" -H "Authorization: Bearer not.a.token"
c "$B/api/users" -H "Authorization: Bearer ${AT%??}xx"
