using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Reports;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;
using NimbusCrm.Infrastructure.Persistence;
using NimbusCrm.Infrastructure.Seeding;
using NimbusCrm.IntegrationTests.Infrastructure;

namespace NimbusCrm.IntegrationTests.Reports;

public sealed class SampleDataFixture : MySqlDatabaseFixture
{
    protected override async Task SeedAsync(CrmDbContext context)
    {
        var users = new List<User>
        {
            new() { Username = "admin", Email = "admin@example.com", PasswordHash = "x", Role = UserRole.Admin },
            new() { Username = "demo", Email = "demo@example.com", PasswordHash = "x" },
        };
        context.Users.AddRange(users);
        SampleData.Add(context, users, DateTime.UtcNow);
        await context.SaveChangesAsync(CancellationToken.None);
    }
}

/// <summary>The development sample data really is 30+ records, and the reports add up to it.</summary>
public class SampleDataReportTests(SampleDataFixture database) : IClassFixture<SampleDataFixture>
{
    [MySqlFact]
    public async Task SampleDataHasTheDocumentedNumberOfRecordsInEveryTable()
    {
        await using var context = database.CreateContext();

        var counts = new[]
        {
            await context.Users.CountAsync(CancellationToken.None), await context.Accounts.CountAsync(CancellationToken.None), await context.Contacts.CountAsync(CancellationToken.None),
            await context.Deals.CountAsync(CancellationToken.None), await context.Activities.CountAsync(CancellationToken.None),
        };

        Assert.Equal(
            [2, SampleData.AccountCount, SampleData.ContactCount, SampleData.DealCount, SampleData.ActivityCount],
            counts);
        Assert.True(counts.Sum() >= 30, $"Expected 30 or more seeded records, found {counts.Sum()}.");
    }

    [MySqlFact]
    public async Task DealsByStageTotalsMatchTheSampleDeals()
    {
        await using var context = database.CreateContext();

        var rows = await new GetDealsByStageQueryHandler(context)
            .Handle(new GetDealsByStageQuery(), CancellationToken.None);

        Assert.Equal(
        [
            new DealStageRow("PROSPECTING", 3, 46850.50m),
            new DealStageRow("QUALIFIED", 3, 94650.00m),
            new DealStageRow("PROPOSAL", 3, 99100.75m),
            new DealStageRow("NEGOTIATION", 2, 147500.00m),
            new DealStageRow("WON", 5, 137400.00m),
            new DealStageRow("LOST", 2, 27450.00m),
        ], rows);
        Assert.Equal(SampleData.DealCount, rows.Sum(row => row.Deals));
    }

    [MySqlFact]
    public async Task ContactsPerAccountMatchesTheSampleAccountsAndSumsToAllContacts()
    {
        await using var context = database.CreateContext();

        var rows = await new GetContactsPerAccountQueryHandler(context)
            .Handle(new GetContactsPerAccountQuery(), CancellationToken.None);

        Assert.Equal(
        [
            "Halcyon Freight:4", "Brightwater Foods:3", "Lumen Analytics:3", "Northgate Logistics:3",
            "Pinecrest Health:3", "Cobalt Engineering:2", "Meridian Retail:2", "Ashford Legal:0",
        ], rows.Select(row => $"{row.Account}:{row.Contacts}"));
        Assert.Equal(SampleData.ContactCount, rows.Sum(row => row.Contacts));
    }

    [MySqlFact]
    public async Task ActivitiesPerUserSplitsTheThirtySampleActivitiesTwentyToTen()
    {
        await using var context = database.CreateContext();

        var rows = await new GetActivitiesPerUserQueryHandler(context)
            .Handle(new GetActivitiesPerUserQuery(), CancellationToken.None);

        Assert.Equal(["admin:20", "demo:10"], rows.Select(row => $"{row.Username}:{row.Activities}"));
    }
}
