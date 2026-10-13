package com.example.crm;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.crm.support.Api.Auth;
import com.example.crm.support.Api.Res;
import com.example.crm.support.ApiTestBase;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Accounts, contacts and deals over real HTTP: happy paths, validation keys, rules and refusals. */
class CrmCrudTests extends ApiTestBase {

    private static String unique(String prefix) {
        return prefix + UUID.randomUUID().toString().substring(0, 8);
    }

    private JsonNode errors(Res r) {
        assertThat(r.status()).isEqualTo(400);
        assertThat(r.header("content-type")).startsWith("application/problem+json");
        assertThat(r.json().get("title").asText()).isEqualTo("One or more validation errors occurred.");
        return r.json().get("errors");
    }

    // ---------------- accounts ----------------

    @Test
    void anAccountCanBeCreatedReadUpdatedListedAndDeleted() {
        String name = unique("Acme ");
        Res created = api.post("/api/accounts",
                "{\"name\":\"  " + name + "  \",\"industry\":\"Testing\",\"country\":\"\",\"website\":\"https://acme.example\"}",
                memberAuth);
        assertThat(created.status()).isEqualTo(201);
        JsonNode account = created.json();
        long id = account.get("id").asLong();
        assertThat(created.header("location")).isEqualTo("/api/accounts/" + id);
        assertThat(account.get("name").asText()).isEqualTo(name);            // trimmed
        assertThat(account.get("country").isNull()).isTrue();                // blank text is stored as null
        assertThat(account.get("contactCount").asInt()).isZero();
        assertThat(account.get("createdAt").asText()).endsWith("Z");
        assertThat(account.fieldNames()).toIterable()
                .containsExactly("id", "name", "industry", "country", "website", "createdAt", "contactCount");

        assertThat(api.get("/api/accounts/" + id, memberAuth).json().get("name").asText()).isEqualTo(name);

        Res updated = api.put("/api/accounts/" + id,
                "{\"name\":\"" + name + " Ltd\",\"industry\":null,\"country\":\"UK\",\"website\":null}", memberAuth);
        assertThat(updated.status()).isEqualTo(200);
        assertThat(updated.json().get("name").asText()).isEqualTo(name + " Ltd");
        assertThat(updated.json().get("industry").isNull()).isTrue();

        JsonNode list = api.get("/api/accounts?search=" + name.replace(" ", "%20").toLowerCase(), memberAuth).json();
        assertThat(list.get("total").asInt()).isEqualTo(1);
        assertThat(list.get("items").get(0).get("id").asLong()).isEqualTo(id);
        assertThat(list.fieldNames()).toIterable().containsExactly("items", "page", "size", "total");

        assertThat(api.delete("/api/accounts/" + id, adminAuth).status()).isEqualTo(204);
        Res gone = api.get("/api/accounts/" + id, adminAuth);
        assertThat(gone.status()).isEqualTo(404);
        assertThat(gone.json().get("code").asText()).isEqualTo("ACCOUNT_NOT_FOUND");
        assertThat(gone.json().get("detail").asText()).isNotBlank();
    }

    @Test
    void accountValidationReportsPascalCaseKeys() {
        JsonNode e = errors(api.post("/api/accounts", "{\"name\":\"\",\"website\":\"proof.example\"}", adminAuth));
        assertThat(e.get("Name")).isNotNull();
        assertThat(e.get("Website").get(0).asText()).contains("http");
        assertThat(e.get("name")).isNull();
    }

