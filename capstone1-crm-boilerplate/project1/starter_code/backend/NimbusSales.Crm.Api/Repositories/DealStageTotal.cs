using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

/// <summary>How many deals sit in a stage, and what they are worth together.</summary>
public record DealStageTotal(DealStage Stage, int Count, decimal TotalValue);
