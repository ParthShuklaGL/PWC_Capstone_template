namespace NimbusSales.Crm.Web.Dto;

/// <summary>
/// A page of results.
///
/// <para>Deliberately not the repository's <c>PagedResult</c>: that is an internal shape,
/// and the API contract should not move when it does.</para>
/// </summary>
public class PageResponse<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();

    public int Page { get; set; }

    public int Size { get; set; }

    public long TotalElements { get; set; }

    public int TotalPages { get; set; }
}
