using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

/// <summary>
/// What the pipeline is worth. Every stage is present, with zeros where it is empty, so
/// the board always has a column for it. The open figures leave out Won and Lost.
/// </summary>
public record DealSummary(IReadOnlyList<DealStageTotal> Stages)
{
    public int OpenCount => Stages.Where(s => DealStageRules.IsOpen(s.Stage)).Sum(s => s.Count);

    public decimal OpenValue =>
        Stages.Where(s => DealStageRules.IsOpen(s.Stage)).Sum(s => s.TotalValue);
}
