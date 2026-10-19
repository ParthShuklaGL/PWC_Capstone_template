namespace NimbusSales.Crm.Domain;

/// <summary>
/// The rules for moving a deal between stages. Pure functions, no database, so they can
/// be tested on their own.
///
/// <para>Prospecting, Qualified, Proposal and Negotiation are the open stages. A deal
/// moves forward one stage at a time and back one stage at a time. It can be Lost from
/// any open stage, and Won only from Negotiation. Won and Lost are final.</para>
/// </summary>
public static class DealStageRules
{
    public static bool IsOpen(DealStage stage) => stage is not (DealStage.Won or DealStage.Lost);

    public static bool IsFinal(DealStage stage) => !IsOpen(stage);

    /// <summary>The name the API puts on the wire: PROSPECTING, QUALIFIED, ...</summary>
    public static string Wire(DealStage stage) => stage.ToString().ToUpperInvariant();

    /// <summary>
    /// Parses a wire name. Numbers are refused on purpose: <c>Enum.TryParse</c> would
    /// happily accept "3" as Negotiation.
    /// </summary>
    public static bool TryParse(string? value, out DealStage stage)
    {
        stage = default;
        if (string.IsNullOrWhiteSpace(value) || value.Any(char.IsDigit))
        {
            return false;
        }

        return Enum.TryParse(value.Trim(), ignoreCase: true, out stage)
               && Enum.IsDefined(stage);
    }

    /// <summary>Why this move is not allowed, or null when it is.</summary>
    public static string? Refusal(DealStage from, DealStage to)
    {
        if (from == to)
        {
            return $"The deal is already in {Wire(from)}.";
        }

        if (IsFinal(from))
        {
            return $"A {Wire(from)} deal is closed and cannot be moved.";
        }

        if (to == DealStage.Lost)
        {
            return null;
        }

        if (to == DealStage.Won)
        {
            return from == DealStage.Negotiation
                ? null
                : "A deal can only be won from NEGOTIATION.";
        }

        var step = (int)to - (int)from;
        if (step is 1 or -1)
        {
            return null;
        }

        return step > 1
            ? "A deal moves forward one stage at a time."
            : "A deal can only move back one stage at a time.";
    }

    public static bool CanMove(DealStage from, DealStage to) => Refusal(from, to) is null;
}
