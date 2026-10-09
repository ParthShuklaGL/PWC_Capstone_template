using System.Text;
using Mediator;
using NimbusCrm.Api.Auth;
using NimbusCrm.Application.Reports;

namespace NimbusCrm.Api.Endpoints;

public static class ReportEndpoints
{
    /// <summary>
    /// Each report has a JSON route and a CSV route:
    ///   GET /api/reports/{name}       the rows as JSON
    ///   GET /api/reports/{name}.csv   the same rows as a file download
    /// Every report needs a signed-in caller; users-by-role is ADMIN only.
    /// </summary>
    public static IEndpointRouteBuilder MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        // Report data changes constantly and is business-sensitive: never let a cache keep a copy.
        var reports = app.MapGroup("/api/reports")
            .RequireAuthorization()
            .AddEndpointFilter<NoStoreEndpointFilter>();

        MapReport(reports, "deals-by-stage",
            (sender, ct) => sender.Send(new GetDealsByStageQuery(), ct),
            ["Stage", "Deals", "TotalValueGbp"],
            row => [row.Stage, CsvWriter.Number(row.Deals), CsvWriter.Number(row.TotalValue)]);

        MapReport(reports, "contacts-per-account",
            (sender, ct) => sender.Send(new GetContactsPerAccountQuery(), ct),
            ["AccountId", "Account", "Contacts"],
            row => [CsvWriter.Number(row.AccountId), row.Account, CsvWriter.Number(row.Contacts)]);

        MapReport(reports, "activities-per-user",
            (sender, ct) => sender.Send(new GetActivitiesPerUserQuery(), ct),
            ["UserId", "Username", "Activities"],
            row => [CsvWriter.Number(row.UserId), row.Username, CsvWriter.Number(row.Activities)]);

        MapReport(reports, "users-by-role",
            (sender, ct) => sender.Send(new GetUsersByRoleQuery(), ct),
            ["Role", "Users"],
            row => [row.Role, CsvWriter.Number(row.Users)],
            policy: AuthenticationExtensions.AdminOnlyPolicy);

        return app;
    }

    private static void MapReport<TRow>(
        RouteGroupBuilder group,
        string name,
        Func<ISender, CancellationToken, ValueTask<IReadOnlyList<TRow>>> load,
        IReadOnlyList<string> headers,
        Func<TRow, IReadOnlyList<CsvValue>> cells,
        string? policy = null)
    {
        var json = group.MapGet($"/{name}", async (ISender sender, CancellationToken cancellationToken) =>
            Results.Ok(await load(sender, cancellationToken)));

        var csv = group.MapGet($"/{name}.csv", async (ISender sender, TimeProvider clock, CancellationToken cancellationToken) =>
        {
            var rows = await load(sender, cancellationToken);
            var text = CsvWriter.Write(headers, rows.Select(cells));
            return ToCsvFile(text, $"{name}-{clock.GetUtcNow():yyyy-MM-dd}.csv");
        });

        if (policy is not null)
        {
            json.RequireAuthorization(policy);
            csv.RequireAuthorization(policy);
        }
    }

    /// <summary>A download response: Content-Type text/csv and Content-Disposition: attachment; filename=...</summary>
    public static IResult ToCsvFile(string csv, string fileName) =>
        Results.File(Encoding.UTF8.GetBytes(csv), CsvWriter.ContentType, fileName);
}