    @Test
    void accountMaximumLengthsAreEnforced() {
        JsonNode e = errors(api.post("/api/accounts", "{\"name\":\"" + "x".repeat(201) + "\",\"industry\":\""
                + "x".repeat(81) + "\",\"country\":\"" + "x".repeat(81) + "\",\"website\":\"https://" + "x".repeat(200) + ".example\"}",
                adminAuth));
        assertThat(e.fieldNames()).toIterable().containsExactlyInAnyOrder("Name", "Industry", "Country", "Website");
        assertThat(api.post("/api/accounts", "{\"name\":\"" + "x".repeat(200) + "\"}", adminAuth).status()).isEqualTo(201);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ftp://files.example", "javascript:alert(1)", "example.com", "", "http://", "not a url"})
    void aWebsiteMustBeAFullHttpOrHttpsAddress(String website) {
        JsonNode e = errors(api.post("/api/accounts", "{\"name\":\"Site\",\"website\":\"" + website + "\"}", adminAuth));
        assertThat(e.get("Website")).isNotNull();
    }

    @Test
    void anAccountListShowsContactCountsAndSortsByName() {
        String tag = unique("Zz");
        long b = createAccount(tag + " B");
        long a = createAccount(tag + " A");
        createContact(b, "Ann", "Lee");
        createContact(b, "Bob", "Lee");
        JsonNode items = api.get("/api/accounts?search=" + tag, memberAuth).json().get("items");
        assertThat(items).hasSize(2);
        assertThat(items.get(0).get("id").asLong()).isEqualTo(a);
        assertThat(items.get(0).get("contactCount").asInt()).isZero();
        assertThat(items.get(1).get("id").asLong()).isEqualTo(b);
        assertThat(items.get(1).get("contactCount").asInt()).isEqualTo(2);
    }

    @Test
    void searchTreatsPercentAndUnderscoreAsPlainText() {
        String tag = unique("Pct");
        createAccount(tag + " 100%");
        createAccount(tag + " 1000");
        JsonNode r = api.get("/api/accounts?search=" + tag + "%20100%25", memberAuth).json();
        assertThat(r.get("total").asInt()).isEqualTo(1);
    }

    @Test
    void anUnknownOrNonNumericIdIsNotFound() {
        assertThat(api.get("/api/accounts/999999999", memberAuth).status()).isEqualTo(404);
        assertThat(api.get("/api/accounts/abc", memberAuth).status()).isEqualTo(404);
        assertThat(api.put("/api/accounts/999999999", "{\"name\":\"x\"}", memberAuth).json().get("code").asText())
                .isEqualTo("ACCOUNT_NOT_FOUND");
    }

    // ---------------- paging ----------------

    @ParameterizedTest
    @CsvSource({"-1,20,Page", "10001,20,Page", "0,0,Size", "0,101,Size", "0,-5,Size"})
    void pagingOutsideTheLimitsIsRefusedOnEveryList(int page, int size, String field) {
        for (String resource : List.of("accounts", "contacts", "deals")) {
            JsonNode e = errors(api.get("/api/" + resource + "?page=" + page + "&size=" + size, memberAuth));
            assertThat(e.get(field)).as(resource).isNotNull();
        }
    }

    @Test
    void pagingEdgesAreAccepted() {
        assertThat(api.get("/api/accounts?page=10000&size=100", memberAuth).status()).isEqualTo(200);
        assertThat(api.get("/api/accounts?page=0&size=1", memberAuth).json().get("items")).hasSizeLessThanOrEqualTo(1);
        assertThat(api.get("/api/accounts?page=abc", memberAuth).json().get("code").asText()).isEqualTo("BAD_REQUEST");
        assertThat(api.get("/api/accounts?search=" + "x".repeat(101), memberAuth).json().get("errors").get("Search"))
                .isNotNull();
    }

    // ---------------- contacts ----------------

    @Test
    void aContactCanBeCreatedWithItsAccountNameAndUpdated() {
        long account = createAccount(unique("Ctx "));
        Res created = api.post("/api/contacts", ("{\"accountId\":%d,\"firstName\":\" Mia \",\"lastName\":\"Park\","
                + "\"email\":\"mia@example.com\",\"phone\":\" \",\"jobTitle\":\"CTO\",\"status\":\"customer\"}").formatted(account),
                memberAuth);
        assertThat(created.status()).isEqualTo(201);
        JsonNode c = created.json();
        assertThat(created.header("location")).isEqualTo("/api/contacts/" + c.get("id").asLong());
        assertThat(c.get("firstName").asText()).isEqualTo("Mia");
        assertThat(c.get("phone").isNull()).isTrue();
        assertThat(c.get("status").asText()).isEqualTo("CUSTOMER");   // any letter case in, upper case out
        assertThat(c.get("accountName").asText()).startsWith("Ctx ");
        assertThat(c.get("lastContactedAt").isNull()).isTrue();
        assertThat(c.fieldNames()).toIterable().containsExactly("id", "accountId", "accountName", "firstName",
                "lastName", "email", "phone", "jobTitle", "status", "lastContactedAt", "createdAt");

        long other = createAccount(unique("Ctx2 "));
        Res updated = api.put("/api/contacts/" + c.get("id").asLong(), ("{\"accountId\":%d,\"firstName\":\"Mia\","
                + "\"lastName\":\"Parker\",\"email\":\"mia@example.com\",\"status\":\"CHURNED\"}").formatted(other), memberAuth);
        assertThat(updated.status()).isEqualTo(200);
        assertThat(updated.json().get("accountId").asLong()).isEqualTo(other);
        assertThat(updated.json().get("status").asText()).isEqualTo("CHURNED");
    }

    @Test
    void contactValidationAndMissingParents() {
        JsonNode e = errors(api.post("/api/contacts",
                "{\"accountId\":0,\"firstName\":\"\",\"lastName\":\"" + "x".repeat(81) + "\",\"email\":\"nope\"}", adminAuth));
        assertThat(e.fieldNames()).toIterable().containsExactlyInAnyOrder("AccountId", "FirstName", "LastName", "Email");

        Res missing = api.post("/api/contacts",
                "{\"accountId\":999999999,\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@b.c\",\"status\":\"Prospect\"}", adminAuth);
        assertThat(missing.status()).isEqualTo(404);
        assertThat(missing.json().get("code").asText()).isEqualTo("ACCOUNT_NOT_FOUND");

        long account = createAccount(unique("Ctx "));
        long contact = createContact(account, "Ann", "Lee");
        Res badUpdate = api.put("/api/contacts/" + contact, ("{\"accountId\":999999999,\"firstName\":\"A\",\"lastName\":\"B\","
                + "\"email\":\"a@b.c\",\"status\":\"Prospect\"}"), adminAuth);
        assertThat(badUpdate.json().get("code").asText()).isEqualTo("ACCOUNT_NOT_FOUND");
        assertThat(api.get("/api/contacts/999999999", adminAuth).json().get("code").asText()).isEqualTo("CONTACT_NOT_FOUND");
    }

    @Test
    void contactListFiltersByStatusInAnyCaseAndByAccount() {
        long account = createAccount(unique("Flt "));
        createContact(account, "Zed", "Aaa");
        long second = createContact(account, "Amy", "Bbb");
        api.put("/api/contacts/" + second, ("{\"accountId\":%d,\"firstName\":\"Amy\",\"lastName\":\"Bbb\","
                + "\"email\":\"amy@example.com\",\"status\":\"CUSTOMER\"}").formatted(account), adminAuth);

        JsonNode all = api.get("/api/contacts?accountId=" + account, memberAuth).json();
        assertThat(all.get("total").asInt()).isEqualTo(2);
        assertThat(all.get("items").get(0).get("lastName").asText()).isEqualTo("Aaa");   // last name, then first name

        for (String spelling : List.of("customer", "CUSTOMER", "Customer")) {
            JsonNode r = api.get("/api/contacts?accountId=" + account + "&status=" + spelling, memberAuth).json();
            assertThat(r.get("total").asInt()).as(spelling).isEqualTo(1);
            assertThat(r.get("items").get(0).get("lastName").asText()).isEqualTo("Bbb");
        }
        JsonNode bySearch = api.get("/api/contacts?accountId=" + account + "&search=AMY%40", memberAuth).json();
        assertThat(bySearch.get("total").asInt()).isEqualTo(1);

        Res bad = api.get("/api/contacts?status=Maybe", memberAuth);
        assertThat(bad.status()).isEqualTo(400);
        assertThat(bad.json().get("errors").get("status").get(0).asText()).contains("PROSPECT, CUSTOMER, CHURNED");
        assertThat(api.get("/api/contacts?status=1", memberAuth).status()).isEqualTo(400);
    }

    // ---------------- enums and unreadable bodies ----------------

    @Test
    void unreadableBodiesAndUnknownOrNumericEnumsAreBadRequests() {
        long account = createAccount(unique("Enm "));
        for (String body : List.of(
                "{not json",
                "",
                "{\"accountId\":%d,\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@b.c\",\"status\":\"Maybe\"}".formatted(account),
                "{\"accountId\":%d,\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@b.c\",\"status\":1}".formatted(account),
                "{\"accountId\":\"abc\",\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@b.c\"}")) {
            Res r = api.post("/api/contacts", body, adminAuth);
            assertThat(r.status()).as(body).isEqualTo(400);
            assertThat(r.json().get("code").asText()).as(body).isEqualTo("BAD_REQUEST");
            assertThat(r.json().has("errors")).isFalse();
            assertThat(r.body()).doesNotContain("Exception").doesNotContain("com.example");
        }
    }

    @Test
    void aJsonStringIsNotAcceptedForANumberAndPropertyNamesIgnoreCase() {
        long account = createAccount(unique("Typ "));
        Res r = api.post("/api/contacts", ("{\"accountId\":\"%d\",\"firstName\":\"A\",\"lastName\":\"B\","
                + "\"email\":\"a@b.c\"}").formatted(account), adminAuth);
        assertThat(r.status()).isEqualTo(400);
        assertThat(r.json().get("code").asText()).isEqualTo("BAD_REQUEST");
        // property names are matched without regard to case, as in the .NET API
        assertThat(api.post("/api/accounts", "{\"NAME\":\"Shouty\"}", adminAuth).status()).isEqualTo(201);
    }

    // ---------------- deals ----------------

    private JsonNode dealBody(long contact, String stage, String reason) {
        Res r = createDeal(contact, "Deal " + stage, "1234.56", stage, reason);
        assertThat(r.status()).as(r.body()).isEqualTo(201);
        return r.json();
    }

    private String putDeal(long id, long contact, String stage, String reason) {
        String lost = reason == null ? "" : ",\"lostReason\":\"" + reason + "\"";
        Res r = api.put("/api/deals/" + id, ("{\"contactId\":%d,\"title\":\"Deal\",\"value\":10,\"expectedCloseDate\":\"2030-06-01\","
                + "\"stage\":\"%s\"%s}").formatted(contact, stage, lost), adminAuth);
        assertThat(r.status()).as(r.body()).isEqualTo(200);
        return r.body();
    }

    @Test
    void aDealIsCreatedWithItsContactAndAccountNames() {
        long account = createAccount(unique("Dl "));
        long contact = createContact(account, "Mia", "Park");
        Res r = createDeal(contact, "Renewal", "1234.56", "negotiation", null);
        assertThat(r.status()).isEqualTo(201);
        JsonNode d = r.json();
        assertThat(r.header("location")).isEqualTo("/api/deals/" + d.get("id").asLong());
        assertThat(d.get("contactName").asText()).isEqualTo("Mia Park");
        assertThat(d.get("accountId").asLong()).isEqualTo(account);
        assertThat(d.get("accountName").asText()).startsWith("Dl ");
        assertThat(d.get("stage").asText()).isEqualTo("NEGOTIATION");
        assertThat(d.get("value").decimalValue()).isEqualByComparingTo("1234.56");
        assertThat(r.body()).contains("\"value\":1234.56");
        assertThat(d.get("expectedCloseDate").asText()).isEqualTo("2030-06-01");
        assertThat(d.get("closedDate").isNull()).isTrue();
        assertThat(d.get("lostReason").isNull()).isTrue();
        assertThat(d.get("createdAt").asText()).endsWith("Z");
        assertThat(d.fieldNames()).toIterable().containsExactly("id", "contactId", "contactName", "accountId",
                "accountName", "title", "value", "expectedCloseDate", "stage", "closedDate", "lostReason", "createdAt",
                "updatedAt");
    }

    @Test
    void lostNeedsAReasonAndOtherStagesClearIt() {
        long contact = createContact(createAccount(unique("Lr ")), "Ann", "Lee");
        Res noReason = createDeal(contact, "x", "1", "LOST", null);
        assertThat(errors(noReason).get("LostReason")).isNotNull();
        assertThat(errors(createDeal(contact, "x", "1", "Lost", "   ")).get("LostReason")).isNotNull();

        JsonNode lost = dealBody(contact, "LOST", "Budget cut");
        assertThat(lost.get("lostReason").asText()).isEqualTo("Budget cut");
        assertThat(lost.get("closedDate").asText()).isNotBlank();

        long id = lost.get("id").asLong();
        assertThat(api.get("/api/deals/" + id, adminAuth).json().get("lostReason").asText()).isEqualTo("Budget cut");
        String body = putDeal(id, contact, "NEGOTIATION", "ignored");
        assertThat(body).contains("\"lostReason\":null").contains("\"closedDate\":null");
        assertThat(createDeal(contact, "w", "1", "WON", "not kept").json().get("lostReason").isNull()).isTrue();
    }

    @Test
    void closedDateIsSetByTheServerInUtcKeptOnEditsAndClearedOnReopen() {
        // 23:30 UTC on 15 January: still the 15th in UTC even though it is already the 16th in time zones east of it.
        clock.freezeAt(Instant.parse("2030-01-15T23:30:00Z"));
        adminAuth = Auth.bearer(api.jwt(admin.username(), PASSWORD));
        long contact = createContact(createAccount(unique("Cd ")), "Ann", "Lee");

        JsonNode open = dealBody(contact, "QUALIFIED", null);
        assertThat(open.get("closedDate").isNull()).isTrue();
        long id = open.get("id").asLong();

        JsonNode won = api.put("/api/deals/" + id, ("{\"contactId\":%d,\"title\":\"D\",\"value\":5,"
                + "\"expectedCloseDate\":\"2030-02-01\",\"stage\":\"WON\",\"closedDate\":\"1999-01-01\"}").formatted(contact),
                adminAuth).json();
        assertThat(won.get("closedDate").asText()).isEqualTo("2030-01-15");      // the caller cannot choose it

        clock.advance(Duration.ofHours(30));                                      // now 17 January
        adminAuth = Auth.bearer(api.jwt(admin.username(), PASSWORD));
        JsonNode edited = api.put("/api/deals/" + id, ("{\"contactId\":%d,\"title\":\"Renamed\",\"value\":6,"
                + "\"expectedCloseDate\":\"2030-02-01\",\"stage\":\"WON\"}").formatted(contact), adminAuth).json();
        assertThat(edited.get("closedDate").asText()).isEqualTo("2030-01-15");   // kept on a later edit
        assertThat(edited.get("title").asText()).isEqualTo("Renamed");
        assertThat(edited.get("updatedAt").asText()).startsWith("2030-01-17");

        JsonNode lost = api.put("/api/deals/" + id, ("{\"contactId\":%d,\"title\":\"Renamed\",\"value\":6,"
                + "\"expectedCloseDate\":\"2030-02-01\",\"stage\":\"LOST\",\"lostReason\":\"Moved\"}").formatted(contact), adminAuth).json();
        assertThat(lost.get("closedDate").asText()).isEqualTo("2030-01-15");     // WON -> LOST stays closed

        JsonNode reopened = api.put("/api/deals/" + id, ("{\"contactId\":%d,\"title\":\"Renamed\",\"value\":6,"
                + "\"expectedCloseDate\":\"2030-02-01\",\"stage\":\"PROPOSAL\"}").formatted(contact), adminAuth).json();
        assertThat(reopened.get("closedDate").isNull()).isTrue();

        JsonNode closedAgain = api.put("/api/deals/" + id, ("{\"contactId\":%d,\"title\":\"Renamed\",\"value\":6,"
                + "\"expectedCloseDate\":\"2030-02-01\",\"stage\":\"WON\"}").formatted(contact), adminAuth).json();
        assertThat(closedAgain.get("closedDate").asText()).isEqualTo("2030-01-17");
        assertThat(LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC)).isEqualTo(LocalDate.parse("2030-01-17"));
    }

