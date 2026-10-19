namespace NimbusSales.Crm.Repositories;

/// <summary>
/// One page of rows, plus how many there are altogether.
///
/// <para>An internal shape. The API contract is <c>Web.Dto.PageResponse</c>, so that the
/// JSON does not move when this does.</para>
/// </summary>
public class PagedResult<T>
{
    public PagedResult(IReadOnlyList<T> items, long totalElements)
    {
        Items = items;
        TotalElements = totalElements;
    }

    public IReadOnlyList<T> Items { get; }

    public long TotalElements { get; }
}
