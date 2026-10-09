using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Domain.Entities;

/// <summary>A person at an account.</summary>
public class Contact
{
    public long Id { get; set; }

    public long AccountId { get; set; }

    public Account? Account { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public required string Email { get; set; }

    public string? Phone { get; set; }

    public string? JobTitle { get; set; }

    public ContactStatus Status { get; set; } = ContactStatus.Prospect;

    public DateTime? LastContactedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Deal> Deals { get; } = [];

    public List<Activity> Activities { get; } = [];
}
