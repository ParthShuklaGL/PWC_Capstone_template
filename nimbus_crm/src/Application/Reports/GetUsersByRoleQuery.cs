using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Auth;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Application.Reports;

/// <summary>Number of users in each role. Every role appears. The endpoint is ADMIN only.</summary>
public sealed record GetUsersByRoleQuery : IQuery<IReadOnlyList<RoleUsersRow>>;

public sealed class GetUsersByRoleQueryHandler(IApplicationDbContext db)
    : IQueryHandler<GetUsersByRoleQuery, IReadOnlyList<RoleUsersRow>>
{
    public async ValueTask<IReadOnlyList<RoleUsersRow>> Handle(
        GetUsersByRoleQuery query, CancellationToken cancellationToken)
    {
        var grouped = await db.Users
            .AsNoTracking()
            .GroupBy(user => user.Role)
            .Select(group => new { Role = group.Key, Users = group.Count() })
            .ToListAsync(cancellationToken);

        return Enum.GetValues<UserRole>()
            .Select(role => new RoleUsersRow(
                RoleNames.For(role),
                grouped.FirstOrDefault(row => row.Role == role)?.Users ?? 0))
            .ToList();
    }
}
