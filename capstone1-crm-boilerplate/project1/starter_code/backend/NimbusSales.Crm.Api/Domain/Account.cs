namespace NimbusSales.Crm.Domain;

/// <summary>A company Nimbus sells to.</summary>
public class Account
{
    private Account() { }

    public Account(string accountRef, string name, string? industry, string? country,
                   string? website)
    {
        AccountRef = accountRef;
        Name = name;
        Industry = industry;
        Country = country;
        Website = website;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public long Id { get; private set; }

    public string AccountRef { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    public string? Industry { get; private set; }

    public string? Country { get; private set; }

    public string? Website { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
