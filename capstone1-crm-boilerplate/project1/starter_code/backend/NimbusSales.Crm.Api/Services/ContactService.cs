using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

public class ContactService : IContactService
{
    private readonly IContactRepository _contacts;
    private readonly IAccountRepository _accounts;
    private readonly CrmAuditLogger _audit;

    public ContactService(IContactRepository contacts,
                          IAccountRepository accounts,
                          CrmAuditLogger audit)
    {
        _contacts = contacts;
        _accounts = accounts;
        _audit = audit;
    }

    /// <summary>
    /// One page of contacts, in surname order, optionally filtered by status.
    ///
    /// <para>The contact list screen shows twenty at a time.</para>
    /// </summary>
    public async Task<PagedResult<Contact>> ListAsync(int page, int size, ContactStatus? status,
                                                      CancellationToken ct = default)
    {
        var found = await _contacts.ListAsync(page, size, status, ct);

        // Surname first, then forename, the way the screen expects to display them.
        var ordered = found.Items
            .OrderBy(c => c.LastName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(c => c.FirstName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        _audit.Listed("contact", ordered.Count);
        return new PagedResult<Contact>(ordered, found.TotalElements);
    }

    public async Task<IReadOnlyList<Contact>> SearchAsync(string q, CancellationToken ct = default)
    {
        var results = await _contacts.SearchAsync(q, ct);
        _audit.Listed("contact", results.Count);
        return results;
    }

    public async Task<Contact> GetByRefAsync(string contactRef, CancellationToken ct = default)
    {
        var contact = await _contacts.FindByRefAsync(contactRef, ct)
            ?? throw new ContactNotFoundException(contactRef);
        _audit.Viewed("contact", contactRef);
        return contact;
    }

    public async Task<IReadOnlyList<Contact>> ListForAccountAsync(
        string accountRef, CancellationToken ct = default)
    {
        var account = await _accounts.FindByRefAsync(accountRef, ct)
            ?? throw new AccountNotFoundException(accountRef);

        var contacts = await _contacts.ListByAccountAsync(account.Id, ct);
        _audit.Listed("contact", contacts.Count);
        return contacts;
    }

    public async Task<Contact> UpdateAsync(string contactRef, string firstName, string lastName,
                                           string email, string? phone, string? jobTitle,
                                           ContactStatus? status, CancellationToken ct = default)
    {
        var contact = await _contacts.FindByRefAsync(contactRef, ct)
            ?? throw new ContactNotFoundException(contactRef);

        contact.FirstName = firstName;
        contact.LastName = lastName;
        contact.Email = email;
        contact.Phone = phone;
        contact.JobTitle = jobTitle;
        if (status is not null)
        {
            contact.Status = status.Value;
        }

        await _contacts.SaveChangesAsync(ct);
        _audit.Updated("contact", contactRef);
        return contact;
    }
}
