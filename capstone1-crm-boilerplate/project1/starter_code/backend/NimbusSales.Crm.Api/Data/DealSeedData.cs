using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Data;

/// <summary>
/// Thirty-two deals across every stage, so every column of the board has something in it.
///
/// <para>Chosen so the interesting cases exist from the first start: a Prospect with a deal
/// in NEGOTIATION (win it and they become a Customer), a contact with one Won and one Lost
/// deal (C-00003: losing a deal must not undo a win), and a deal at PROSPECTING that can
/// still be deleted. Every deal has a stage history that ends where the deal is now.</para>
/// </summary>
public static class DealSeedData
{
    private static readonly (string Ref, string Contact, string Title, decimal Value,
        DealStage Stage, string ExpectedClose, string? ClosedDate, string? LostReason,
        DealStage? LostFrom)[] Rows =
    [
        ("D-00001", "C-00002", "Compliance reporting pilot", 18500m, DealStage.Prospecting, "2026-11-30", null, null, null),
        ("D-00002", "C-00007", "Parent-company data migration", 42000m, DealStage.Prospecting, "2026-12-18", null, null, null),
        ("D-00003", "C-00013", "Practice-wide licence", 27500m, DealStage.Prospecting, "2026-11-14", null, null, null),
        ("D-00004", "C-00019", "Site security dashboard", 33000m, DealStage.Prospecting, "2026-12-05", null, null, null),
        ("D-00005", "C-00031", "Fleet analytics starter pack", 15750m, DealStage.Prospecting, "2026-10-28", null, null, null),
        ("D-00006", "C-00005", "Facilities monitoring rollout", 64000m, DealStage.Qualified, "2026-11-20", null, null, null),
        ("D-00007", "C-00011", "Maintenance scheduling suite", 89000m, DealStage.Qualified, "2026-12-10", null, null, null),
        ("D-00008", "C-00014", "Vessel reporting platform", 47500m, DealStage.Qualified, "2026-11-25", null, null, null),
        ("D-00009", "C-00020", "Housing repairs workflow", 120000m, DealStage.Qualified, "2026-12-19", null, null, null),
        ("D-00010", "C-00026", "Analytics seats, phase one", 22000m, DealStage.Qualified, "2026-10-31", null, null, null),
        ("D-00011", "C-00008", "Brewery logistics tracking", 58000m, DealStage.Proposal, "2026-11-12", null, null, null),
        ("D-00012", "C-00016", "Seasonal stock forecasting", 76500m, DealStage.Proposal, "2026-11-27", null, null, null),
        ("D-00013", "C-00022", "Case management upgrade", 38250m, DealStage.Proposal, "2026-10-30", null, null, null),
        ("D-00014", "C-00028", "Showroom booking system", 51000m, DealStage.Proposal, "2026-12-12", null, null, null),
        ("D-00015", "C-00033", "Expansion: second site", 95000m, DealStage.Proposal, "2026-12-02", null, null, null),
        ("D-00016", "C-00001", "Procurement automation", 145000m, DealStage.Negotiation, "2026-10-23", null, null, null),
        ("D-00017", "C-00023", "Kiln monitoring, all plants", 68000m, DealStage.Negotiation, "2026-11-06", null, null, null),
        ("D-00018", "C-00029", "Guest feedback platform", 41500m, DealStage.Negotiation, "2026-10-16", null, null, null),
        ("D-00019", "C-00036", "Renewal with extra seats", 83000m, DealStage.Negotiation, "2026-11-18", null, null, null),
        ("D-00020", "C-00030", "Regional depot rollout", 112000m, DealStage.Negotiation, "2026-10-30", null, null, null),
        ("D-00021", "C-00003", "Instrument calibration portal", 72000m, DealStage.Won, "2026-07-15", "2026-07-12", null, null),
        ("D-00022", "C-00006", "Dairy yield reporting", 36500m, DealStage.Won, "2026-06-30", "2026-06-28", null, null),
        ("D-00023", "C-00009", "Bakery order management", 54000m, DealStage.Won, "2026-08-20", "2026-08-19", null, null),
        ("D-00024", "C-00012", "Campaign reporting suite", 29000m, DealStage.Won, "2026-05-29", "2026-05-27", null, null),
        ("D-00025", "C-00018", "Workshop job tracking", 61000m, DealStage.Won, "2026-09-10", "2026-09-09", null, null),
        ("D-00026", "C-00021", "Distribution scheduling", 47000m, DealStage.Won, "2026-08-05", "2026-08-04", null, null),
        ("D-00027", "C-00024", "Recipe cost tracker", 25500m, DealStage.Won, "2026-07-02", "2026-06-30", null, null),
        ("D-00028", "C-00003", "Premium support tier", 18000m, DealStage.Lost, "2026-08-31", "2026-08-28", "Customer chose to keep the standard tier.", DealStage.Proposal),
        ("D-00029", "C-00004", "School MIS integration", 52000m, DealStage.Lost, "2026-07-31", "2026-07-29", "Budget frozen until next academic year.", DealStage.Qualified),
        ("D-00030", "C-00010", "Property portfolio dashboard", 39000m, DealStage.Lost, "2026-06-15", "2026-06-12", "Went with an incumbent supplier.", DealStage.Negotiation),
        ("D-00031", "C-00017", "Win-back offer", 21000m, DealStage.Lost, "2026-09-25", "2026-09-22", "No response after three follow-ups.", DealStage.Prospecting),
        ("D-00032", "C-00025", "Robotics telemetry pilot", 98000m, DealStage.Lost, "2026-08-14", "2026-08-11", "Competitor undercut on price.", DealStage.Proposal),
    ];

