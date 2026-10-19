using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web.Dto;

namespace NimbusSales.Crm.Web.Mapping;

/// <summary>Hand-written, like the others, so the fields that cross the boundary are visible.</summary>
public class DealMapper
{
    public DealResponse ToResponse(Deal deal)
    {
        return new DealResponse
        {
            DealRef = deal.DealRef,
            Title = deal.Title,
            Value = deal.Value,
            ExpectedCloseDate = deal.ExpectedCloseDate,
            Stage = DealStageRules.Wire(deal.Stage),
            ClosedDate = deal.ClosedDate,
            LostReason = deal.LostReason,
            AccountRef = deal.Account?.AccountRef ?? string.Empty,
            AccountName = deal.Account?.Name ?? string.Empty,
            ContactRef = deal.Contact?.ContactRef ?? string.Empty,
            ContactName = deal.Contact is null
                ? string.Empty
                : $"{deal.Contact.FirstName} {deal.Contact.LastName}",
            ContactStatus = deal.Contact is null
                ? string.Empty
                : ContactMapper.ToWireStatus(deal.Contact.Status),
            CreatedAt = deal.CreatedAt,
            UpdatedAt = deal.UpdatedAt
        };
    }

    public IReadOnlyList<DealResponse> ToResponses(IEnumerable<Deal> deals) =>
        deals.Select(ToResponse).ToList();

    public PageResponse<DealResponse> ToPageResponse(PagedResult<Deal> found, int page, int size)
    {
        return new PageResponse<DealResponse>
        {
            Items = ToResponses(found.Items),
            Page = page,
            Size = size,
            TotalElements = found.TotalElements,
            TotalPages = size <= 0 ? 0 : (int)Math.Ceiling(found.TotalElements / (double)size)
        };
    }

    public DealSummaryResponse ToSummaryResponse(DealSummary summary)
    {
        return new DealSummaryResponse
        {
            Stages = summary.Stages
                .Select(s => new DealStageTotalResponse
                {
                    Stage = DealStageRules.Wire(s.Stage),
                    Count = s.Count,
                    TotalValue = s.TotalValue
                })
                .ToList(),
            OpenCount = summary.OpenCount,
            OpenValue = summary.OpenValue
        };
    }

    public DealHistoryResponse ToHistoryResponse(DealStageChange change)
    {
        return new DealHistoryResponse
        {
            FromStage = change.FromStage is null ? null : DealStageRules.Wire(change.FromStage.Value),
            ToStage = DealStageRules.Wire(change.ToStage),
            ChangedAt = change.ChangedAt
        };
    }

    public IReadOnlyList<DealHistoryResponse> ToHistoryResponses(
        IEnumerable<DealStageChange> changes) =>
        changes.Select(ToHistoryResponse).ToList();
}
