namespace NimbusCrm.Application.Reports;

public sealed record DealStageRow(string Stage, int Deals, decimal TotalValue);

public sealed record AccountContactsRow(long AccountId, string Account, int Contacts);

public sealed record UserActivitiesRow(long UserId, string Username, int Activities);

public sealed record RoleUsersRow(string Role, int Users);
