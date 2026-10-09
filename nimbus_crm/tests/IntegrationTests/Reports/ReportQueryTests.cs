using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Reports;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;
using NimbusCrm.Infrastructure.Persistence;
using NimbusCrm.IntegrationTests.Infrastructure;

namespace NimbusCrm.IntegrationTests.Reports;

/// <summary>
/// A small data set whose answers can be worked out by hand:
///   users     admin1 (ADMIN), rep1 (USER), rep2 (USER)
///   accounts  Alpha (2 contacts), Beta (1), Gamma (0)
///   deals     Prospecting 1000.50 + 2000.25, Won 5000.00, Lost 750.00
///   activity  rep1 logged 3, admin1 logged 1, rep2 logged 0
/// </summary>
public sealed class ReportDataFixture : MySqlDatabaseFixture
{
    protected override async Task SeedAsync(CrmDbContext context)
    {
        var admin = new User { Username = "admin1", Email = "admin1@example.com", PasswordHash = "x", Role = UserRole.Admin };
        var rep1 = new User { Username = "rep1", Email = "rep1@example.com", PasswordHash = "x" };
        var rep2 = new User { Username = "rep2", Email = "rep2@example.com", PasswordHash = "x" };

        var alpha = new Account { Name = "Alpha" };
        var beta = new Account { Name = "Beta" };
        var gamma = new Account { Name = "Gamma" };

        var c1 = new Contact { Account = alpha, FirstName = "Ann", LastName = "One", Email = "ann@example.com" };
        var c2 = new Contact { Account = alpha, FirstName = "Bob", LastName = "Two", Email = "bob@example.com" };
        var c3 = new Contact { Account = beta, FirstName = "Cy", LastName = "Three", Email = "cy@example.com" };

        var close = new DateOnly(2026, 12, 1);
        context.AddRange(admin, rep1, rep2, alpha, beta, gamma, c1, c2, c3,
            new Deal { Contact = c1, Title = "d1", Value = 1000.50m, Stage = DealStage.Prospecting, ExpectedCloseDate = close },
            new Deal { Contact = c2, Title = "d2", Value = 2000.25m, Stage = DealStage.Prospecting, ExpectedCloseDate = close },
            new Deal { Contact = c3, Title = "d3", Value = 5000.00m, Stage = DealStage.Won, ExpectedCloseDate = close, ClosedDate = close },
            new Deal { Contact = c1, Title = "d4", Value = 750.00m, Stage = DealStage.Lost, ExpectedCloseDate = close, ClosedDate = close, LostReason = "Budget" },
            new Activity { Contact = c1, User = rep1, Type = ActivityType.Call, Subject = "a1", OccurredAt = DateTime.UtcNow },
            new Activity { Contact = c1, User = rep1, Type = ActivityType.Email, Subject = "a2", OccurredAt = DateTime.UtcNow },
            new Activity { Contact = c2, User = rep1, Type = ActivityType.Note, Subject = "a3", OccurredAt = DateTime.UtcNow },
            new Activity { Contact = c3, User = admin, Type = ActivityType.Meeting, Subject = "a4", OccurredAt = DateTime.UtcNow });

        await context.SaveChangesAsync(CancellationToken.None);
    }
}

public class ReportQueryTests(ReportDataFixture database) : IClassFixture<ReportDataFixture>
{
    [MySqlFact]
    public async Task DealsByStageReturnsEverySixStagesWithTheirCountsAndValues()
    {
        await using var context = database.CreateContext();

        var rows = await new GetDealsByStageQueryHandler(context)
            .Handle(new GetDealsByStageQuery(), CancellationToken.None);

        Assert.Equal(
        [
            new DealStageRow("PROSPECTING", 2, 3000.75m),
            new DealStageRow("QUALIFIED", 0, 0m),
            new DealStageRow("PROPOSAL", 0, 0m),
            new DealStageRow("NEGOTIATION", 0, 0m),
            new DealStageRow("WON", 1, 5000.00m),
            new DealStageRow("LOST", 1, 750.00m),
        ], rows);
    }

    [MySqlFact]
    public async Task DealsByStageAsksMySqlToGroupAndSumInOneCommand()
    {
        await using var context = database.CreateContext();
        database.Sql.Clear();

        await new GetDealsByStageQueryHandler(context).Handle(new GetDealsByStageQuery(), CancellationToken.None);

        var command = Assert.Single(database.Sql);
        Assert.Contains("GROUP BY", command);
        Assert.Contains("SUM(", command);
        Assert.Contains("COUNT(", command);
    }

    [MySqlFact]
    public async Task ContactsPerAccountCountsInTheDatabaseAndShowsAccountsWithNoContacts()
    {
        await using var context = database.CreateContext();
        database.Sql.Clear();

        var rows = await new GetContactsPerAccountQueryHandler(context)
            .Handle(new GetContactsPerAccountQuery(), CancellationToken.None);

        Assert.Equal(["Alpha:2", "Beta:1", "Gamma:0"], rows.Select(row => $"{row.Account}:{row.Contacts}"));
        Assert.Contains("COUNT(", Assert.Single(database.Sql));
    }

    [MySqlFact]
    public async Task ActivitiesPerUserListsEveryUserMostActiveFirst()
    {
        await using var context = database.CreateContext();

        var rows = await new GetActivitiesPerUserQueryHandler(context)
            .Handle(new GetActivitiesPerUserQuery(), CancellationToken.None);

        Assert.Equal(["rep1:3", "admin1:1", "rep2:0"], rows.Select(row => $"{row.Username}:{row.Activities}"));
    }

    [MySqlFact]
    public async Task UsersByRoleCountsEachRoleAndTheTotalMatchesTheTable()
    {
        await using var context = database.CreateContext();

        var rows = await new GetUsersByRoleQueryHandler(context)
            .Handle(new GetUsersByRoleQuery(), CancellationToken.None);

        Assert.Equal([new RoleUsersRow("USER", 2), new RoleUsersRow("ADMIN", 1)], rows.OrderByDescending(row => row.Users));
        Assert.Equal(await context.Users.CountAsync(CancellationToken.None), rows.Sum(row => row.Users));
    }
}
