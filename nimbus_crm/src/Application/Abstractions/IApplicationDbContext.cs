using Microsoft.EntityFrameworkCore;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Application.Abstractions;

/// <summary>The slice of the DbContext that handlers use. Implemented by Infrastructure.</summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }

    DbSet<Account> Accounts { get; }

    DbSet<Contact> Contacts { get; }

    DbSet<Deal> Deals { get; }

    DbSet<Activity> Activities { get; }

    DbSet<RevokedToken> RevokedTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
