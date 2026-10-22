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

    public async Task<string> NextRefAsync(CancellationToken ct = default)
    {
        var last = await _db.Accounts
            .OrderByDescending(a => a.Id)
            .Select(a => a.AccountRef)
            .FirstOrDefaultAsync(ct);

        var number = last is not null && last.Length > 2 && int.TryParse(last[2..], out var parsed)
            ? parsed
            : 0;
        return $"A-{number + 1:D4}";
    }

    public async Task AddAsync(Account account, CancellationToken ct = default) =>
        await _db.Accounts.AddAsync(account, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