    @Test
    void dealValidationKeys() {
        long contact = createContact(createAccount(unique("Dv ")), "Ann", "Lee");
        JsonNode e = errors(api.post("/api/deals", ("{\"contactId\":0,\"title\":\"\",\"value\":-1,\"expectedCloseDate\":\"2030-06-01\","
                + "\"stage\":\"WON\",\"lostReason\":\"%s\"}").formatted("x".repeat(501)), adminAuth));
        assertThat(e.fieldNames()).toIterable().containsExactlyInAnyOrder("ContactId", "Title", "Value", "LostReason");

        assertThat(errors(createDeal(contact, "x", "1.234", "WON", null)).get("Value")).isNotNull();       // three decimals
        assertThat(errors(createDeal(contact, "x", "1000000000001", "WON", null)).get("Value")).isNotNull(); // too large
        assertThat(createDeal(contact, "x", "1000000000000", "WON", null).status()).isEqualTo(201);
        assertThat(createDeal(contact, "x", "0", "WON", null).status()).isEqualTo(201);

        Res missingContact = createDeal(999999999L, "x", "1", "WON", null);
        assertThat(missingContact.status()).isEqualTo(404);
        assertThat(missingContact.json().get("code").asText()).isEqualTo("CONTACT_NOT_FOUND");
        assertThat(api.put("/api/deals/999999999", "{\"contactId\":%d,\"title\":\"x\",\"value\":1,\"expectedCloseDate\":\"2030-01-01\",\"stage\":\"WON\"}"
                .formatted(contact), adminAuth).json().get("code").asText()).isEqualTo("DEAL_NOT_FOUND");
    }

