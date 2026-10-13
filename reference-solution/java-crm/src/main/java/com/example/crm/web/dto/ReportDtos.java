package com.example.crm.web.dto;

import java.math.BigDecimal;

public final class ReportDtos {
    private ReportDtos() {}

    public record DealStageRow(String stage, long deals, BigDecimal totalValue) {}

    public record AccountContactsRow(long accountId, String account, long contacts) {}

    public record UserActivitiesRow(long userId, String username, long activities) {}

    public record RoleUsersRow(String role, long users) {}
}
