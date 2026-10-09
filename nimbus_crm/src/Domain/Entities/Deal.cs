using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Domain.Entities;

/// <summary>An opportunity, driven by one contact. Amounts are in GBP.</summary>
public class Deal
{
    public long Id { get; set; }

    public long ContactId { get; set; }

    public Contact? Contact { get; set; }

    public required string Title { get; set; }

    public decimal Value { get; set; }

    public DateOnly ExpectedCloseDate { get; set; }

    public DealStage Stage { get; set; } = DealStage.Prospecting;

    /// <summary>The day the deal was closed. Set when it is Won or Lost.</summary>
    public DateOnly? ClosedDate { get; set; }

    /// <summary>Why it was lost. Only set when the deal is Lost.</summary>
    public string? LostReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
