namespace NimbusSales.Crm.Web.Dto;

/// <summary>
/// One move of a deal. There is no "who": the application has no authentication, so it
/// cannot say who moved it.
/// </summary>
public class DealHistoryResponse
{
    /// <summary>Null on the first row: the deal was created, not moved.</summary>
    public string? FromStage { get; set; }

    public string ToStage { get; set; } = string.Empty;

    public DateTimeOffset ChangedAt { get; set; }
}
