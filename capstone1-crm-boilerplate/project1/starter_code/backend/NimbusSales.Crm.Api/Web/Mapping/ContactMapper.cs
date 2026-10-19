using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;
using NimbusSales.Crm.Web.Dto;

namespace NimbusSales.Crm.Web.Mapping;

/// <summary>
/// Hand-written on purpose. The team looked at the mapping libraries and decided that
/// being able to read exactly which fields cross the boundary was worth more than the
/// generated code.
/// </summary>
public class ContactMapper
{
    public ContactSummaryResponse ToSummary(Contact contact)
    {
        return new ContactSummaryResponse
        {
            ContactRef = contact.ContactRef,
            FirstName = contact.FirstName,
            LastName = contact.LastName,
            Email = contact.Email,
            Phone = contact.Phone,
            JobTitle = contact.JobTitle,
            Status = ToWireStatus(contact.Status),
            AccountRef = contact.Account?.AccountRef,
            AccountName = contact.Account?.Name
        };
    }

    public IReadOnlyList<ContactSummaryResponse> ToSummaries(IEnumerable<Contact> contacts) =>
        contacts.Select(ToSummary).ToList();

    public PageResponse<ContactSummaryResponse> ToPageResponse(
        PagedResult<Contact> found, int page, int size)
    {
        return new PageResponse<ContactSummaryResponse>
        {
            Items = ToSummaries(found.Items),
            Page = page,
            Size = size,
            TotalElements = found.TotalElements,
            TotalPages = size <= 0 ? 0 : (int)Math.Ceiling(found.TotalElements / (double)size)
        };
    }

    /// <summary>
    /// The wire format is the screaming-snake name the front end already switches on,
    /// not the C# casing.
    /// </summary>
    public static string ToWireStatus(ContactStatus status) => status switch
    {
        ContactStatus.Prospect => "PROSPECT",
        ContactStatus.Customer => "CUSTOMER",
        ContactStatus.Churned => "CHURNED",
        _ => status.ToString().ToUpperInvariant()
    };
}
