package com.example.crm;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.crm.domain.UserRole;
import com.example.crm.seeding.SampleData;
import com.example.crm.support.Api.Auth;
import com.example.crm.support.Api.Res;
import com.example.crm.support.ApiTestBase;
import com.example.crm.support.RecordingInspector;
import com.example.crm.repo.AccountRepository;
import com.example.crm.repo.ContactRepository;
import com.example.crm.repo.DealRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * The four reports on a small hand-computed data set (and on the real sample data): JSON, CSV, authorization, and proof
 * that MySQL does the counting. Each test starts from an empty database.
 */
class ReportTests extends ApiTestBase {
    @Autowired AccountRepository accountRepo;
    @Autowired ContactRepository contactRepo;
    @Autowired DealRepository dealRepo;

    private Cred boss;      // ADMIN, logs 2 activities
    private Cred bee;       // USER, logs 1 activity
    private Cred idle;      // USER, logs none
    private Auth bossAuth;
    private Auth beeAuth;
    private long accountX;
    private long accountY;
    private long accountZ;

    /**
     * Dataset. Accounts: X (2 contacts), Y (1), "=SUM(1), \"Z\"" (0, a name that needs defusing and quoting).
     * Deals: PROSPECTING 100.10 + 200.20, NEGOTIATION 0.05, WON 1000.00, LOST 50.05 (and nothing in QUALIFIED/PROPOSAL).
     */
    @BeforeEach
    void buildDataset() {
        wipeAll();
        boss = newUser(UserRole.ADMIN);
        bee = newUser(UserRole.USER);
        idle = newUser(UserRole.USER);
        bossAuth = Auth.bearer(api.jwt(boss.username(), PASSWORD));
        beeAuth = Auth.bearer(api.jwt(bee.username(), PASSWORD));
        adminAuth = bossAuth;

        accountX = createAccount("Xray");
        accountY = createAccount("Yankee");
        accountZ = api.post("/api/accounts", "{\"name\":\"=SUM(1), \\\"Z\\\"\"}", bossAuth).json().get("id").asLong();
        long x1 = createContact(accountX, "Ann", "One");
        long x2 = createContact(accountX, "Bob", "Two");
        long y1 = createContact(accountY, "Cat", "Three");

        createDeal(x1, "d1", "100.10", "PROSPECTING", null);
        createDeal(x1, "d2", "200.20", "PROSPECTING", null);
        createDeal(x2, "d3", "0.05", "NEGOTIATION", null);
        createDeal(x2, "d4", "1000.00", "WON", null);
        createDeal(y1, "d5", "50.05", "LOST", "Budget");

        log(x1, boss, "one");
        log(x1, boss, "two");
        log(y1, bee, "three");
    }

    private void log(long contact, Cred user, String subject) {
        jdbc.update("insert into activities (contact_id, user_id, type, subject, occurred_at, created_at) "
                + "values (?, ?, 'NOTE', ?, now(6), now(6))", contact, user.id(), subject);
    }

    // ---------------- JSON ----------------