    private static readonly DealStage[] Path =
    [
        DealStage.Prospecting, DealStage.Qualified, DealStage.Proposal, DealStage.Negotiation
    ];

    public static void Seed(CrmDbContext db)
    {
        if (db.Deals.Any())
        {
            return;
        }

        var contacts = db.Contacts.ToDictionary(c => c.ContactRef);

        foreach (var row in Rows)
        {
            var contact = contacts[row.Contact];
            var deal = new Deal(row.Ref, contact.AccountId, contact.Id, row.Title, row.Value,
                DateOnly.Parse(row.ExpectedClose))
            {
                Stage = row.Stage,
                ClosedDate = row.ClosedDate is null ? null : DateOnly.Parse(row.ClosedDate),
                LostReason = row.LostReason
            };
            db.Deals.Add(deal);
        }

        db.SaveChanges();

        var saved = db.Deals.ToDictionary(d => d.DealRef);
        var index = 0;
        foreach (var row in Rows)
        {
            var deal = saved[row.Ref];
            var changedAt = new DateTimeOffset(2026, 4, 1, 9, 0, 0, TimeSpan.Zero)
                .AddDays(index * 2);
            DealStage? previous = null;

            foreach (var stage in StagesVisited(row))
            {
                db.DealStageChanges.Add(new DealStageChange(deal.Id, previous, stage, changedAt));
                previous = stage;
                changedAt = changedAt.AddDays(10);
            }

            index++;
        }

        db.SaveChanges();
    }

    /// <summary>The stages a seeded deal went through to get where it is.</summary>
    private static IEnumerable<DealStage> StagesVisited((string Ref, string Contact, string Title,
        decimal Value, DealStage Stage, string ExpectedClose, string? ClosedDate,
        string? LostReason, DealStage? LostFrom) row)
    {
        var last = row.Stage switch
        {
            DealStage.Won => DealStage.Negotiation,
            DealStage.Lost => row.LostFrom ?? DealStage.Prospecting,
            _ => row.Stage
        };

        foreach (var stage in Path)
        {
            yield return stage;
            if (stage == last)
            {
                break;
            }
        }

        if (row.Stage is DealStage.Won or DealStage.Lost)
        {
            yield return row.Stage;
        }
    }
}