    @Test
    void dealListFiltersAndSortOrder() {
        long account = createAccount(unique("Dlf "));
        long contact = createContact(account, "Ann", "Lee");
        long other = createContact(account, "Bob", "Roe");
        createDeal(contact, "Later", "1", "WON", null);
        api.post("/api/deals", ("{\"contactId\":%d,\"title\":\"Earlier\",\"value\":1,\"expectedCloseDate\":\"2029-01-01\","
                + "\"stage\":\"PROSPECTING\"}").formatted(contact), adminAuth);
        createDeal(other, "Other", "1", "PROSPECTING", null);

        JsonNode byAccount = api.get("/api/deals?accountId=" + account, memberAuth).json();
        assertThat(byAccount.get("total").asInt()).isEqualTo(3);
        assertThat(byAccount.get("items").get(0).get("title").asText()).isEqualTo("Earlier");   // by close date, then id
        assertThat(byAccount.get("items").get(1).get("title").asText()).isEqualTo("Later");

        assertThat(api.get("/api/deals?contactId=" + other, memberAuth).json().get("total").asInt()).isEqualTo(1);
        for (String stage : List.of("won", "WON", "Won")) {
            assertThat(api.get("/api/deals?accountId=" + account + "&stage=" + stage, memberAuth).json().get("total").asInt())
                    .as(stage).isEqualTo(1);
        }
        assertThat(api.get("/api/deals?accountId=" + account + "&search=LATER", memberAuth).json().get("total").asInt())
                .isEqualTo(1);

        for (String bad : List.of("Maybe", "1", "W0N")) {
            Res r = api.get("/api/deals?stage=" + bad, memberAuth);
            assertThat(r.status()).as(bad).isEqualTo(400);
            assertThat(r.json().get("errors").get("stage").get(0).asText()).contains("PROSPECTING, QUALIFIED");
        }
    }

