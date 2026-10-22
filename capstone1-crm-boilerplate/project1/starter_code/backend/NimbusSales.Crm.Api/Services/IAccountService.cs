using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Services;

public interface IAccountService
{
    Task<IReadOnlyList<Account>> ListAsync(CancellationToken ct = default);

    Task<Account> GetByRefAsync(string accountRef, CancellationToken ct = default);

    Task<Account> CreateAsync(string name, string? industry, string? country, string? website,
                              CancellationToken ct = default);

    Task<Account> UpdateAsync(string accountRef, string name, string? industry, string? country,
                              string? website, CancellationToken ct = default);
}
