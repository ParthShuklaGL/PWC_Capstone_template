namespace NimbusSales.Crm.Web.Dto;

public class DealSummaryResponse
{
    public IReadOnlyList<DealStageTotalResponse> Stages { get; set; } =
        Array.Empty<DealStageTotalResponse>();

    /// <summary>Deals that are not Won and not Lost.</summary>
    public int OpenCount { get; set; }

    /// <summary>What the open deals are worth together, in GBP.</summary>
    public decimal OpenValue { get; set; }

    public string Currency { get; set; } = "GBP";
}

public class DealStageTotalResponse
{
    public string Stage { get; set; } = string.Empty;

    public int Count { get; set; }

    public decimal TotalValue { get; set; }
}
