using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public interface IAccountRepository
{
    Task<IReadOnlyList<Account>> ListByNameAsync(CancellationToken ct = default);

    Task<Account?> FindByRefAsync(string accountRef, CancellationToken ct = default);
}
