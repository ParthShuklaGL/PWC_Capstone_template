namespace NimbusSales.Crm.Web.Dto;

public class ActivityResponse
{
    public long Id { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public DateTimeOffset OccurredAt { get; set; }
}
