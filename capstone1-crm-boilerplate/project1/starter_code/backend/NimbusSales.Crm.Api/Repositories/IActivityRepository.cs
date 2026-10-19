using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public interface IActivityRepository
{
    Task<IReadOnlyList<Activity>> ListByContactAsync(long contactId, CancellationToken ct = default);

    Task AddAsync(Activity activity, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
