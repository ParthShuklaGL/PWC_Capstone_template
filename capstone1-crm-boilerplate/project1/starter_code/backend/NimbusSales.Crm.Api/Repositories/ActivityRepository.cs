using Microsoft.EntityFrameworkCore;
using NimbusSales.Crm.Data;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public class ActivityRepository : IActivityRepository
{
    private readonly CrmDbContext _db;

    public ActivityRepository(CrmDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Activity>> ListByContactAsync(
        long contactId, CancellationToken ct = default)
    {
        return await _db.Activities
            .AsNoTracking()
            .Where(a => a.ContactId == contactId)
            .OrderByDescending(a => a.OccurredAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Activity activity, CancellationToken ct = default) =>
        await _db.Activities.AddAsync(activity, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
