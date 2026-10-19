using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Services;

public interface IAccountService
{
    Task<IReadOnlyList<Account>> ListAsync(CancellationToken ct = default);

    Task<Account> GetByRefAsync(string accountRef, CancellationToken ct = default);
}
