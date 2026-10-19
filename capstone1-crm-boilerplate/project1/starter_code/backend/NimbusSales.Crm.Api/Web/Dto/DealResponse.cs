namespace NimbusSales.Crm.Web.Dto;

public class DealResponse
{
    public string DealRef { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    /// <summary>GBP.</summary>
    public decimal Value { get; set; }

    public string Currency { get; set; } = "GBP";

    public DateOnly ExpectedCloseDate { get; set; }

    public string Stage { get; set; } = string.Empty;

    public DateOnly? ClosedDate { get; set; }

    public string? LostReason { get; set; }

    public string AccountRef { get; set; } = string.Empty;

    public string AccountName { get; set; } = string.Empty;

    public string ContactRef { get; set; } = string.Empty;

    public string ContactName { get; set; } = string.Empty;

    /// <summary>PROSPECT, CUSTOMER or CHURNED, as it is right now.</summary>
    public string ContactStatus { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