    // ---------------- delete rules and roles ----------------

    @Test
    void deleteRefusalsAndAdminOnlyRule() {
        long account = createAccount(unique("Del "));
        long contact = createContact(account, "Ann", "Lee");
        long deal = createDeal(contact, "D", "1", "PROSPECTING", null).json().get("id").asLong();

        for (String path : List.of("/api/accounts/" + account, "/api/contacts/" + contact, "/api/deals/" + deal)) {
            assertThat(api.delete(path, memberAuth).status()).as(path + " as USER").isEqualTo(403);
            assertThat(api.delete(path, memberAuth).body()).isEmpty();
            assertThat(api.delete(path, Auth.none()).status()).as(path + " anonymous").isEqualTo(401);
        }
        // a role refusal comes before "does it exist"
        assertThat(api.delete("/api/deals/999999999", memberAuth).status()).isEqualTo(403);

        Res accountBlocked = api.delete("/api/accounts/" + account, adminAuth);
        assertThat(accountBlocked.status()).isEqualTo(409);
        assertThat(accountBlocked.json().get("code").asText()).isEqualTo("ACCOUNT_HAS_CONTACTS");
        assertThat(accountBlocked.json().get("detail").asText()).isNotBlank();
        Res contactBlocked = api.delete("/api/contacts/" + contact, adminAuth);
        assertThat(contactBlocked.status()).isEqualTo(409);
        assertThat(contactBlocked.json().get("code").asText()).isEqualTo("CONTACT_HAS_HISTORY");

        assertThat(api.delete("/api/deals/" + deal, adminAuth).status()).isEqualTo(204);
        assertThat(api.delete("/api/deals/" + deal, adminAuth).status()).isEqualTo(404);
        assertThat(api.delete("/api/contacts/" + contact, adminAuth).status()).isEqualTo(204);
        assertThat(api.delete("/api/accounts/" + account, adminAuth).status()).isEqualTo(204);
        assertThat(api.get("/api/accounts/" + account, adminAuth).status()).isEqualTo(404);
    }