    @Test
    void dealsByStageListsAllSixStagesInPipelineOrderWithGbpTotals() {
        Res r = api.get("/api/reports/deals-by-stage", beeAuth);
        assertThat(r.status()).isEqualTo(200);
        JsonNode rows = r.json();
        assertThat(rows).hasSize(6);
        List<String> stages = new ArrayList<>();
        rows.forEach(row -> stages.add(row.get("stage").asText()));
        assertThat(stages).containsExactly("PROSPECTING", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST");

        long[] deals = {2, 0, 0, 1, 1, 1};
        String[] totals = {"300.30", "0", "0", "0.05", "1000.00", "50.05"};
        for (int i = 0; i < 6; i++) {
            assertThat(rows.get(i).get("deals").asLong()).as(stages.get(i)).isEqualTo(deals[i]);
            assertThat(rows.get(i).get("totalValue").decimalValue()).as(stages.get(i)).isEqualByComparingTo(totals[i]);
        }
        assertThat(rows.get(0).fieldNames()).toIterable().containsExactly("stage", "deals", "totalValue");
        assertThat(r.header("cache-control")).isEqualTo("no-store");
    }

    @Test
    void contactsPerAccountCountsZeroAccountsAndSortsBiggestFirst() {
        JsonNode rows = api.get("/api/reports/contacts-per-account", beeAuth).json();
        assertThat(rows).hasSize(3);
        assertThat(rows.get(0).get("account").asText()).isEqualTo("Xray");
        assertThat(rows.get(0).get("contacts").asInt()).isEqualTo(2);
        assertThat(rows.get(0).get("accountId").asLong()).isEqualTo(accountX);
        assertThat(rows.get(1).get("account").asText()).isEqualTo("Yankee");
        assertThat(rows.get(1).get("contacts").asInt()).isEqualTo(1);
        assertThat(rows.get(2).get("accountId").asLong()).isEqualTo(accountZ);
        assertThat(rows.get(2).get("contacts").asInt()).isZero();
        assertThat(rows.get(0).fieldNames()).toIterable().containsExactly("accountId", "account", "contacts");
    }

    @Test
    void activitiesPerUserCountsEveryUserMostActiveFirst() {
        JsonNode rows = api.get("/api/reports/activities-per-user", beeAuth).json();
        assertThat(rows).hasSize(3);
        assertThat(rows.get(0).get("username").asText()).isEqualTo(boss.username());
        assertThat(rows.get(0).get("activities").asInt()).isEqualTo(2);
        assertThat(rows.get(1).get("username").asText()).isEqualTo(bee.username());
        assertThat(rows.get(1).get("activities").asInt()).isEqualTo(1);
        assertThat(rows.get(2).get("username").asText()).isEqualTo(idle.username());
        assertThat(rows.get(2).get("activities").asInt()).isZero();
        assertThat(rows.get(0).fieldNames()).toIterable().containsExactly("userId", "username", "activities");
    }

    @Test
    void usersByRoleShowsBothRolesUpperCase() {
        JsonNode rows = api.get("/api/reports/users-by-role", bossAuth).json();
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).get("role").asText()).isEqualTo("USER");
        assertThat(rows.get(0).get("users").asInt()).isEqualTo(2);
        assertThat(rows.get(1).get("role").asText()).isEqualTo("ADMIN");
        assertThat(rows.get(1).get("users").asInt()).isEqualTo(1);
    }

    @Test
    void anEmptyDatabaseStillShowsEverySlot() {
        jdbc.update("delete from activities");
        jdbc.update("delete from deals");
        jdbc.update("delete from contacts");
        jdbc.update("delete from accounts");
        JsonNode stages = api.get("/api/reports/deals-by-stage", bossAuth).json();
        assertThat(stages).hasSize(6);
        stages.forEach(s -> {
            assertThat(s.get("deals").asInt()).isZero();
            assertThat(s.get("totalValue").decimalValue()).isEqualByComparingTo(BigDecimal.ZERO);
        });
        assertThat(api.get("/api/reports/contacts-per-account", bossAuth).json()).isEmpty();
    }

    // ---------------- the database does the counting ----------------

    @Test
    void aggregatesAreComputedByMySqlNotInMemory() {
        for (String report : List.of("deals-by-stage", "contacts-per-account", "activities-per-user", "users-by-role")) {
            RecordingInspector.clear();
            assertThat(api.get("/api/reports/" + report, bossAuth).status()).isEqualTo(200);
            List<String> selects = RecordingInspector.statements().stream()
                    .filter(s -> s.toLowerCase().startsWith("select")).toList();
            // the credential check (user lookup, revocation lookup) plus exactly one report query
            List<String> aggregates = selects.stream()
                    .filter(s -> s.toLowerCase().contains("group by") && s.toLowerCase().contains("count(")).toList();
            assertThat(aggregates).as(report).hasSize(1);
            assertThat(selects).as(report + " issues a fixed number of statements").hasSizeLessThanOrEqualTo(3);
            if (report.equals("deals-by-stage")) {
                assertThat(aggregates.get(0).toLowerCase()).contains("sum(");
            }
        }
    }

    // ---------------- CSV ----------------

    private String csv(Res r) {
        assertThat(r.status()).isEqualTo(200);
        return r.body();
    }

    @Test
    void dealsByStageCsvIsRfc4180WithCrlfAndTwoDecimals() {
        Res r = api.get("/api/reports/deals-by-stage.csv", beeAuth);
        assertThat(csv(r)).isEqualTo("Stage,Deals,TotalValueGbp\r\n"
                + "PROSPECTING,2,300.30\r\n"
                + "QUALIFIED,0,0.00\r\n"
                + "PROPOSAL,0,0.00\r\n"
                + "NEGOTIATION,1,0.05\r\n"
                + "WON,1,1000.00\r\n"
                + "LOST,1,50.05\r\n");
    }

    @Test
    void csvResponsesCarryTheDownloadHeaders() {
        String today = java.time.LocalDate.ofInstant(clock.instant(), java.time.ZoneOffset.UTC).toString();
        for (String report : List.of("deals-by-stage", "contacts-per-account", "activities-per-user")) {
            Res r = api.get("/api/reports/" + report + ".csv", beeAuth);
            assertThat(r.status()).as(report).isEqualTo(200);
            // Tomcat writes the parameter without the space ("text/csv;charset=utf-8"); the media type is the same.
            assertThat(r.header("content-type")).as(report).isEqualToIgnoringWhitespace("text/csv; charset=utf-8");
            assertThat(r.header("content-disposition")).as(report)
                    .isEqualTo("attachment; filename=" + report + "-" + today + ".csv");
            assertThat(r.header("cache-control")).as(report).isEqualTo("no-store");
        }
        Res admin = api.get("/api/reports/users-by-role.csv", bossAuth);
        assertThat(admin.header("content-disposition")).isEqualTo("attachment; filename=users-by-role-" + today + ".csv");
    }

    @Test
    void theFileNameDateIsTheUtcDate() {
        clock.freezeAt(Instant.parse("2030-03-09T23:59:00Z"));
        Auth fresh = Auth.bearer(api.jwt(bee.username(), PASSWORD));
        assertThat(api.get("/api/reports/deals-by-stage.csv", fresh).header("content-disposition"))
                .isEqualTo("attachment; filename=deals-by-stage-2030-03-09.csv");
    }

    @Test
    void csvTextIsUtf8WithoutABomAndDefusesFormulas() {
        Res r = api.get("/api/reports/contacts-per-account.csv", beeAuth);
        byte[] bytes = r.body().getBytes(StandardCharsets.UTF_8);
        assertThat(bytes[0]).isNotEqualTo((byte) 0xEF);                       // no byte order mark
        String body = csv(r);
        assertThat(body).startsWith("AccountId,Account,Contacts\r\n");
        assertThat(body).contains(accountX + ",Xray,2\r\n").contains(accountY + ",Yankee,1\r\n");
        // =SUM(1), "Z"  ->  leading apostrophe, then quoted because of the comma and the quotes (which are doubled)
        assertThat(body).contains(accountZ + ",\"'=SUM(1), \"\"Z\"\"\",0\r\n");
        assertThat(body.split("\r\n")).hasSize(4);
    }

    @Test
    void activitiesPerUserCsvHasItsColumns() {
        String body = csv(api.get("/api/reports/activities-per-user.csv", beeAuth));
        assertThat(body).startsWith("UserId,Username,Activities\r\n");
        assertThat(body).contains(boss.id() + "," + boss.username() + ",2\r\n");
        assertThat(body).contains(idle.id() + "," + idle.username() + ",0\r\n");
    }

    @Test
    void usersByRoleCsv() {
        assertThat(csv(api.get("/api/reports/users-by-role.csv", bossAuth)))
                .isEqualTo("Role,Users\r\nUSER,2\r\nADMIN,1\r\n");
    }

    // ---------------- authorization ----------------

    @Test
    void everyReportNeedsASignedInCaller() {
        for (String path : List.of("deals-by-stage", "contacts-per-account", "activities-per-user", "users-by-role")) {
            assertThat(api.get("/api/reports/" + path, Auth.none()).status()).as(path).isEqualTo(401);
            assertThat(api.get("/api/reports/" + path + ".csv", Auth.none()).status()).as(path + ".csv").isEqualTo(401);
        }
    }

    @Test
    void usersByRoleIsAdminOnlyButTheOtherReportsAreOpenToAnyUser() {
        for (String path : List.of("deals-by-stage", "contacts-per-account", "activities-per-user")) {
            assertThat(api.get("/api/reports/" + path, beeAuth).status()).as(path).isEqualTo(200);
            assertThat(api.get("/api/reports/" + path + ".csv", beeAuth).status()).as(path + ".csv").isEqualTo(200);
        }
        Res json = api.get("/api/reports/users-by-role", beeAuth);
        assertThat(json.status()).isEqualTo(403);
        assertThat(json.body()).isEmpty();
        assertThat(api.get("/api/reports/users-by-role.csv", beeAuth).status()).isEqualTo(403);
        assertThat(api.get("/api/reports/users-by-role", bossAuth).status()).isEqualTo(200);
    }

    // ---------------- the real sample data ----------------

    /** The numbers the .NET reference screenshot (reports page, seed data only) shows. */
    @Test
    void theSampleDataProducesTheDocumentedReportNumbers() {
        wipeAll();
        Cred adminUser = newUser(UserRole.ADMIN);
        Cred demoUser = newUser(UserRole.USER);
        // The sample activities belong to the first two users by id; adminUser was created first.
        SampleData.add(accountRepo, contactRepo, dealRepo, activities,
                List.of(users.findById(adminUser.id()).orElseThrow(), users.findById(demoUser.id()).orElseThrow()),
                Instant.now());
        Auth auth = Auth.bearer(api.jwt(adminUser.username(), PASSWORD));

        JsonNode stages = api.get("/api/reports/deals-by-stage", auth).json();
        int[] counts = {3, 3, 3, 2, 5, 2};
        String[] values = {"46850.50", "94650.00", "99100.75", "147500.00", "137400.00", "27450.00"};
        for (int i = 0; i < 6; i++) {
            assertThat(stages.get(i).get("deals").asInt()).as("count " + i).isEqualTo(counts[i]);
            assertThat(stages.get(i).get("totalValue").decimalValue()).as("value " + i).isEqualByComparingTo(values[i]);
        }

        JsonNode accounts = api.get("/api/reports/contacts-per-account", auth).json();
        String[] names = {"Halcyon Freight", "Brightwater Foods", "Lumen Analytics", "Northgate Logistics",
                "Pinecrest Health", "Cobalt Engineering", "Meridian Retail", "Ashford Legal"};
        int[] contacts = {4, 3, 3, 3, 3, 2, 2, 0};
        assertThat(accounts).hasSize(8);
        for (int i = 0; i < 8; i++) {
            assertThat(accounts.get(i).get("account").asText()).isEqualTo(names[i]);
            assertThat(accounts.get(i).get("contacts").asInt()).isEqualTo(contacts[i]);
        }

        JsonNode perUser = api.get("/api/reports/activities-per-user", auth).json();
        assertThat(perUser.get(0).get("username").asText()).isEqualTo(adminUser.username());
        assertThat(perUser.get(0).get("activities").asInt()).isEqualTo(20);
        assertThat(perUser.get(1).get("username").asText()).isEqualTo(demoUser.username());
        assertThat(perUser.get(1).get("activities").asInt()).isEqualTo(10);

        // and the totals the seed promises
        assertThat(api.get("/api/accounts?size=100", auth).json().get("total").asInt()).isEqualTo(SampleData.ACCOUNT_COUNT);
        assertThat(api.get("/api/contacts?size=100", auth).json().get("total").asInt()).isEqualTo(SampleData.CONTACT_COUNT);
        assertThat(api.get("/api/deals?size=100", auth).json().get("total").asInt()).isEqualTo(SampleData.DEAL_COUNT);
        assertThat(jdbc.queryForObject("select count(*) from activities", Integer.class)).isEqualTo(SampleData.ACTIVITY_COUNT);

        // seeded sample facts: closed deals carry a closed date, lost deals a reason
        JsonNode firstDeal = api.get("/api/deals?search=telematics", auth).json().get("items").get(0);
        assertThat(firstDeal.get("title").asText()).isEqualTo("Fleet telematics rollout");
        assertThat(firstDeal.get("stage").asText()).isEqualTo("WON");
        assertThat(firstDeal.get("closedDate").isNull()).isFalse();
        assertThat(api.get("/api/deals?stage=lost", auth).json().get("items").get(0).get("lostReason").isNull()).isFalse();
        assertThat(api.get("/api/contacts?status=churned", auth).json().get("total").asInt()).isEqualTo(1);
        assertThat(api.get("/api/contacts?status=customer", auth).json().get("total").asInt()).isEqualTo(5);
    }
}
