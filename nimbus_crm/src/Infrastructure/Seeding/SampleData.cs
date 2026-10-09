using NimbusCrm.Application.Abstractions;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Infrastructure.Seeding;

/// <summary>
/// Fixed, made-up sample data so the reports have something to show: 8 accounts (one with no
/// contacts), 20 contacts, 18 deals across all six stages, and 30 activities logged by the two
/// seeded users. Development only; see <see cref="DevelopmentSeeder"/>.
/// </summary>
public static class SampleData
{
    public const int AccountCount = 8;
    public const int ContactCount = 20;
    public const int DealCount = 18;
    public const int ActivityCount = 30;

    private static readonly (string Name, string Industry, string Country)[] Accounts =
    [
        ("Halcyon Freight", "Logistics", "United Kingdom"),
        ("Brightwater Foods", "Food and Beverage", "Ireland"),
        ("Northgate Logistics", "Logistics", "United Kingdom"),
        ("Pinecrest Health", "Healthcare", "Germany"),
        ("Lumen Analytics", "Software", "Netherlands"),
        ("Cobalt Engineering", "Manufacturing", "France"),
        ("Meridian Retail", "Retail", "United Kingdom"),
        ("Ashford Legal", "Legal Services", "United Kingdom"),
    ];

    // Account index, first name, last name, job title. Index 7 (Ashford Legal) has no contacts.
    private static readonly (int Account, string First, string Last, string Job)[] Contacts =
    [
        (0, "Maya", "Okafor", "Head of Operations"),
        (0, "Tom", "Hargreaves", "Fleet Manager"),
        (0, "Priya", "Nair", "Finance Director"),
        (0, "Luis", "Ortega", "Procurement Lead"),
        (1, "Aoife", "Brennan", "Buying Director"),
        (1, "Declan", "Walsh", "Supply Chain Manager"),
        (1, "Sinead", "Rooney", "Chief Financial Officer"),
        (2, "Greg", "Hollis", "Chief Operating Officer"),
        (2, "Hannah", "Beck", "IT Manager"),
        (2, "Omar", "Siddiqui", "Warehouse Lead"),
        (3, "Lena", "Vogel", "Medical Director"),
        (3, "Jonas", "Keller", "Procurement Manager"),
        (3, "Marta", "Schmidt", "Operations Manager"),
        (4, "Eva", "de Vries", "Chief Technology Officer"),
        (4, "Bram", "Jansen", "Head of Data"),
        (4, "Noor", "Haddad", "Product Lead"),
        (5, "Claire", "Dubois", "Plant Manager"),
        (5, "Mathieu", "Laurent", "Purchasing Manager"),
        (6, "Sophie", "Turner", "Merchandising Director"),
        (6, "Ravi", "Patel", "Ecommerce Lead"),
    ];

    // Contact index, title, value in GBP, stage, lost reason.
    private static readonly (int Contact, string Title, decimal Value, DealStage Stage, string? LostReason)[] Deals =
    [
        (0, "Fleet telematics rollout", 48000.00m, DealStage.Won, null),
        (2, "Invoice automation", 18500.00m, DealStage.Won, null),
        (4, "Cold-chain monitoring", 36000.00m, DealStage.Won, null),
        (14, "Dashboard add-on", 8400.00m, DealStage.Won, null),
        (18, "Loyalty integration", 26500.00m, DealStage.Won, null),
        (1, "Driver safety pilot", 12750.50m, DealStage.Prospecting, null),
        (9, "Warehouse sensors", 19200.00m, DealStage.Prospecting, null),
        (12, "Compliance reporting", 14900.00m, DealStage.Prospecting, null),
        (3, "Procurement portal", 22400.00m, DealStage.Qualified, null),
        (11, "Inventory tracking", 31250.00m, DealStage.Qualified, null),
        (16, "Line monitoring", 41000.00m, DealStage.Qualified, null),
        (5, "Supplier analytics", 15300.00m, DealStage.Proposal, null),
        (8, "Dispatch dashboard", 27800.75m, DealStage.Proposal, null),
        (13, "Data platform licence", 56000.00m, DealStage.Proposal, null),
        (7, "Route optimisation", 64000.00m, DealStage.Negotiation, null),
        (10, "Patient scheduling suite", 83500.00m, DealStage.Negotiation, null),
        (6, "Churn win-back offer", 9800.00m, DealStage.Lost, "Budget frozen"),
        (19, "Checkout analytics", 17650.00m, DealStage.Lost, "Chose a competitor"),
    ];

