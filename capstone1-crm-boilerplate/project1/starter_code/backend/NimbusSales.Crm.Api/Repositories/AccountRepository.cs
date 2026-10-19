using Microsoft.EntityFrameworkCore;
using NimbusSales.Crm.Data;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public class AccountRepository : IAccountRepository
{
    private readonly CrmDbContext _db;

    public AccountRepository(CrmDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Account>> ListByNameAsync(CancellationToken ct = default)
    {
        return await _db.Accounts
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .ToListAsync(ct);
    }

    public Task<Account?> FindByRefAsync(string accountRef, CancellationToken ct = default)
    {
        return _db.Accounts.FirstOrDefaultAsync(a => a.AccountRef == accountRef, ct);
    }
}
