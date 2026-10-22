using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public interface IDealRepository
{
    /// <summary>When ownerId is set, only that rep's deals are returned.</summary>
    Task<PagedResult<Deal>> ListAsync(int page, int size, DealStage? stage, long? ownerId,
                                      CancellationToken ct = default);

    /// <summary>The deal, tracked, with its account and contact loaded.</summary>
    Task<Deal?> FindByRefAsync(string dealRef, CancellationToken ct = default);

    Task<IReadOnlyList<Deal>> ListByContactAsync(long contactId, long? ownerId,
                                                 CancellationToken ct = default);

    /// <summary>One row per stage that has at least one deal.</summary>
    Task<IReadOnlyList<DealStageTotal>> TotalsByStageAsync(long? ownerId,
                                                           CancellationToken ct = default);

    Task<string> NextRefAsync(CancellationToken ct = default);

    Task AddAsync(Deal deal, CancellationToken ct = default);

    void Remove(Deal deal);

    Task AddStageChangeAsync(DealStageChange change, CancellationToken ct = default);

    Task<IReadOnlyList<DealStageChange>> ListStageChangesAsync(long dealId,
                                                               CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
