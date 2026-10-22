using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

public class AccountService : IAccountService
{
    private readonly IAccountRepository _accounts;
    private readonly CrmAuditLogger _audit;

    public AccountService(IAccountRepository accounts, CrmAuditLogger audit)
    {
        _accounts = accounts;
        _audit = audit;
    }

    public async Task<IReadOnlyList<Account>> ListAsync(CancellationToken ct = default)
    {
        var accounts = await _accounts.ListByNameAsync(ct);
        _audit.Listed("account", accounts.Count);
        return accounts;
    }

    public async Task<Account> GetByRefAsync(string accountRef, CancellationToken ct = default)
    {
        var account = await _accounts.FindByRefAsync(accountRef, ct)
            ?? throw new AccountNotFoundException(accountRef);
        _audit.Viewed("account", accountRef);
        return account;
    }

    public async Task<Account> CreateAsync(string name, string? industry, string? country,
                                           string? website, CancellationToken ct = default)
    {
        var accountRef = await _accounts.NextRefAsync(ct);
        var account = new Account(accountRef, name.Trim(), industry, country, website);
        await _accounts.AddAsync(account, ct);
        await _accounts.SaveChangesAsync(ct);
        _audit.Created("account", accountRef);
        return account;
    }

    public async Task<Account> UpdateAsync(string accountRef, string name, string? industry,
                                           string? country, string? website,
                                           CancellationToken ct = default)
    {
        var account = await _accounts.FindByRefAsync(accountRef, ct)
            ?? throw new AccountNotFoundException(accountRef);

        account.Update(name.Trim(), industry, country, website);
        await _accounts.SaveChangesAsync(ct);
        _audit.Updated("account", accountRef);
        return account;
    }
}
