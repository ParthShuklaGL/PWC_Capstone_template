namespace NimbusCrm.Domain.Entities;

/// <summary>A company we sell to.</summary>
public class Account
{
    public long Id { get; set; }

    public required string Name { get; set; }

    public string? Industry { get; set; }

    public string? Country { get; set; }

    public string? Website { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Contact> Contacts { get; } = [];
}
