package com.example.crm.web;

import com.example.crm.service.ReportService;
import com.example.crm.web.CsvWriter.Value;
import com.example.crm.web.dto.ReportDtos.AccountContactsRow;
import com.example.crm.web.dto.ReportDtos.DealStageRow;
import com.example.crm.web.dto.ReportDtos.RoleUsersRow;
import com.example.crm.web.dto.ReportDtos.UserActivitiesRow;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Each report has a JSON route and a CSV route: GET /api/reports/{name} and GET /api/reports/{name}.csv. Every report
 * needs a signed-in caller; users-by-role is ADMIN only (SecurityConfig).
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final ReportService reports;
    private final Clock clock;

    public ReportController(ReportService reports, Clock clock) {
        this.reports = reports;
        this.clock = clock;
    }

    @GetMapping("/deals-by-stage")
    public List<DealStageRow> dealsByStage() {
        return reports.dealsByStage();
    }

    @GetMapping("/deals-by-stage.csv")
    public void dealsByStageCsv(HttpServletResponse response) throws IOException {
        csv(response, "deals-by-stage", List.of("Stage", "Deals", "TotalValueGbp"),
                reports.dealsByStage().stream().map(r -> List.of(Value.text(r.stage()), Value.number(r.deals()),
                        Value.number(r.totalValue()))).toList());
    }

    @GetMapping("/contacts-per-account")
    public List<AccountContactsRow> contactsPerAccount() {
        return reports.contactsPerAccount();
    }

    @GetMapping("/contacts-per-account.csv")
    public void contactsPerAccountCsv(HttpServletResponse response) throws IOException {
        csv(response, "contacts-per-account", List.of("AccountId", "Account", "Contacts"),
                reports.contactsPerAccount().stream().map(r -> List.of(Value.number(r.accountId()),
                        Value.text(r.account()), Value.number(r.contacts()))).toList());
    }

    @GetMapping("/activities-per-user")
    public List<UserActivitiesRow> activitiesPerUser() {
        return reports.activitiesPerUser();
    }

    @GetMapping("/activities-per-user.csv")
    public void activitiesPerUserCsv(HttpServletResponse response) throws IOException {
        csv(response, "activities-per-user", List.of("UserId", "Username", "Activities"),
                reports.activitiesPerUser().stream().map(r -> List.of(Value.number(r.userId()),
                        Value.text(r.username()), Value.number(r.activities()))).toList());
    }

    @GetMapping("/users-by-role")
    public List<RoleUsersRow> usersByRole() {
        return reports.usersByRole();
    }

    @GetMapping("/users-by-role.csv")
    public void usersByRoleCsv(HttpServletResponse response) throws IOException {
        csv(response, "users-by-role", List.of("Role", "Users"),
                reports.usersByRole().stream().map(r -> List.of(Value.text(r.role()), Value.number(r.users()))).toList());
    }

    /**
     * A download response: Content-Type text/csv; charset=utf-8 and Content-Disposition: attachment;
     * filename=name-yyyy-MM-dd.csv. Written straight to the response. Known difference: Tomcat normalises the content
     * type to "text/csv;charset=utf-8" (no space after the semicolon); it is the same media type.
     */
    private void csv(HttpServletResponse response, String name, List<String> headers, List<List<Value>> rows)
            throws IOException {
        String fileName = name + "-" + LocalDate.now(clock.withZone(ZoneOffset.UTC)) + ".csv";
        byte[] body = CsvWriter.write(headers, rows).getBytes(StandardCharsets.UTF_8);
        response.setStatus(200);
        response.setHeader(HttpHeaders.CONTENT_TYPE, CsvWriter.CONTENT_TYPE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setContentLength(body.length);
        response.getOutputStream().write(body);
    }
}
