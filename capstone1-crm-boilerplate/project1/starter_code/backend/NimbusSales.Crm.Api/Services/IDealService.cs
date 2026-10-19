using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

public interface IDealService
{
    Task<PagedResult<Deal>> ListAsync(int page, int size, DealStage? stage,
                                      CancellationToken ct = default);

    Task<Deal> GetByRefAsync(string dealRef, CancellationToken ct = default);

    Task<IReadOnlyList<Deal>> ListForContactAsync(string contactRef,
                                                  CancellationToken ct = default);

    Task<Deal> CreateAsync(string title, string accountRef, string contactRef, decimal value,
                           DateOnly expectedCloseDate, CancellationToken ct = default);

    Task<Deal> UpdateAsync(string dealRef, string title, decimal value,
                           DateOnly expectedCloseDate, CancellationToken ct = default);

    Task DeleteAsync(string dealRef, CancellationToken ct = default);

    Task<Deal> MoveToStageAsync(string dealRef, DealStage target, DateOnly? closeDate,
                                string? lostReason, CancellationToken ct = default);

    Task<DealSummary> SummariseAsync(CancellationToken ct = default);

    Task<IReadOnlyList<DealStageChange>> HistoryAsync(string dealRef,
                                                      CancellationToken ct = default);
}
