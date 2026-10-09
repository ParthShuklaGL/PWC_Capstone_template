using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;

namespace NimbusCrm.Application.Reports;

/// <summary>Number of activities each user has logged, most active first. Users with none show 0.</summary>
public sealed record GetActivitiesPerUserQuery : IQuery<IReadOnlyList<UserActivitiesRow>>;

public sealed class GetActivitiesPerUserQueryHandler(IApplicationDbContext db)
    : IQueryHandler<GetActivitiesPerUserQuery, IReadOnlyList<UserActivitiesRow>>
{
    public async ValueTask<IReadOnlyList<UserActivitiesRow>> Handle(
        GetActivitiesPerUserQuery query, CancellationToken cancellationToken)
    {
        // Counted and sorted by MySQL. The sort comes before the projection: EF cannot order by a
        // field of a record it has just built.
        return await db.Users
            .AsNoTracking()
            .OrderByDescending(user => db.Activities.Count(activity => activity.UserId == user.Id))
            .ThenBy(user => user.Username)
            .Select(user => new UserActivitiesRow(
                user.Id,
                user.Username,
                db.Activities.Count(activity => activity.UserId == user.Id)))
            .ToListAsync(cancellationToken);
    }
}
