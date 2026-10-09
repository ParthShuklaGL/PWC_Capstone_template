namespace NimbusCrm.Domain.Enums;

/// <summary>Where a deal is in the pipeline. Won and Lost are the two closed stages.</summary>
public enum DealStage
{
    Prospecting,
    Qualified,
    Proposal,
    Negotiation,
    Won,
    Lost,
}
