using FluentValidation;

namespace NimbusCrm.Application.Crm;

/// <summary>One page of a list, with the total so a screen can draw its pager.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int Size, int Total);

public static class PagingRules
{
    /// <summary>Capped so Page * Size cannot overflow an int and turn into a negative Skip.</summary>
    public static IRuleBuilderOptions<T, int> ValidPage<T>(this IRuleBuilder<T, int> rule) => rule.InclusiveBetween(0, 10_000);

    public static IRuleBuilderOptions<T, int> ValidSize<T>(this IRuleBuilder<T, int> rule) => rule.InclusiveBetween(1, 100);
}
