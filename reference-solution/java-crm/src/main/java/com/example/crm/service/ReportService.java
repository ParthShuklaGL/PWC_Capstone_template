package com.example.crm.service;

import com.example.crm.domain.DealStage;
import com.example.crm.domain.UserRole;
import com.example.crm.repo.AccountRepository;
import com.example.crm.repo.DealRepository;
import com.example.crm.repo.UserRepository;
import com.example.crm.web.dto.ReportDtos.AccountContactsRow;
import com.example.crm.web.dto.ReportDtos.DealStageRow;
import com.example.crm.web.dto.ReportDtos.RoleUsersRow;
import com.example.crm.web.dto.ReportDtos.UserActivitiesRow;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Every number here is computed by MySQL (GROUP BY / COUNT / SUM); nothing is counted in memory. */
@Service
@Transactional(readOnly = true)
public class ReportService {
    private final DealRepository deals;
    private final AccountRepository accounts;
    private final UserRepository users;

    public ReportService(DealRepository deals, AccountRepository accounts, UserRepository users) {
        this.deals = deals;
        this.accounts = accounts;
        this.users = users;
    }

    /** All six stages in pipeline order; a stage with no deals shows zero. */
    public List<DealStageRow> dealsByStage() {
        var grouped = deals.totalsByStage();
        return Arrays.stream(DealStage.values()).map(stage -> {
            var found = grouped.stream().filter(g -> g.getStage() == stage).findFirst();
            return new DealStageRow(stage.name(), found.map(g -> g.getDeals()).orElse(0L),
                    found.map(g -> g.getTotal()).orElse(BigDecimal.ZERO));
        }).toList();
    }

    public List<AccountContactsRow> contactsPerAccount() {
        return accounts.contactsPerAccount().stream()
                .map(r -> new AccountContactsRow(r.getAccountId(), r.getAccount(), r.getContacts())).toList();
    }

    public List<UserActivitiesRow> activitiesPerUser() {
        return users.activitiesPerUser().stream()
                .map(r -> new UserActivitiesRow(r.getUserId(), r.getUsername(), r.getActivities())).toList();
    }

    /** Every role appears. */
    public List<RoleUsersRow> usersByRole() {
        var grouped = users.countByRole();
        return Arrays.stream(UserRole.values()).map(role -> new RoleUsersRow(role.name(),
                grouped.stream().filter(g -> g.getRole() == role).findFirst().map(g -> g.getUsers()).orElse(0L)))
                .toList();
    }
}
