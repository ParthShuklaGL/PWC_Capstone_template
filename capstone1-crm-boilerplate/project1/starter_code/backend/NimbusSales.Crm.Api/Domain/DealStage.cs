namespace NimbusSales.Crm.Domain;

/// <summary>
/// Where a deal is in the pipeline. The numeric order is the order of the pipeline, and
/// <see cref="DealStageRules"/> relies on it.
/// </summary>
public enum DealStage
{
    Prospecting = 0,
    Qualified = 1,
    Proposal = 2,
    Negotiation = 3,

    /// <summary>Final. The customer signed.</summary>
    Won = 4,

    /// <summary>Final. The deal is dead.</summary>
    Lost = 5
}
