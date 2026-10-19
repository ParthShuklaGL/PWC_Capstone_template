namespace NimbusSales.Crm.Domain;

/// <summary>
/// Something Inside Sales is trying to sell to an <see cref="Domain.Account"/>, driven by
/// one <see cref="Domain.Contact"/> there. Amounts are GBP.
/// </summary>
public class Deal
{
    private Deal() { }

    public Deal(string dealRef, long accountId, long contactId, string title, decimal value,
                DateOnly expectedCloseDate)
    {
        DealRef = dealRef;
        AccountId = accountId;
        ContactId = contactId;
        Title = title;
        Value = value;
        ExpectedCloseDate = expectedCloseDate;
        Stage = DealStage.Prospecting;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public long Id { get; private set; }

    public string DealRef { get; private set; } = string.Empty;

    public long AccountId { get; set; }

    public Account? Account { get; set; }

    public long ContactId { get; set; }

    public Contact? Contact { get; set; }

    public string Title { get; set; } = string.Empty;

    public decimal Value { get; set; }

    public DateOnly ExpectedCloseDate { get; set; }

    public DealStage Stage { get; set; }

    /// <summary>The day the deal was closed. Set when it is Won, and when it is Lost.</summary>
    public DateOnly? ClosedDate { get; set; }

    /// <summary>Why it was lost. Only set when the deal is Lost.</summary>
    public string? LostReason { get; set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
