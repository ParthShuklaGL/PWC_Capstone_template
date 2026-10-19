namespace NimbusSales.Crm.Domain;

/// <summary>A person at an <see cref="Domain.Account"/>.</summary>
public class Contact
{
    private Contact() { }

    public Contact(string contactRef, long accountId, string firstName, string lastName,
                   string email)
    {
        ContactRef = contactRef;
        AccountId = accountId;
        FirstName = firstName;
        LastName = lastName;
        Email = email;
        Status = ContactStatus.Prospect;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public long Id { get; private set; }

    public string ContactRef { get; private set; } = string.Empty;

    public long AccountId { get; set; }

    public Account? Account { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string? JobTitle { get; set; }

    public ContactStatus Status { get; set; }

    /// <summary>
    /// Internal only. Finance write this during onboarding.
    ///
    /// <para>It is not for the customer, and it is not for anyone outside Nimbus. It is
    /// held here so that it moves with the record, not so that it is read.</para>
    /// </summary>
    public string? CreditRiskNote { get; set; }

    public DateTimeOffset? LastContactedAt { get; set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