    @Test
    void aContactWithOnlyAnActivityCannotBeDeleted() {
        long contact = createContact(createAccount(unique("Act ")), "Ann", "Lee");
        jdbc.update("insert into activities (contact_id, user_id, type, subject, occurred_at, created_at) "
                + "values (?, ?, 'CALL', 'Hello', now(6), now(6))", contact, admin.id());
        Res r = api.delete("/api/contacts/" + contact, adminAuth);
        assertThat(r.status()).isEqualTo(409);
        assertThat(r.json().get("code").asText()).isEqualTo("CONTACT_HAS_HISTORY");
    }

    @Test
    void everyCrmRouteNeedsASignedInCaller() {
        for (String path : List.of("/api/accounts", "/api/accounts/1", "/api/contacts", "/api/contacts/1", "/api/deals",
                "/api/deals/1", "/api/reports/deals-by-stage")) {
            Res r = api.get(path, Auth.none());
            assertThat(r.status()).as(path).isEqualTo(401);
            assertThat(r.body()).as(path).isEmpty();
        }
        assertThat(api.post("/api/accounts", "{\"name\":\"x\"}", Auth.none()).status()).isEqualTo(401);
    }

    @Test
    void responsesAreNeverCachedAndCarryTheHardeningHeaders() {
        Res r = api.get("/api/accounts", memberAuth);
        assertThat(r.header("cache-control")).isEqualTo("no-store");
        assertThat(r.header("x-content-type-options")).isEqualTo("nosniff");
        assertThat(r.header("referrer-policy")).isEqualTo("no-referrer");
        assertThat(api.get("/api/accounts", Auth.none()).header("cache-control")).isEqualTo("no-store");
    }

    @Test
    void anIdTooLargeForALongIsNotFoundWithNoStackTrace() {
        Res r = api.get("/api/accounts/99999999999999999999999", memberAuth);
        assertThat(r.status()).isEqualTo(404);
        assertThat(r.body()).isEmpty();
    }
}
