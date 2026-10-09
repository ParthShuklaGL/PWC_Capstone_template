using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Auth;

namespace NimbusCrm.Application.Users;

public sealed record ListUsersQuery(int Page, int Size) : IQuery<IReadOnlyList<UserDto>>;

public sealed class ListUsersQueryValidator : AbstractValidator<ListUsersQuery>
{
    public ListUsersQueryValidator()
    {
        // Capped so Page * Size cannot overflow an int and turn into a negative Skip.
        RuleFor(query => query.Page).InclusiveBetween(0, 10_000);
        RuleFor(query => query.Size).InclusiveBetween(1, 100);
    }
}

public sealed class ListUsersQueryHandler(IApplicationDbContext db)
    : IQueryHandler<ListUsersQuery, IReadOnlyList<UserDto>>
{
    public async ValueTask<IReadOnlyList<UserDto>> Handle(ListUsersQuery query, CancellationToken cancellationToken)
    {
        var users = await db.Users
            .AsNoTracking()
            .OrderBy(user => user.Username)
            .Skip(query.Page * query.Size)
            .Take(query.Size)
            .ToListAsync(cancellationToken);

        return users.Select(UserDto.From).ToList();
    }
}