    // Contact index, type, subject, days ago. Even users: index 0 logs two of every three, index 1 the rest.
    private static readonly (int Contact, ActivityType Type, string Subject, int DaysAgo)[] Activities =
    [
        (0, ActivityType.Call, "Discovery call", 52), (0, ActivityType.Meeting, "Telematics demo on site", 40),
        (0, ActivityType.Email, "Sent contract draft", 24), (2, ActivityType.Call, "Finance review", 38),
        (2, ActivityType.Email, "Invoice automation quote", 30), (4, ActivityType.Meeting, "Cold-chain site visit", 45),
        (4, ActivityType.Note, "Wants sensors in all depots", 44), (4, ActivityType.Call, "Contract signed", 28),
        (1, ActivityType.Call, "Intro call", 21), (1, ActivityType.Email, "Pilot proposal sent", 14),
        (3, ActivityType.Meeting, "Portal requirements workshop", 18), (5, ActivityType.Call, "Supplier data walkthrough", 16),
        (5, ActivityType.Email, "Proposal follow-up", 9), (6, ActivityType.Note, "Budget frozen until Q2", 33),
        (7, ActivityType.Meeting, "Route planning session", 12), (7, ActivityType.Email, "Negotiation terms", 6),
        (8, ActivityType.Call, "Dashboard feedback", 11), (9, ActivityType.Note, "Needs approval from COO", 8),
        (10, ActivityType.Meeting, "Scheduling suite demo", 15), (10, ActivityType.Email, "Pricing discussion", 5),
        (11, ActivityType.Call, "Inventory scoping", 20), (12, ActivityType.Email, "Compliance checklist", 10),
        (13, ActivityType.Meeting, "Platform architecture review", 13), (14, ActivityType.Call, "Add-on renewal", 36),
        (16, ActivityType.Call, "Line monitoring intro", 7), (17, ActivityType.Email, "Spec sheet sent", 4),
        (18, ActivityType.Meeting, "Loyalty kickoff", 26), (18, ActivityType.Note, "Go-live in November", 22),
        (19, ActivityType.Call, "Lost to competitor", 19), (15, ActivityType.Email, "Product lead intro", 3),
    ];

    /// <summary>Adds the sample records to <paramref name="db"/>. The caller saves. Needs at least one user.</summary>
    public static void Add(IApplicationDbContext db, IReadOnlyList<User> users, DateTime now)
    {
        var accounts = Accounts
            .Select(a => new Account { Name = a.Name, Industry = a.Industry, Country = a.Country, CreatedAt = now.AddDays(-90) })
            .ToList();
        db.Accounts.AddRange(accounts);

        var contacts = Contacts
            .Select(c => new Contact
            {
                Account = accounts[c.Account],
                FirstName = c.First,
                LastName = c.Last,
                Email = $"{c.First}.{c.Last}@{Domain(Accounts[c.Account].Name)}".Replace(" ", string.Empty).ToLowerInvariant(),
                JobTitle = c.Job,
                Status = ContactStatus.Prospect,
                CreatedAt = now.AddDays(-80),
            })
            .ToList();
        contacts[6].Status = ContactStatus.Churned;
        db.Contacts.AddRange(contacts);

        foreach (var deal in Deals)
        {
            var closed = deal.Stage is DealStage.Won or DealStage.Lost;
            db.Deals.Add(new Deal
            {
                Contact = contacts[deal.Contact],
                Title = deal.Title,
                Value = deal.Value,
                Stage = deal.Stage,
                ExpectedCloseDate = DateOnly.FromDateTime(now.AddDays(closed ? -10 : 30)),
                ClosedDate = closed ? DateOnly.FromDateTime(now.AddDays(-10)) : null,
                LostReason = deal.LostReason,
                CreatedAt = now.AddDays(-60),
                UpdatedAt = now.AddDays(-10),
            });

            if (deal.Stage == DealStage.Won)
            {
                contacts[deal.Contact].Status = ContactStatus.Customer;
            }
        }

        for (var i = 0; i < Activities.Length; i++)
        {
            var (contactIndex, type, subject, daysAgo) = Activities[i];
            var occurred = now.AddDays(-daysAgo);
            db.Activities.Add(new Activity
            {
                Contact = contacts[contactIndex],
                User = users[i % 3 == 0 && users.Count > 1 ? 1 : 0],
                Type = type,
                Subject = subject,
                OccurredAt = occurred,
                CreatedAt = occurred,
            });

            var contact = contacts[contactIndex];
            if (contact.LastContactedAt is null || contact.LastContactedAt < occurred)
            {
                contact.LastContactedAt = occurred;
            }
        }
    }

    private static string Domain(string accountName) => accountName.Replace(" ", string.Empty) + ".example";
}
