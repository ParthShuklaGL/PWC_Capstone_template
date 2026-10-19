using Microsoft.EntityFrameworkCore;
using NimbusSales.Crm.Data;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public class DealRepository : IDealRepository
{
    private readonly CrmDbContext _db;

    public DealRepository(CrmDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<Deal>> ListAsync(int page, int size, DealStage? stage,
                                                   CancellationToken ct = default)
    {
        var safePage = Math.Max(0, page);
        var safeSize = Math.Clamp(size, 1, 100);

        // The account and the contact are loaded with the deal: the list shows both names
        // against every row, and there is no lazy loading here.
        var query = _db.Deals
            .AsNoTracking()
            .Include(d => d.Account)
            .Include(d => d.Contact)
            .AsQueryable();

        if (stage is not null)
        {
            query = query.Where(d => d.Stage == stage.Value);
        }

        var total = await query.LongCountAsync(ct);

        // Ordered inside the query, before paging: a page is only stable with an
        // ORDER BY, and the order has to be decided before the page is cut.
        var items = await query
            .OrderBy(d => d.ExpectedCloseDate)
            .ThenBy(d => d.Id)
            .Skip(safePage * safeSize)
            .Take(safeSize)
            .ToListAsync(ct);

        return new PagedResult<Deal>(items, total);
    }

    public Task<Deal?> FindByRefAsync(string dealRef, CancellationToken ct = default)
    {
        return _db.Deals
            .Include(d => d.Account)
            .Include(d => d.Contact)
            .FirstOrDefaultAsync(d => d.DealRef == dealRef, ct);
    }

    public async Task<IReadOnlyList<Deal>> ListByContactAsync(
        long contactId, CancellationToken ct = default)
    {
        return await _db.Deals
            .AsNoTracking()
            .Include(d => d.Account)
            .Include(d => d.Contact)
            .Where(d => d.ContactId == contactId)
            .OrderBy(d => d.ExpectedCloseDate)
            .ThenBy(d => d.Id)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<DealStageTotal>> TotalsByStageAsync(
        CancellationToken ct = default)
    {
        var rows = await _db.Deals
            .AsNoTracking()
            .GroupBy(d => d.Stage)
            .Select(g => new { Stage = g.Key, Count = g.Count(), Total = g.Sum(d => d.Value) })
            .ToListAsync(ct);

        return rows.Select(r => new DealStageTotal(r.Stage, r.Count, r.Total)).ToList();
    }

    public async Task<string> NextRefAsync(CancellationToken ct = default)
    {
        var last = await _db.Deals
            .OrderByDescending(d => d.Id)
            .Select(d => d.DealRef)
            .FirstOrDefaultAsync(ct);

        var number = 0;
        if (last is not null && last.Length > 2 && int.TryParse(last[2..], out var parsed))
        {
            number = parsed;
        }

        return $"D-{number + 1:D5}";
    }

    public async Task AddAsync(Deal deal, CancellationToken ct = default) =>
        await _db.Deals.AddAsync(deal, ct);

    public void Remove(Deal deal) => _db.Deals.Remove(deal);

    public async Task AddStageChangeAsync(DealStageChange change, CancellationToken ct = default) =>
        await _db.DealStageChanges.AddAsync(change, ct);

    public async Task<IReadOnlyList<DealStageChange>> ListStageChangesAsync(
        long dealId, CancellationToken ct = default)
    {
        return await _db.DealStageChanges
            .AsNoTracking()
            .Where(c => c.DealId == dealId)
            .OrderBy(c => c.ChangedAt)
            .ThenBy(c => c.Id)
            .ToListAsync(ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
