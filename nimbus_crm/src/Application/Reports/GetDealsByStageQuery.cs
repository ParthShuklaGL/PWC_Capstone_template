using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Application.Reports;

/// <summary>Count and total value of deals in each stage, in pipeline order. Every stage appears.</summary>
public sealed record GetDealsByStageQuery : IQuery<IReadOnlyList<DealStageRow>>;

public sealed class GetDealsByStageQueryHandler(IApplicationDbContext db)
    : IQueryHandler<GetDealsByStageQuery, IReadOnlyList<DealStageRow>>
{
    public async ValueTask<IReadOnlyList<DealStageRow>> Handle(
        GetDealsByStageQuery query, CancellationToken cancellationToken)
    {
        // One GROUP BY in the database. The count and the sum are computed by MySQL.
        var grouped = await db.Deals
            .AsNoTracking()
            .GroupBy(deal => deal.Stage)
            .Select(group => new { Stage = group.Key, Deals = group.Count(), TotalValue = group.Sum(deal => deal.Value) })
            .ToListAsync(cancellationToken);

        // A stage with no deals has no group; show it as zero so the board always has all six rows.
        return Enum.GetValues<DealStage>()
            .Select(stage =>
            {
                var found = grouped.FirstOrDefault(row => row.Stage == stage);
                return new DealStageRow(stage.ToString().ToUpperInvariant(), found?.Deals ?? 0, found?.TotalValue ?? 0m);
            })
            .ToList();
    }
}
