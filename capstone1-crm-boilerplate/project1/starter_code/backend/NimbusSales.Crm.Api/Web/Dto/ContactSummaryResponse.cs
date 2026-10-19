namespace NimbusSales.Crm.Web.Dto;

/// <summary>
/// What the contact list shows for each row.
///
/// <para>A plain mutable class rather than a record: the team wanted the response shape
/// to be obvious at a glance, and records make the JSON contract harder to read for
/// people who are not fluent in them.</para>
/// </summary>
public class ContactSummaryResponse
{
    public string ContactRef { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string? JobTitle { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? AccountRef { get; set; }

    public string? AccountName { get; set; }
}
