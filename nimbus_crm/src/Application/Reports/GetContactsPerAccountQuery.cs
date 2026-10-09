using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;

namespace NimbusCrm.Application.Reports;

/// <summary>Number of contacts at each account, biggest first. Accounts with no contacts show 0.</summary>
public sealed record GetContactsPerAccountQuery : IQuery<IReadOnlyList<AccountContactsRow>>;

public sealed class GetContactsPerAccountQueryHandler(IApplicationDbContext db)
    : IQueryHandler<GetContactsPerAccountQuery, IReadOnlyList<AccountContactsRow>>
{
    public async ValueTask<IReadOnlyList<AccountContactsRow>> Handle(
        GetContactsPerAccountQuery query, CancellationToken cancellationToken)
    {
        // The count is a correlated subquery, so MySQL counts and sorts; nothing is counted here.
        return await db.Accounts
            .AsNoTracking()
            .OrderByDescending(account => account.Contacts.Count)
            .ThenBy(account => account.Name)
            .Select(account => new AccountContactsRow(account.Id, account.Name, account.Contacts.Count))
            .ToListAsync(cancellationToken);
    }
}
