namespace NimbusSales.Crm.Domain;

/// <summary>
/// One move of one deal. There is no "moved by": the application has no authentication,
/// so it cannot know who is calling.
/// </summary>
public class DealStageChange
{
    private DealStageChange() { }

    public DealStageChange(long dealId, DealStage? fromStage, DealStage toStage,
                           DateTimeOffset changedAt)
    {
        DealId = dealId;
        FromStage = fromStage;
        ToStage = toStage;
        ChangedAt = changedAt;
    }

    public long Id { get; private set; }

    public long DealId { get; set; }

    public Deal? Deal { get; set; }

    /// <summary>Null for the first row of a deal: it was created, not moved.</summary>
    public DealStage? FromStage { get; private set; }

    public DealStage ToStage { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }
}
